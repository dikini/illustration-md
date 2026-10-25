import { mkdir, writeFile } from 'node:fs/promises';
const ROOT = new URL('../', import.meta.url);

const output = new URL('.build/preview/', ROOT);
await mkdir(output, { recursive: true });
await writeFile(new URL('index.html', output), `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Illustration-md examples</title>
<style>body{font:18px/1.5 system-ui;margin:2rem auto;padding:0 1rem;max-width:65rem;background:#faf9f3;color:#222}
figure{margin:2rem 0;padding:1rem;border:1px solid #ddd}img{display:block;max-width:100%;height:auto}
figcaption{margin-top:1rem}a{color:#57457e}</style>
<h1>Illustration-md examples</h1>
<p>Prose briefs, saved construction, explicit authoring, and deterministic preparation.</p>
<figure><img src="../../examples/custom/assets/fig-add-inputs/figure.svg" width="600" alt="Three blue Int squares linked by arrows">
<figcaption>Custom SVG · rough strokes · outlined Excalifont · <a href="../../examples/custom/README.md">brief</a></figcaption></figure>
<figure><img src="../../examples/tree/assets/fig-tree-repair/figure.svg" width="280" alt="Before and after a left-left tree repair">
<figcaption>split-md tree · rough strokes · protected fills · <a href="../../examples/tree/README.md">brief</a></figcaption></figure>
<figure><img src="../../examples/sequence/assets/fig-item-lookup/figure.svg" width="700" alt="Caller, Service and Store exchange four messages">
<figcaption>Mermaid sequence · crisp · outlined regular lettering · <a href="../../examples/sequence/README.md">brief</a></figcaption></figure>
</html>\n`);
console.log(new URL('index.html', output).href);
