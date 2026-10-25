# Learn Ash comic series example

This standalone series demonstrates the
[comic fence and asset workflow](../../docs/comics.md). It adapts a small part
of ash-doc's Learn path without changing that repository. The
[author-comics skill](../../.agents/skills/author-comics/SKILL.md) guides later
episodes using the same references.

## Catalogue

| Asset | Role |
| --- | --- |
| [Alice and Bot reference](shared/characters/alice-bot-v1.png) | Primary recurring-character identity |
| [Character bible](shared/characters/bible.md) | Stable traits, flexible roles and known discrepancies |
| [Pencil pilot](shared/style/pencil-pilot-v1.png) | Style, rough diagrams and ash-tree setting; lesson 10 |
| [A question, then a choice](pages/choosing-a-result/README.md) | Accepted four-panel episode, lesson 4 |
| [Series record](series.json) | Explicit image-reference and page inventory |

The source lesson asks readers to distinguish an equality's Boolean result
from the integer selected by a match. The adaptation uses four beats:
question, calculation, selected true arm, changed question and false arm.
See the [exact episode script](pages/choosing-a-result/assets/fig-choosing-a-result/script.md)
for source attribution, curriculum continuity and review limits.

The cast sheet supplies identity; the pilot supplies appearance. The adopted
Bot has one central chest button, standardizing a discrepancy in the pilot.
Construction is generated raster artwork, appearance is coloured pencil on
ivory paper, and no rough SVG filter is applied. Rough boxes and arrows are
part of the generated image, not a claim that a vector filter processed it.

## Try the saved-artwork workflow

From the repository root:

```sh
python3 scripts/comic_assets.py catalogue --series examples/comics/series.json
mkdir -p .build
pandoc --from markdown --to json examples/comics/pages/choosing-a-result/README.md |
  python3 -m illustration_md.prepare --source examples/comics/pages/choosing-a-result/README.md |
  pandoc --from json --to html --standalone --embed-resources \
    --resource-path examples/comics/pages/choosing-a-result \
    --output .build/comic.html
```

This rebuild uses only saved bytes. The exact generation prompt, accepted
PNG and provenance sidecar live beside the page's illustration fence. Image
creation was explicit using the built-in image tool; its model name was not
exposed. Regeneration requires another explicit authoring decision and need
not reproduce the same bytes.

For a second episode, create `pages/<lesson>/README.md` and its stable comic
ID, register that page in series.json, read the new lesson, write its exact
panel script and use the actual shared reference images. Review and accept
the candidate using the [acceptance command](../../docs/comics.md#suggested-workflow-and-commands).
Do not copy the previous strip and relabel its provenance as a newly generated
episode. Store new lesson-specific props locally; promote only genuinely
reusable, approved objects to shared assets.

## Evidence and consumer limits

The original images were inspected full-size for character identity,
meaning, code and dialogue clearance. A 170mm CSS-width colour/grayscale
check found the main lettering and selection arrows readable; use full-width
placement. Standalone HTML preparation was exercised. Whole-document
HTML/EPUB/PDF/print layouts require further review; see the page's script.
This example is not an ash-doc integration or a publication mechanism. The
images retain their generation provenance; no blanket project license is
implied.
