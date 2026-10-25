# Episode script and evidence

## Source and interpretation

Adapted from ash-doc `content/learn/choosing-a-result/README.md`, lesson 4,
“Asking a question” and “Calculating the condition”, with canonical example
`src/03-calculated-choice.ash`. The source was read locally on 2026-10-25;
no ash-doc files were changed. A pinned source revision is recorded below.
The adaptation specializes the lesson's `choose` function to a received
Boolean and the literal result values 42 and 0.

Alice knows integer addition, equality and function calls. This episode
introduces Bool and match arms. It assumes no constructor or wildcard
knowledge from lesson 10, despite that pilot being generated first.

## Exact panel script

1. Alice: “Bot, does this make 42?” Notebook: `20 + 22 == 42`.
   Bot: “The equality makes a Bool, Alice.”
2. Trace: `20 + 22 == 42` → `42 == 42` → `true`.
   Alice: “The question gives true.”
3. Board:

   ```ash
   match true {
       true => 42
       false => 0
   }
   ```

   Bot: “Now match selects the true arm.” Result card: `42`.
4. Alice: “With 41, the question gives false.” Card: `20 + 22 == 41`.
   Trace: `false` → `0`, label “false arm”.
   Bot: “Then the false arm gives 0.”
   Closing caption: “Ask a question. Match its answer.”

## Construction and review

Generated explicitly using the built-in image tool with the cast sheet as
primary identity and the pilot as style reference. The tool did not expose
the model identity. See prompt.txt for the exact accepted generation prompt.
The prompt and sidecar are provenance, not executable build instructions.

Visually reviewed full-size: Alice's glasses, hair and sweater; Bot's shape,
antenna and adopted chest detail; four-panel reading order; dialogue ownership;
correct equality results and both match arms; code symbols and label clearance.
Arrows and words retain the selected-arm distinction independently of colour.
The diagrams support the narrative without implying delayed argument evaluation.

No claim of byte-repeatable generation. The acceptance helper preserves and
hashes the actual saved bytes. The 170mm placement is suggested, not certified:
a 170mm CSS-width colour/grayscale review found the main dialogue, code and
selection arrows readable. The small subtitle favours full-width placement.
Whole-document EPUB/PDF/print reviews remain open. A standalone HTML build
was exercised; this is not a whole-book HTML placement review.
Generated lettering is raster, not separately editable; a production book
should consider separate lettering and code overlays.

Source checkout HEAD: `e800faebc06fcafc0456f3e3f63f79d8b3f7a28d`.
Lesson working tree changes at adaptation: none.
