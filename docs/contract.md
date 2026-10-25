# Illustration boundary

## Source and saved assets

Use a prose illustration fence with a stable lower-case `fig-` ID and matching
metadata. The fence is an agent-readable brief, not a renderer DSL.

````markdown
---
diagrams:
  - kind: illustration
    id: fig-example
    caption: Two pieces joined by an arrow.
    description: A left square points to a right square.
    width: 45mm
---

```{#fig-example .illustration}
Show two equal blue squares with an arrow between them. Use rough strokes
and handwritten lettering. Keep the signature in the caption.
```
````

Pandoc supplies the Markdown parser and normalizes the explicit language/class
to `CodeBlock` class `illustration`. A plain language fence with no stable ID
cannot resolve artwork. Nested notes and Divs retain their surrounding AST.

Store artwork at `assets/fig-example/figure.svg` beside the source document,
with `assets/fig-example/illustration.json`:

```json
{
  "version": 1,
  "svg": "figure.svg",
  "construction": {"renderer_owned": "opaque to preparation"}
}
```

Preparation requires only the exact integer version and local SVG reference.
Construction is opaque: it may contain native notation, geometry, parameters,
or references to retained drawing source. Do not turn it into a mandatory
universal graph schema. The provided CLI additionally uses `figure` metadata,
a supported construction `kind`, saved resolved `appearance`, and dependency
provenance. Captions/descriptions in source metadata remain authoritative for
document substitution; authors must review their agreement with SVG metadata.

## Deterministic preparation

`prepare_document` matches illustration descriptions by ID, not global order.
It rejects duplicate fences, duplicate descriptions, missing metadata, and
unused illustration metadata. Unrelated diagram kinds and code fences are
left to their existing consumers. Captions and descriptions must be nonempty
literal metadata; no macros or runnable expressions are evaluated.

The replacement is a native Pandoc `Figure` with the stable ID and a visible
caption. Its `Image` has the alternative description as its text, a matching
`fig-alt` attribute, and optional positive finite physical width in `mm`.
No width means no explicit size: the consuming renderer owns its fallback.
This extraction does not include ash-doc's note scaling or placement rules.

The resolver rejects escaping and external URLs, query strings, fragments,
symlink escapes, invalid versions, and missing SVGs. SVG must have a positive
finite `viewBox`, supported vector elements, outlined lettering, and no
scripts, event handlers, images, foreign objects, external links/resources,
reader fonts, entities, or document declarations. This is a narrow accepted
asset boundary, not a general SVG sanitizer or protection against every
resource-exhaustion attack. Use trusted authoring inputs.

The transformer never reads construction semantics or executes a sidecar's
commands. It does not compare brief hashes to artwork hashes. A changed
brief can intentionally keep the old SVG until an author accepts a revision.
Missing artwork stops preparation without changing the source or sidecar.

## Explicit authoring

An agent owns semantic freshness. Read surrounding prose and any canonical
program or supplied data; then preserve, create, revise, or regenerate as
appropriate. Describe the relationship before choosing a drawing method.
Inspect existing accepted SVGs before adopting or replacing them.

Construction, appearance, and filtering are independent choices. Native
Mermaid syntax can describe a message timeline; split-md can describe a tree;
custom vector geometry can express exact seams or mathematical placement.
The current wrappers support only their documented subsets. An unsupported
combination must not pretend to have been applied.

Resolve defaults only when explicitly adopting them. Retain resolved values
for font, stroke, roughness, bowing, and seed in saved construction. Rebuilding
then uses those values, not the current defaults. Source-image validation is
also run before publishing newly authored artwork.

The authoring CLI renders twice, compares bytes, validates SVG, and stages
both files before replacing accepted output. Each file is renamed atomically;
the pair is not a filesystem transaction. Do not author the same figure
concurrently. Rendering/validation failures leave accepted files unchanged;
power-loss and filesystem failures during publication require recovery from
Git. Larger consumers may choose a versioned-directory transaction instead.

## Review the explanation and its page

Check semantic correspondence separately from visual perception. Inspect
labels, arrows, protected fills, endpoint/seam clearance, paint order,
grayscale, and the actual display width. Match repeated primitives by their
nominal geometry, not by forcing every image to fill its container.

`figureWidth` converts a chosen primitive size and viewBox width into a
literal physical image width. Its aside/body configuration is an example,
not a global layout prescription. Consumer responsive fitting can reduce it.
Screen millimetres are CSS layout units, not hardware calibration.

A standalone SVG or gallery does not verify final note collisions, page
breaks, enlarged EPUB text, or either PDF layout. Consumers own those checks.
