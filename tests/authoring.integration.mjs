import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { ROOT, createRuntime, hash } from '../src/runtime.mjs';
import { rebuild } from '../src/author.mjs';
import { constructTree } from '../src/split.mjs';
import { selectProfile } from '../src/profiles.mjs';
import { transformSvg } from '../src/filters/shapes.mjs';
import { transformTree } from '../src/filters/tree.mjs';

let temporary;
let runtime;
let custom;
let tree;
const root = fileURLToPath(ROOT);
const python = process.env.ILLUSTRATION_PYTHON || 'python3';

before(async () => {
  temporary = await mkdtemp(join(tmpdir(), 'illustration-md-test-'));
  runtime = await createRuntime();
  const state = JSON.parse(await readFile(new URL('examples/custom/assets/fig-add-inputs/illustration.json', ROOT)));
  const source = execFileSync(python, ['-m', 'illustration_md.outline', '--font', 'excalifont'],
    { cwd: root, input: await readFile(new URL('examples/custom/assets/fig-add-inputs/base.svg', ROOT)), encoding: 'utf8' }).trim();
  custom = { source, figure: { id: state.figure.id, roles: state.construction.roles } };
  const treeState = JSON.parse(await readFile(new URL('examples/tree/assets/fig-tree-repair/illustration.json', ROOT)));
  const style = JSON.parse(await readFile(new URL('style.json', ROOT)));
  tree = await constructTree(treeState.construction.source, treeState.figure, style.split, temporary);
});

after(async () => {
  await runtime?.browser.close();
  if (temporary) await rm(temporary, { recursive: true, force: true });
});

test('both bounded filters repeat exactly for crisp, mild, rough and custom profiles', async () => {
  for (const [transform, parameters] of [[transformSvg, custom], [transformTree, tree]]) {
    for (const profile of [selectProfile('crisp'), selectProfile('mild'), selectProfile('rough'), selectProfile('custom', 1.2)]) {
      const first = await runtime.page.evaluate(transform, { ...parameters, profile });
      assert.equal(first.svg, (await runtime.page.evaluate(transform, { ...parameters, profile })).svg);
      if (!profile.roughness) assert.equal(first.svg, parameters.source);
      else assert.notEqual(first.svg, (await runtime.page.evaluate(transform,
        { ...parameters, profile: { ...profile, seed: profile.seed + 1 } })).svg);
    }
  }
});

test('custom filtering preserves exact fills and outlined lettering', async () => {
  const rough = await runtime.page.evaluate(transformSvg, { ...custom, profile: selectProfile('rough') });
  const signatures = await runtime.page.evaluate(({ source, output }) => [source, output].map(svg => {
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
    return {
      fills: [...document.querySelectorAll('rect')].map(node => ['x', 'y', 'width', 'height', 'fill'].map(name => node.getAttribute(name))),
      labels: [...document.querySelectorAll('g[aria-label]')].map(node => new XMLSerializer().serializeToString(node)),
      text: document.querySelectorAll('text').length
    };
  }), { source: custom.source, output: rough.svg });
  assert.deepEqual(signatures[0], signatures[1]);
  assert.equal(signatures[0].text, 0);
});

test('tree filter preserves ordered fills and paints edges before nodes', async () => {
  const output = await runtime.page.evaluate(transformTree, { ...tree, profile: selectProfile('rough') });
  assert.deepEqual(output.counts, { triangle: 8, circle: 6, edge: 12, downArrow: 1 });
  const signatures = await runtime.page.evaluate(({ source, output }) => [source, output].map(svg => {
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
    return [...document.querySelectorAll('path,circle')]
      .filter(node => node.getAttribute('fill') && node.getAttribute('fill') !== 'none')
      .map(node => ['d', 'cx', 'cy', 'r', 'fill'].map(name => node.getAttribute(name)));
  }), { source: tree.source, output: output.svg });
  assert.deepEqual(signatures[0], signatures[1]);
  assert.ok(tree.scene.elements.findIndex(element => element.kind === 'edge')
    < tree.scene.elements.findIndex(element => element.kind === 'circle'));
});

test('filters reject unsupported geometry instead of pretending to roughen arbitrary SVG', async () => {
  await assert.rejects(runtime.page.evaluate(transformSvg, {
    source: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"><circle cx="25" cy="25" r="10"/></svg>',
    figure: { id: 'fig-circle', roles: [['circle', 'first']] }, profile: selectProfile('rough')
  }), /rect.*path/);
  await assert.rejects(runtime.page.evaluate(transformSvg,
    { ...custom, figure: { ...custom.figure, roles: [] }, profile: selectProfile('rough') }));
  const scene = { ...tree.scene, elements: [{ kind: 'text' }] };
  await assert.rejects(runtime.page.evaluate(transformTree,
    { ...tree, scene, profile: selectProfile('rough') }));
});

test('font coverage fails before a renderer can substitute a fallback glyph', () => {
  assert.throws(() => execFileSync(python, ['-m', 'illustration_md.outline', '--font', 'regular', '--check-text'],
    { cwd: root, input: 'Unsupported glyph: 🦄', encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }),
  error => error.stderr.includes('Missing glyph'));
});

test('all saved example SVGs reproduce from construction and keep their hashes', async () => {
  for (const [example, identifier] of [['custom', 'fig-add-inputs'], ['tree', 'fig-tree-repair'], ['sequence', 'fig-item-lookup'],
    ['swimlanes', 'fig-order-handoffs'], ['swimlanes', 'fig-support-escalation'],
    ['network', 'fig-web-service-network'], ['network', 'fig-office-network'],
    ['bpmn', 'fig-bpmn-order'], ['bpmn', 'fig-bpmn-support']]) {
    const source = join(root, 'examples', example, 'assets', identifier);
    const copy = join(temporary, `${identifier} ' & path`);
    await cp(source, copy, { recursive: true });
    const before = await readFile(join(copy, 'figure.svg'));
    const state = await rebuild(join(copy, 'illustration.json'));
    assert.equal(hash(await readFile(join(copy, 'figure.svg'))), hash(before));
    assert.equal(state.provenance.svgSha256, hash(before));
    assert.deepEqual(state.renderer.argv,
      ['node', 'src/author.mjs', '--state', relative(root, join(copy, 'illustration.json'))]);
    const parsedCommand = execFileSync('sh', ['-c',
      `set -- ${state.renderer.command}; printf '%s\\0' "$@"`], { encoding: 'utf8' }).split('\0').slice(0, -1);
    assert.deepEqual(parsedCommand, state.renderer.argv);
  }
});

test('an unsupported appearance fails without replacing accepted artwork or state', async () => {
  const copy = join(temporary, 'unsupported-sequence');
  await cp(join(root, 'examples/sequence/assets/fig-item-lookup'), copy, { recursive: true });
  const filename = join(copy, 'illustration.json');
  const state = JSON.parse(await readFile(filename));
  state.construction.appearance = { font: 'regular', stroke: 'rough', seed: 1729 };
  await writeFile(filename, JSON.stringify(state));
  const before = await readFile(filename);
  const svg = await readFile(join(copy, 'figure.svg'));
  await assert.rejects(rebuild(filename), /does not support rough/);
  assert.deepEqual(await readFile(filename), before);
  assert.deepEqual(await readFile(join(copy, 'figure.svg')), svg);
});

test('explicit adoption reads document defaults and request overrides, then saves them', async () => {
  const copy = join(temporary, 'default-adoption');
  await cp(join(root, 'examples/custom/assets/fig-add-inputs'), copy, { recursive: true });
  const filename = join(copy, 'illustration.json');
  const state = await rebuild(filename, { adoptDefaults: true,
    document: join(root, 'examples/custom/README.md'), override: { stroke: 'mild' } });
  assert.equal(state.construction.appearance.font, 'excalifont');
  assert.equal(state.construction.appearance.stroke, 'mild');
  assert.equal(state.construction.appearance.roughness, 0.6);
  const svg = await readFile(join(copy, 'figure.svg'));
  const rebuilt = await rebuild(filename);
  assert.deepEqual(rebuilt.construction.appearance, state.construction.appearance);
  assert.deepEqual(await readFile(join(copy, 'figure.svg')), svg);
});

test('BPMN sketch preserves exact event, gateway, message and sequence symbols and rounded task fills', async () => {
  const directory = new URL('examples/bpmn/assets/fig-bpmn-support/', ROOT);
  const source = await readFile(new URL('base.svg', directory), 'utf8');
  const sketch = await readFile(new URL('sketch.svg', directory), 'utf8');
  const result = await runtime.page.evaluate(({ source, sketch }) => {
    const parser = new DOMParser();
    const exact = parser.parseFromString(source, 'image/svg+xml');
    const output = parser.parseFromString(sketch, 'image/svg+xml');
    const serialize = node => new XMLSerializer().serializeToString(node);
    const protectedNodes = [...exact.querySelectorAll('[id]:not([data-sketch])')];
    const protectedMatch = protectedNodes.every(node =>
      serialize(node) === serialize(output.querySelector(`[id="${node.id}"]`)));
    const fills = [...exact.querySelectorAll('path[data-sketch][fill]')]
      .filter(node => node.getAttribute('fill') !== 'none');
    const fillsMatch = fills.every(node => {
      const saved = output.querySelector(`[id="${node.id}"]`);
      return ['d', 'fill'].every(name => node.getAttribute(name) === saved.getAttribute(name))
        && saved.getAttribute('stroke') === 'none';
    });
    const labels = document => [...document.querySelectorAll('text')].map(serialize);
    return { protectedCount: protectedNodes.length, protectedMatch, taskFillCount: fills.length,
      fillsMatch, labelsMatch: JSON.stringify(labels(exact)) === JSON.stringify(labels(output)),
      sketchContours: output.querySelectorAll('g[data-sketch-role] > g').length };
  }, { source, sketch });
  assert.ok(result.protectedCount > 20);
  assert.equal(result.protectedMatch, true);
  assert.equal(result.taskFillCount, 3);
  assert.equal(result.fillsMatch, true);
  assert.equal(result.labelsMatch, true);
  assert.ok(result.sketchContours >= 8);
});
