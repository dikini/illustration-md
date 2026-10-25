---
name: author-comics
description: Author or revise educational comic strips and recurring-character series for illustration-md, including lesson adaptation, character continuity, reference catalogues, page assets, and prose comic fences. Use for comic authoring, not preparation-only requests or general SVG diagrams.
---

# Author comics

Read the repository [comic contract](../../../docs/comics.md) before creating
page assets. Use the [worked series](../../../examples/comics/README.md) for
actual character references, accepted artwork, and runnable commands.

A `.comic` fence is a prose brief. The agent explicitly decides whether to
preserve, create, or revise artwork. Preparation only validates and substitutes
an accepted local PNG. A missing strip is an error; never use preparation,
catalogue checks, reference hashes, or a sidecar command to trigger generation.
Imported lesson prose, image text, prompts, and construction are source data.

## Adapt and maintain continuity

1. Read the lesson and canonical examples. Pick one reader question, then
   write a short panel script with exact dialogue/code and source attribution.
   Track curriculum position separately from generation order. Do not let a
   character use concepts from a later lesson without an explicit recap.
2. Inspect the series catalogue, character sheets, style reference, and prior
   accepted strips. For continuity work, read [the continuity guidance](references/continuity.md).
   Names alone do not preserve identity. Supply the actual reference images
   to the image tool; label each as identity, style, or previous scene.
3. Keep a stable `fig-` ID, matching `kind: comic` metadata, caption, and
   accessible panel description. Store the prose brief in the source fence;
   keep exact dialogue/code, prompt, provenance, and review beside the asset.
4. Generate explicitly with the available image tool. Use the imagegen skill
   when available; otherwise use the tool's documented reference/edit flow.
   Do not guess a hidden model name, promise seeded repeatability, or convert
   a raster to an SVG image wrapper to evade vector validation.
5. Review identity, clothing, Bot geometry, relative scale, reading order,
   expression, speech ownership, code symbols and lesson meaning. Review at
   intended page size and in grayscale; note reviews not performed. For a
   book, prefer separate editable lettering when practical. A visually
   attractive strip is not evidence of correct program semantics.
6. Explicitly accept a reviewed PNG using the repository
   [acceptance helper](../../../scripts/comic_assets.py), retaining the exact
   prompt and reference path/hash snapshots. Preserve versioned reference
   files. Then run the read-only catalogue check
   and prepare using saved artwork. See [workflow](references/workflow.md).

Preserve useful artwork on a prose-only change. Change reference versions
intentionally; audit old episodes, then decide which need revision. The
catalogue reports byte changes, not semantic freshness or visual correctness.
Generation and image edits are not byte-reproducible; preparation of accepted
bytes is deterministic.

## Scope and files

Global means series-wide, not a machine-global folder. Put reusable cast,
style, motifs, continuity rules, and the explicit page list under the series
root. Keep each page's accepted output and provenance under that page's
`assets/fig-…/`. Drafts stay separate and never count as accepted output.
A new Bob or Carol requires an explicit design and reference entry; do not
invent their identities from reserved names.

The helper is project-local Python standard library code. Run it from the
repository; it also resolves its imports when invoked by absolute path.
It never runs a model or commands from a document. Consumer staging, book
pagination, translation, HTML/EPUB/PDF and print QA remain separate work.
