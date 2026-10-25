import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, hash } from './runtime.mjs';

export async function constructTree(source, metadata, style, output) {
  const directory = process.env.SPLIT_MD_ROOT;
  if (!directory) throw new Error('Set SPLIT_MD_ROOT to the declared split-md checkout.');
  const configuration = JSON.parse(await readFile(new URL('toolchain.json', ROOT)));
  const commit = execFileSync('git', ['-C', directory, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.equal(commit, configuration.splitCommit, 'Use the exact declared split-md pin.');
  const modules = resolve(output, 'split-source');
  await mkdir(modules, { recursive: true });
  await writeFile(join(modules, 'package.json'), '{"type":"module"}\n');
  const hashes = {};
  for (const name of ['index.js', 'parse.js', 'layout.js', 'style.js', 'svg.js']) {
    const path = `packages/core/src/${name}`;
    const bytes = await readFile(join(directory, path));
    assert.deepEqual(bytes, execFileSync('git', ['-C', directory, 'show', `${commit}:${path}`]));
    hashes[path] = hash(bytes);
    assert.equal(hashes[path], configuration.splitSources[path]);
    await writeFile(join(modules, name), bytes);
  }
  const { parse } = await import(pathToFileURL(join(modules, 'parse.js')));
  const { layout } = await import(pathToFileURL(join(modules, 'layout.js')));
  const { serialize } = await import(pathToFileURL(join(modules, 'svg.js')));
  const { mergeStyle } = await import(pathToFileURL(join(modules, 'style.js')));
  const parsed = parse(source);
  assert.deepEqual(parsed.diagnostics, []);
  const scene = layout(parsed.figure, mergeStyle(style));
  scene.elements = [...scene.elements.filter(element => element.kind === 'edge'),
    ...scene.elements.filter(element => element.kind !== 'edge')];
  const svg = serialize(scene, { title: metadata.caption,
    description: metadata.description, idBase: metadata.id }, mergeStyle(style));
  return { scene, source: svg, id: metadata.id, dependencies: { splitCommit: commit, splitSources: hashes } };
}
