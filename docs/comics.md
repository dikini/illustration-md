# Comic strips and recurring characters

Comic authoring is explicit, like SVG illustration authoring. Use the
[author-comics skill](../.agents/skills/author-comics/SKILL.md) to adapt a lesson,
create or revise images, and check character continuity. Use ordinary
preparation to substitute already accepted artwork. Preparation never calls
an image model, executes a prompt, or audits character-reference freshness.

## The comic fence

The new class `.comic` and matching `kind: comic` deliberately distinguish
saved raster strips from vector `.illustration` artwork. Both use the same
`diagrams` metadata, stable `fig-` IDs, nested Pandoc context, caption,
alternative description and optional positive width in millimetres.

````markdown
---
diagrams:
  - kind: comic
    id: fig-a-question
    caption: Alice and Bot distinguish a question from a choice.
    description: Four panels trace an equality to true and select a match arm.
    width: 170mm
---

```{#fig-a-question .comic}
Show Alice asking what an equality returns. Trace the Boolean result,
then select the corresponding match arm. Keep the approved cast identities.
```
````

The brief is prose, not a panel language or command. A fence cannot be both
`.comic` and `.illustration`, and its kind must match its metadata. IDs are
unique across both kinds in one document. Missing metadata, duplicate fences,
unused metadata, missing artwork and invalid assets are errors.

Store the accepted PNG beside the source page:

```json
{
  "version": 1,
  "png": "strip.png",
  "construction": {"authoring_owned": "opaque to preparation"}
}
```

This record is `assets/fig-a-question/comic.json`. Preparation requires only
integer version 1 and a local PNG reference contained in that figure directory
and the source page directory. It validates saved PNG bytes and returns a
native Pandoc Figure/Image with class `authored-comic`. It does not inspect
construction, the series catalogue, source code, prompt, hashes or review
notes. Source metadata remains authoritative for captions and accessibility.

The supported PNG subset is static, non-interlaced, 8-bit RGB or RGBA, at
most 32 million pixels and 64 MiB on disk. Validation checks chunk framing,
checksums, contiguous compressed data, scanline length/filter codes, and final
IEND with no trailing bytes. Animated PNG, palette/grayscale encodings,
interlacing, other critical chunks and other raster formats are unsupported.
Use an explicitly reviewed conversion during authoring if needed; preparation
never converts. This bounded structural validator is not a general image
sanitizer or pixel renderer. Use trusted authored assets.

SVG validation is unchanged: no embedded raster, fonts or scripts. Do not
wrap a PNG in SVG to fit the illustration path.

## Series-wide and page-local assets

A series root belongs to the book or project. No machine-global assets,
network resolver or publishing mechanism is required. Suggested layout:

```text
book-comics/
  series.json
  shared/
    characters/
      bible.md
      alice-bot-v1.png
    style/
      pencil-pilot-v1.png
    motifs/                  # optional reusable approved objects
  pages/
    choosing-a-result/
      README.md              # source metadata and prose comic fence
      assets/
        fig-choosing-a-result/
          script.md          # exact panel text, sources, prerequisites, review
          prompt.txt         # exact final image-tool prompt
          strip.png          # accepted bytes used by preparation
          comic.json         # local reference and authoring provenance
```

Keep draft candidates outside accepted asset directories, for example under
`.build/comics/`. Global references are authoring inputs; the final image is
page-local so a consumer can stage a page's final assets without copying the
whole character library. Keep source IDs stable when moving pages and move
their assets with them. Update the catalogue's relative page paths explicitly.

A small catalogue lists the available reference pool for this cast/series
and the source pages to audit:

```json
{
  "version": 1,
  "id": "learn-ash",
  "references": [
    {"id": "alice-bot-v1", "path": "shared/characters/alice-bot-v1.png", "role": "identity"},
    {"id": "pencil-pilot-v1", "path": "shared/style/pencil-pilot-v1.png", "role": "style"}
  ],
  "pages": ["pages/choosing-a-result/README.md"]
}
```

Paths are relative, local and contained in the series root. References need
unique IDs and nonempty roles. Catalogue pages must exist and each have its
own directory. Character names, roles and curriculum knowledge belong in the
bible and episode prose; there is no universal character or scene schema.
Select only the references actually supplied when accepting an episode, using
repeated `--reference ID` options. Omitting these options selects the whole
pool, which is convenient only when every listed reference was supplied.
Page-specific approved props may be listed with paths into that page's assets
and selected only for that episode.

## Suggested workflow and commands

1. Read the lesson and canonical examples. Choose one concept. Write a
   four-beat script and exact text; record source revision and lesson position.
2. Select existing character and style references; create new references
   explicitly when needed. Save designs under versioned names. Write the page
   fence and add its path to the catalogue.
3. Supply actual reference images to an image tool. Generate and revise
   explicitly. Save the exact final prompt. Review semantics, character
   identity, code, reading order and lettering at the intended page size.
4. Accept the reviewed PNG with the helper below. It checks the PNG, copies
   the prompt and saves hashes of the references, image and prompt. It never
   generates artwork or edits the page/catalogue. Record the tool/model only
   if known; the default model value is `not exposed by tool`.
5. Run `catalogue` for authoring integrity. A changed hash reports a review
   issue with exit status 1, not a regeneration instruction. Ordinary
   preparation still uses accepted files even when global references change.
6. Prepare saved artwork and inspect it in each intended consumer format.

Run from the repository root (replace paths for your own series):

```sh
python3 scripts/comic_assets.py accept \
  --series examples/comics/series.json \
  --page examples/comics/pages/choosing-a-result/README.md \
  --id fig-choosing-a-result \
  --png /absolute/path/to/reviewed-candidate.png \
  --prompt /absolute/path/to/exact-prompt.txt \
  --tool 'built-in image tool'

python3 scripts/comic_assets.py catalogue --series examples/comics/series.json
```

Acceptance refuses existing accepted files unless `--replace` is explicitly
supplied. Each output file rename is atomic, but the set is not transactional;
use version control/backups for recovery and avoid concurrent authors of one
figure. PNG bytes are copied exactly. Reference hashes are provenance at
acceptance, not proof of visual correctness or image-model reproducibility.
Do not re-accept an old image against changed references to conceal drift.

The catalogue inventories page-local comic sidecars, checks image/prompt
hashes and the current bytes of each episode's selected references, and reports
missing files. It does not parse Markdown or certify that every fence has a
matching record; run actual Pandoc preparation for that check. No build is
triggered by catalogue.

```sh
mkdir -p .build
pandoc --from markdown --to json examples/comics/pages/choosing-a-result/README.md |
  python3 -m illustration_md.prepare --source examples/comics/pages/choosing-a-result/README.md |
  pandoc --from json --to html --standalone --embed-resources \
    --resource-path examples/comics/pages/choosing-a-result \
    --output .build/comic.html
```

## Evolving a series

Keep `alice-bot-v1.png` and its catalogue ID when introducing
`alice-bot-v2.png`. Add v2 to the reference pool with a new ID. For a new
strip using v2 plus the existing style reference, accept with:

```sh
python3 scripts/comic_assets.py accept \
  --series /path/to/book-comics/series.json \
  --page /path/to/book-comics/pages/new-lesson/README.md \
  --id fig-new-lesson --png /path/to/reviewed.png \
  --prompt /path/to/prompt.txt --tool 'built-in image tool' \
  --reference alice-bot-v2 --reference pencil-pilot-v1
```

The old episode still checks against v1; adding v2 alone causes no drift.
Changing or deleting the referenced v1 bytes is a review issue. Decide
explicitly whether older episodes keep their design or get revised. The
helper saves reference paths and hashes, not copies of the reference images;
versioned shared files preserve those historical pixels. Do not delete an
old version while an accepted episode depends on it.

## Review and limits

The [worked example](../examples/comics/README.md) retains real references and
accepted artwork, not placeholders. Character continuity is reviewed by the
author: an image model can drift despite reference conditioning. Separately
editable code and lettering are preferable for production, translations and
small print. A generated height caption is not a measured proportion guide.

Review at actual display width and in grayscale. Check labels, arrows,
contrast, speech ownership, important geometry and code characters. Retain
review notes distinguishing completed checks from open work. Repeatable
preparation preserves accepted bytes; repeated model generation is not
expected to produce identical output. Consumer resource staging, HTML/EPUB/PDF,
page breaks and print review remain separate responsibilities. These examples
do not integrate with or alter ash-doc's consumer.
