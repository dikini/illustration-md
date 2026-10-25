import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { ROOT, packageRoot } from './runtime.mjs';
import { fontDirectory, fontconfigXml } from './font-paths.mjs';

const execute = promisify(execFile);
const browserArguments = ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'];

async function pinnedFonts(directory, families) {
  const css = await Promise.all(Object.entries(families).flatMap(([family, faces]) => faces.map(async ([filename, style, weight]) => {
    const bytes = await readFile(join(directory, filename));
    const format = filename.endsWith('.otf') ? 'opentype' : 'truetype';
    return `@font-face{font-family:"${family}";font-style:${style};font-weight:${weight};src:url(data:font/${format};base64,${bytes.toString('base64')}) format("${format}")}`;
  })));
  return css.join('\n');
}

async function mermaidSvg(diagram, job, temporary) {
  const decoded = diagram.source.replace(/\\(["'\\])/g, '$1')
    .replace(/\\([0-9a-f]{1,6})\s?|\\([^\r\n])/gi, (_, hex, character) => character ?? String.fromCodePoint(Number.parseInt(hex, 16)));
  if (/\bimg\s*:|<\s*img\b/i.test(decoded)) throw new Error('External diagram resources and Mermaid image nodes are not supported.');
  if (/@import\b/i.test(decoded)) throw new Error('External CSS resources are not supported in diagram notation.');
  for (const match of decoded.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    if (!match[2].trim().startsWith('#')) throw new Error('External CSS resources are not supported in diagram notation.');
  }
  const { themeCSS, ...mermaid } = job.style.kinds.mermaid;
  const input = join(temporary, `${diagram.id}.mmd`);
  const output = join(temporary, `${diagram.id}.svg`);
  const configuration = join(temporary, `${diagram.id}-mermaid.json`);
  const puppeteer = join(temporary, 'puppeteer.json');
  const source = themeCSS ? `%%{init: {"themeCSS": ${JSON.stringify(themeCSS)}}}%%\n${diagram.source}` : diagram.source;
  await writeFile(input, source);
  await writeFile(configuration, JSON.stringify({
    securityLevel: 'strict', htmlLabels: false,
    deterministicIds: true, deterministicIDSeed: diagram.id,
    flowchart: { htmlLabels: false }, ...mermaid
  }));
  await writeFile(puppeteer, JSON.stringify({ executablePath: job.browser, args: browserArguments }));
  await execute(job.mermaid, ['-i', input, '-o', output, '-c', configuration, '-p', puppeteer, '-b', 'transparent', '--no-font-embed'], {
    timeout: 60000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, FONTCONFIG_FILE: job.fontconfig }
  });
  return readFile(output, 'utf8');
}

async function accessibleSvg(source, diagram, page, displaySize) {
  return page.evaluate(({ source, diagram, displaySize }) => {
    const xml = new DOMParser().parseFromString(source, 'image/svg+xml');
    const svg = xml.documentElement;
    if (svg.localName !== 'svg' || xml.querySelector('parsererror')) throw new Error('Renderer returned invalid SVG.');
    if (svg.querySelector('foreignObject,script')) throw new Error('Diagram SVG requires HTML or a script.');
    const validateCss = (css) => {
      const decoded = css.replace(/\\([0-9a-f]{1,6})\s?|\\([^\r\n])/gi,
        (_, hex, character) => character ?? String.fromCodePoint(Number.parseInt(hex, 16)));
      if (/@import\b/i.test(decoded)) throw new Error('SVG contains an external CSS import.');
      for (const match of decoded.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
        if (!match[2].trim().startsWith('#')) throw new Error('SVG contains an external CSS resource.');
      }
    };
    for (const node of [svg, ...svg.querySelectorAll('*')]) {
      for (const attribute of node.attributes) {
        if (attribute.localName === 'href' && !attribute.value.trim().startsWith('#')) {
          throw new Error('SVG contains an external href resource.');
        }
        if (attribute.localName === 'style' || /url\(/i.test(attribute.value)) validateCss(attribute.value);
      }
      if (node.localName === 'style') validateCss(node.textContent);
    }
    if (!svg.hasAttribute('viewBox')) throw new Error('Diagram SVG has no intrinsic viewBox.');
    const dimensions = svg.getAttribute('viewBox').trim().split(/[ ,]+/).map(Number);
    if (dimensions.length !== 4 || dimensions.some((value) => !Number.isFinite(value)) || dimensions[2] <= 0 || dimensions[3] <= 0) {
      throw new Error('Diagram SVG has invalid dimensions.');
    }
    svg.setAttribute('width', String(displaySize?.width ?? dimensions[2]));
    svg.setAttribute('height', String(displaySize?.height ?? dimensions[3]));
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-labelledby', `${diagram.id}-title ${diagram.id}-description`);
    for (const node of svg.querySelectorAll(':scope > title,:scope > desc')) node.remove();
    const title = xml.createElementNS(svg.namespaceURI, 'title');
    title.id = `${diagram.id}-title`;
    title.textContent = diagram.id.replaceAll('-', ' ');
    const description = xml.createElementNS(svg.namespaceURI, 'desc');
    description.id = `${diagram.id}-description`;
    description.textContent = `${diagram.description}\n\nSource (${diagram.kind}):\n${diagram.source}`;
    svg.prepend(title, description);
    return new XMLSerializer().serializeToString(svg);
  }, { source, diagram, displaySize });
}

async function outlineSvg(source, diagram, job, page, temporary) {
  const family = diagram.kind === 'ebnf' || diagram.kind === 'split' ? job.style.fonts.monospace : job.style.fonts.serif;
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${job.fontCss}body{margin:0}svg{display:block;max-width:none!important}svg text,svg tspan{font-family:"${family}"!important}</style></head><body>${source}</body></html>`);
  const displaySize = await page.evaluate(async () => {
    await Promise.all([...document.fonts].map((font) => font.load()));
    await document.fonts.ready;
    const svg = document.querySelector('svg');
    const dimensions = svg.getAttribute('viewBox').trim().split(/[ ,]+/).map(Number);
    svg.style.width = `${dimensions[2]}px`;
    svg.style.height = `${dimensions[3]}px`;
    return { width: dimensions[2], height: dimensions[3],
      labels: [...svg.querySelectorAll('text')].map(node => node.textContent).join('\n') };
  });
  execFileSync(process.env.ILLUSTRATION_PYTHON || 'python3',
    ['-m', 'illustration_md.outline', '--font', 'regular', '--check-text'],
    { cwd: fileURLToPath(ROOT), input: displaySize.labels, encoding: 'utf8' });
  await page.emulateMediaType('screen');
  const pdf = join(temporary, `${diagram.id}.pdf`);
  const svg = join(temporary, `${diagram.id}-outlined.svg`);
  await page.pdf({ path: pdf, width: `${displaySize.width}px`, height: `${displaySize.height}px`,
    printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await execute(job.pdftocairo, ['-svg', '-f', '1', '-l', '1', pdf, svg], { timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
  return accessibleSvg(await readFile(svg, 'utf8'), diagram, page, displaySize);
}


export async function renderSequence(runtime, construction, metadata, temporary) {
  assert.equal(construction.appearance.font, 'regular', 'Sequence adapter supports regular lettering only.');
  assert.equal(construction.appearance.stroke, 'crisp', 'Sequence adapter does not support rough filtering.');
  assert.ok(construction.source.trimStart().startsWith('sequenceDiagram'), 'Sequence diagrams only.');
  const cliRoot = packageRoot('@mermaid-js/mermaid-cli');
  const mermaidRoot = packageRoot('mermaid');
  const cli = JSON.parse(await readFile(join(cliRoot, 'package.json')));
  const mermaid = JSON.parse(await readFile(join(mermaidRoot, 'package.json')));
  assert.equal(cli.version, runtime.configuration.mermaidCLI);
  assert.equal(mermaid.version, runtime.configuration.mermaid);
  const poppler = await execute('pdftocairo', ['-v']);
  assert.ok((poppler.stderr + poppler.stdout).includes(runtime.configuration.pdftocairo));
  const fonts = fontDirectory(ROOT);
  const family = 'IBM Plex Mono';
  const job = {
    mermaid: join(cliRoot, 'src/cli.js'),
    browser: process.env.ILLUSTRATION_BROWSER,
    pdftocairo: 'pdftocairo',
    style: { fonts: { serif: family, monospace: family },
      kinds: { mermaid: { theme: 'neutral', fontFamily: family, look: 'classic' } } },
    fontconfig: join(temporary, 'fonts.conf')
  };
  job.fontCss = await pinnedFonts(fonts, { [family]: [['IBMPlexMono-Regular.ttf', 'normal', 400]] });
  await writeFile(job.fontconfig, fontconfigXml(fonts, join(temporary, 'font-cache')));
  const diagram = { ...metadata, kind: 'mermaid', source: construction.source };
  const source = await mermaidSvg(diagram, job, temporary);
  return { svg: await outlineSvg(await accessibleSvg(source, diagram, runtime.page), diagram, job, runtime.page, temporary),
    dependencies: { mermaid: mermaid.version, mermaidCLI: cli.version, pdftocairo: runtime.configuration.pdftocairo } };
}
