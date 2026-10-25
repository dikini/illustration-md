---
illustration-defaults:
  font: excalifont
  stroke: rough
diagrams:
  - kind: illustration
    id: fig-add-inputs
    width: 65mm
    caption: "add : Int → Int → Int"
    description: Three separate blue squares labelled Int, connected left to right by two arrows.
---

# Comparing three positions

The task is to illustrate `add : Int → Int → Int` literally as three blue
boxes with arrows between them. This is a signature comparison, not a tree
of curried function results or a claim about evaluation order.

```{#fig-add-inputs .illustration}
Show three separate, equally sized blue squares in one horizontal row,
with a right-pointing arrow between each neighbouring pair. Put Int inside
each square. Keep the full function signature in the caption, not above
the artwork. Use rough hand-drawn contours and Excalifont lettering. Keep
the fills exact and protect the lettering from the stroke filter.
```

## Construction and review

The agent inferred a literal row from the problem, rather than introducing
an outlined function-valued region. `base.svg` retains the exact geometry
and simple text labels. The explicit shape-role list binds the bounded
filter to three rectangles and two arrow paths. Lettering is outlined first;
only contours receive seeded rough strokes. The final SVG is self-contained.

Rebuild from the repository root:

```sh
node src/author.mjs --state examples/custom/assets/fig-add-inputs/illustration.json
```

Inspect label clearance, arrow visibility, equal square sizes, and grayscale.
These dimensions are one worked example, not a universal type notation.
Ordinary preparation substitutes the saved SVG even if the brief changes.
