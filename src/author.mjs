import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { ROOT, createRuntime, hash } from './runtime.mjs';
import { resolveAppearance } from './settings.mjs';
import { transformSvg } from './filters/shapes.mjs';
import { transformTree } from './filters/tree.mjs';
import { constructTree } from './split.mjs';
import { renderSequence } from './mermaid.mjs';

const root = fileURLToPath(ROOT);
const python = () => process.env.ILLUSTRATION_PYTHON || 'python3';

function validate(svg) {
  execFileSync(python(), ['-c', 'import sys; from illustration_md.prepare import validate_svg; validate_svg(sys.stdin.buffer.read(), "authored SVG")'],
    { cwd: root, input: svg, encoding: 'utf8' });
}

function outline(svg, font) {
  return execFileSync(python(), ['-m', 'illustration_md.outline', '--font', font],
    { cwd: root, input: svg, encoding: 'utf8' }).trim();
}

async function documentDefaults(document) {
  if (!document) return {};
  const parsed = JSON.parse(execFileSync(process.env.PANDOC_BIN || 'pandoc',
    ['--from', 'markdown', '--to', 'json', document], { encoding: 'utf8' }));
  const defaults = parsed.meta['illustration-defaults'];
  if (!defaults) return {};
  assert.equal(defaults.t, 'MetaMap');
  return Object.fromEntries(Object.entries(defaults.c).map(([key, value]) => {
    if (value.t === 'MetaInlines') return [key, value.c.map(token => token.c || ' ').join('')];
    assert.equal(value.t, 'MetaString');
    return [key, value.c];
  }).map(([key, value]) => [key, ['roughness', 'bowing', 'seed'].includes(key) ? Number(value) : value]));
}

export async function rebuild(statePath, options = {}) {
  const filename = resolve(statePath);
  const originalState = await readFile(filename);
  const state = JSON.parse(originalState);
  assert.equal(state.version, 1);
  assert.equal(state.svg, 'figure.svg', 'The authoring CLI publishes figure.svg beside its state.');
  assert.match(state.figure.id, /^fig-[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(state.figure.caption && state.figure.description);
  const style = JSON.parse(await readFile(options.style || new URL('style.json', ROOT)));
  const construction = state.construction;
  construction.appearance = options.adoptDefaults
    ? resolveAppearance(style.appearance, await documentDefaults(options.document), options.override || {})
    : resolveAppearance(construction.appearance);
  const temporary = await mkdtemp(join(dirname(filename), '.author-'));
  let runtime;
  let dependencies = {};
  try {
    runtime = await createRuntime();
    let draw;
    if (construction.kind === 'custom-svg') {
      const target = resolve(dirname(filename), construction.source);
      assert.ok(!isAbsolute(construction.source) && !relative(dirname(filename), target).startsWith('..'));
      const source = outline(await readFile(target, 'utf8'), construction.appearance.font);
      validate(source);
      const parameters = { source, figure: { id: state.figure.id, roles: construction.roles },
        profile: construction.appearance };
      draw = async () => (await runtime.page.evaluate(transformSvg, parameters)).svg;
      dependencies.sourceSha256 = hash(await readFile(target));
    } else if (construction.kind === 'split-tree') {
      const tree = await constructTree(construction.source, state.figure, style.split, temporary);
      draw = async () => (await runtime.page.evaluate(transformTree,
        { ...tree, profile: construction.appearance })).svg;
      dependencies = tree.dependencies;
    } else if (construction.kind === 'mermaid-sequence') {
      draw = async () => {
        const rendered = await renderSequence(runtime, construction, state.figure, temporary);
        dependencies = rendered.dependencies;
        return rendered.svg;
      };
    } else throw new Error(`Unsupported construction: ${construction.kind}`);
    const svg = `${await draw()}\n`;
    assert.equal(`${await draw()}\n`, svg, 'Repeated authoring must agree byte-for-byte.');
    validate(svg);
    const stateArgument = relative(root, filename);
    const quotedState = `'${stateArgument.replaceAll("'", "'\\''")}'`;
    state.renderer = { command: `node src/author.mjs --state ${quotedState}`,
      argv: ['node', 'src/author.mjs', '--state', stateArgument],
      dependencies: { ...dependencies, browser: await runtime.browser.version(),
        roughjs: runtime.configuration.roughjs, roughBundleSha256: runtime.bundleSha256,
        packageLockSha256: hash(await readFile(new URL('package-lock.json', ROOT))),
        fonts: runtime.configuration.fonts } };
    state.provenance = { ...state.provenance, svgSha256: hash(svg) };
    const pendingSvg = join(temporary, 'figure.svg');
    const pendingState = join(temporary, 'illustration.json');
    await writeFile(pendingSvg, svg);
    await writeFile(pendingState, JSON.stringify(state, null, 2) + '\n');
    await rename(pendingSvg, join(dirname(filename), 'figure.svg'));
    await rename(pendingState, filename);
    return state;
  } finally {
    await runtime?.browser.close();
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const { values } = parseArgs({ options: {
      state: { type: 'string' }, style: { type: 'string' }, document: { type: 'string' },
      'adopt-defaults': { type: 'boolean' }, override: { type: 'string' }
    } });
    if (!values.state) throw new Error('usage: node src/author.mjs --state path/to/illustration.json');
    if ((values.document || values.override) && !values['adopt-defaults']) {
      throw new Error('Document/default overrides require --adopt-defaults.');
    }
    const state = await rebuild(values.state, { style: values.style, document: values.document,
      adoptDefaults: values['adopt-defaults'], override: values.override ? JSON.parse(values.override) : undefined });
    console.log(`Authored ${state.figure.id}: ${state.provenance.svgSha256}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
