---
name: author-illustrations
description: Author or revise a saved-SVG illustration from a document's problem or prose illustration fence, including construction, appearance, and optional filters. Use for visual explanation and semantic artwork review, not routine document preparation.
---

# Author illustrations

Read the repository [contract](../../../docs/contract.md). Start with the
reader's question and the relationship the picture should expose. Read enough
surrounding prose, program, or data to distinguish the problem from a proposed
visual metaphor. Do not infer program semantics from diagram layout.

## Decide before drawing

Inspect the fence, accepted SVG, sidecar, drawing source, and nearby figures.
Preserve useful artwork; revise only affected construction when possible.
Create or regenerate when the request justifies it, not because a hash changed.
If given only a problem, infer and write a prose brief before constructing it.
Keep the user's task distinct from the agent's interpretation in saved notes.

Use a stable `fig-` ID and matching caption/description metadata. Put the
prose brief in the document and construction beside `assets/<id>/figure.svg`.
Choose a native representation or precise custom vector geometry appropriate
to the explanation; do not force every picture into a tree or graph schema.

## Choose construction and appearance independently

Read the relevant worked example:

- [Custom SVG](../../../examples/custom/README.md): exact shape positions,
  simple outlined labels, and a bounded rough contour filter.
- [split-md tree](../../../examples/tree/README.md): topology, identity colors,
  triangular subtrees, edge-first paint order, and distinct before/after states.
- [Mermaid sequence](../../../examples/sequence/README.md): messages ordered
  in time, crisp strokes, and outlined regular lettering.

Each example follows problem → interpretation → prose brief → construction →
appearance/filter → review/limits. Transfer the reasoning, not its exact shape.
These examples do not restrict future construction tools.

Resolve explicit request over document defaults over global defaults only
during authoring. Save resolved choices; ordinary rebuilding retains them.
Use `--adopt-defaults` only when intentionally adopting current defaults.
Read the [tool commands](../../../README.md#appearance-and-filtering) before
using them. Unsupported combinations must fail rather than claiming a font
or rough effect was applied.

Filters are optional authoring phases, not document-build hooks. The current
rough filters support particular geometry, not arbitrary SVG. Preserve exact
fills, lettering, endpoints, seams, topology, and meaning. Record phase order,
parameters, seed, input limits, and dependencies. Add a future filter only
against a concrete example with distinguishable verification criteria.

## Produce and review

Invoke the chosen authoring tool explicitly. Retain source and a complete
rebuild command that produces the final accepted SVG, not just an intermediate.
Validate self-contained vector output with outlined labels. Inspect meaning
separately from perception: colors, shapes, arrows, label clearance, grayscale,
actual column size, and repeated primitive sizes. Color alone should not carry
an essential distinction. Do not claim storage identity from a rewiring image.

Report construction and filter limits, checks actually run, and consumer
formats not reviewed. Then prepare the document using saved SVG substitution.
Never add generation or semantic-freshness decisions to preparation, even
when a brief has changed or an asset is missing. A preparation-only request
is not authorization to author or revise artwork.
