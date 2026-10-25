---
diagrams:
  - kind: comic
    id: fig-choosing-a-result
    caption: Alice and Bot separate a Boolean question from the result selected by match.
    description: >-
      Four panels under an ash tree. Alice asks whether 20 + 22 == 42 makes
      42. Bot explains that equality gives a Bool. They trace the equality
      to true, then match true with true => 42 and false => 0 to select 42.
      Changing the equality to 20 + 22 == 41 gives false and selects 0.
    width: 170mm
---

# A question, then a choice

An adaptation of Learn Ash lesson 4, **Choosing a result**, focusing on
“Asking a question” and “Calculating the condition”. The equality produces a
Boolean; a separate match selects an integer result. This is earlier in the
reading order than the wildcard pilot (lesson 10).

```{#fig-choosing-a-result .comic}
Show Alice and Bot in four pencil-sketch panels beneath an ash tree.
Alice asks what 20 + 22 == 42 produces. Bot distinguishes the Boolean
question from the selected integer. Trace the equality to true, then show
both match arms and select true => 42. Finally change the right side of the
equality to 41, obtaining false and selecting false => 0. Keep character
identity from the shared cast sheet; use loose boxes and arrows for the
supporting explanation. Preserve exact code characters and readable dialogue.
```

The [episode script and source attribution](assets/fig-choosing-a-result/script.md)
retain exact dialogue, curriculum notes, and review limits. The accepted
[strip](assets/fig-choosing-a-result/strip.png), [prompt](assets/fig-choosing-a-result/prompt.txt),
and [sidecar](assets/fig-choosing-a-result/comic.json) are page-local.
