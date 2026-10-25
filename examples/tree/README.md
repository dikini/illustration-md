---
diagrams:
  - kind: illustration
    id: fig-tree-repair
    width: 55mm
    caption: The same associations and subtrees before and after a left-left repair.
    description: A violet root has a blue left child with a yellow left child. After repair, blue is the root, with yellow and violet children. Four triangular subtrees retain their order and identity colors.
---

# Keeping the same pieces during repair

The problem is to make structural correspondence visible during a left-left
tree repair. Track associations and whole ordered subtrees, not storage
identity or mutation. The upper half of a circle carries a red/black form;
its lower half identifies the association.

```{#fig-tree-repair .illustration}
Draw two small trees, before above and after below, separated by a downward
arrow. Before, black violet has red blue on its left and subtree d on its
right. Red blue has red yellow on its left and subtree c on its right.
Yellow has subtrees a and b. After, red blue is the root; black yellow is
its left child and black violet its right child. Keep a and b under yellow,
and c and d under violet. Use split circles and triangular subtree leaves.
Keep a/b/c/d green/orange/pink/cyan in both states. Use rough contours and
exact fills. Do not print labels. Paint edges behind the circles.
```

## Construction and review

The agent selected split-md's native tree syntax because it retains topology,
half-circle roles, and subtree identities. The syntax lives in the sidecar,
not the prose fence. The exact external split-md revision produces the scene;
the bounded tree filter preserves fills and paints rough contours in place.
The adapter orders edges before nodes before serialization and filtering.
The phase arrow is not an edge
inside either tree.

Rebuild after setting the explicit external checkout path:

```sh
node src/author.mjs --state examples/tree/assets/fig-tree-repair/illustration.json
```

Inspect all four leaf positions, before/after association colors, circle
clearance, the phase arrow, grayscale, and final column width. This label-free
adapter does not exercise font replacement and rejects unsupported shapes.
