# Illustration-md

Author an illustration from a prose brief, save its construction and SVG, and
prepare documents without asking an agent to interpret the brief again.

This is an experimental extraction from ash-doc, not a published package.
It has no Ash language dependency and does not replace ash-doc's consumer yet.

## Two separate operations

**Authoring** is an explicit agent-led decision: preserve, create, revise, or
regenerate artwork after reading the problem and document context. The agent
writes a brief, chooses construction and appearance, invokes a drawing tool,
and reviews the result. Prose is not a drawing language or executable command.

**Preparation** is a Python standard-library Pandoc JSON transformation. It
matches stable IDs, validates local saved artwork, and substitutes images. It
never calls an agent, runs drawing code, resolves appearance defaults, or
decides semantic freshness. Changed prose with unchanged SVG uses the same
artwork. Missing or invalid artwork is an error, not a generation trigger.

Read the [contract](docs/contract.md) for the sidecar and fence boundary.

## Prepare a document

Python 3.10+ is enough for the library and JSON filter. Markdown conversion
uses an external Pandoc executable; the standalone smoke test uses Pandoc
3.7.0.2. Quarto may supply Pandoc, but is not required by this library.

```sh
mkdir -p .build
pandoc --from markdown --to json examples/custom/README.md |
  python3 -m illustration_md.prepare --source examples/custom/README.md |
  pandoc --from json --to html --standalone --embed-resources \
    --resource-path examples/custom --output .build/custom.html
```

Run this pipeline from the repository root. Asset URLs remain relative to
the canonical Markdown file; set the resource path accordingly. The JSON
filter can also be imported as `prepare_document(document, source_path)`.
It copies the input AST and does not modify source, sidecars, or SVGs.

## Set up optional authoring

Preparation needs none of these dependencies. The explicit authoring tools
use Node.js 22.12+, the frozen npm lock, Python's pinned font tools, and a
declared local Chrome executable. Tested on Linux x86_64. Dependencies are
checked during authoring; version changes require deliberate re-review.

```sh
PUPPETEER_SKIP_DOWNLOAD=true npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-authoring.txt
export ILLUSTRATION_PYTHON="$PWD/.venv/bin/python"
export ILLUSTRATION_BROWSER=/absolute/path/to/chrome
```

The browser must report `Chrome/152.0.7977.75` or newer, as declared by
`minimumBrowser` in `toolchain.json`. Each authored sidecar records the exact
browser used; byte agreement across different browser versions is not guaranteed.
Use an existing compatible executable or install the minimum explicitly through
the pinned Puppeteer tools:

```sh
npx puppeteer browsers install chrome@152.0.7977.75
```

Set `ILLUSTRATION_BROWSER` to the executable path reported by that command.
The local authoring browser uses `--no-sandbox`; run only trusted construction
in an appropriately isolated environment. The main drawing page blocks
network requests. This is not a sandbox for arbitrary SVG or Mermaid input.

The tree example additionally needs an external split-md Git checkout at
the exact `splitCommit` in `toolchain.json`, exposed by `SPLIT_MD_ROOT`.
The adapter checks all five source hashes and their committed bytes. It
does not silently check out another revision or vendor split-md source.
Mermaid sequences require `pdftocairo` 26.01.0 for outlined output. The
regular font is bundled IBM Plex Mono; the handwritten option is the bundled
Latin subset of Excalifont. Missing glyphs fail rather than silently falling
back to a reader-installed font.

## Choose a construction

| Example | Relationship | Construction and appearance |
| --- | --- | --- |
| [Custom SVG](examples/custom/README.md) | Three signature positions | Exact boxes, rough contours, Excalifont |
| [Tree repair](examples/tree/README.md) | Pieces survive rewiring | split-md scene, rough contours, protected fills |
| [Sequence](examples/sequence/README.md) | Messages ordered in time | Mermaid, crisp strokes, outlined regular font |
| [Swimlanes](examples/swimlanes/README.md) | Ownership, handoffs, decisions and retries | Custom SVG, crisp and rough strokes, outlined regular font |

These are alternatives, not a renderer whitelist for all future artwork.
Each example separates the problem, inferred brief, saved construction,
appearance/filter, rebuild command, and review limits. Read it before copying
its technique. The two rough filters are bounded adapters, not an arbitrary
SVG-to-Excalidraw converter.

```sh
npm run author -- --state examples/custom/assets/fig-add-inputs/illustration.json
npm run author -- --state examples/tree/assets/fig-tree-repair/illustration.json
npm run author -- --state examples/sequence/assets/fig-item-lookup/illustration.json
npm run preview
```

The preview command writes `.build/preview/index.html` for local review; it
does not build or certify a consumer's HTML, EPUB, or PDFs.

## Appearance and filtering

During explicit default adoption, request overrides document
`illustration-defaults`, which override `style.json`'s `appearance`. Otherwise
rebuilding uses the already saved resolved appearance. Defaults never change
artwork implicitly during preparation.

```sh
npm run author -- --state examples/custom/assets/fig-add-inputs/illustration.json \
  --adopt-defaults --document examples/custom/README.md \
  --override '{"stroke":"mild"}'
```

`PANDOC_BIN` can select the executable used to read document defaults.
Choices are `regular` or `excalifont` lettering, and `crisp`, `mild`, `rough`,
or `custom` strokes. Custom roughness is 0–5. Explicit numeric roughness
selects custom; a later stroke preset resets roughness and bowing. Unsupported
renderer/font/filter combinations fail rather than falling back silently.

Filtering is a separate, explicit authoring phase. Preserve fills, labels,
endpoints, seams, and structural meaning. Save filter parameters, seed,
dependencies, and the final SVG hash. Other filters can be added when a
concrete example establishes their input limits and review criteria; there
is no speculative filter registry.

## Verification and agent skills

```sh
npm test
npm run test:authoring
```

Unit tests cover appearance precedence, physical-width calculation, pure
preparation, nested fences, invalid paths/assets, and non-generation.
Authoring integration tests need the optional toolchain and rebuild all
five saved figures, check seeded repeatability and protected fills/labels,
verify edge-first layering, and retain accepted files on rendering failure.
Byte agreement is scoped to the recorded toolchain and platform.

Repository-local skills:

- [`author-illustrations`](.agents/skills/author-illustrations/SKILL.md):
  interpret a problem, draft a brief, choose construction, and review artwork.
- [`maintain-illustration-md`](.agents/skills/maintain-illustration-md/SKILL.md):
  change the preparation or authoring tools without crossing their boundary.

Skills are project-local, not installed globally. Consumers retain their own
captions, translations, asset staging, CSS, and print layout. Ash-doc adoption
is a separate integration. See [provenance](docs/provenance.md) for extraction
sources, fonts, dependency attribution, and licensing limits.
