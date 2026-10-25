---
diagrams:
  - kind: illustration
    id: fig-order-handoffs
    width: 170mm
    caption: Order fulfilment across three owners
    description: A customer submits an order, Sales accepts it, Warehouse packs and ships it, and the customer receives it. Arrows cross owner lanes; there are no decisions or parallel steps.
  - kind: illustration
    id: fig-support-escalation
    width: 170mm
    caption: Support escalation with a retry loop
    description: A requester reports a problem. Support triages it and decides whether a fix is known. Yes goes directly to Reply; No goes to Engineering to Investigate, then back to Reply. The requester verifies the fix and returns to Triage if unresolved; otherwise the process ends.
---

# Swimlane examples

These two scenarios test whether custom SVG can explain responsibility and
handoffs without another drawing dependency. Read lanes as owners and arrows
as control flow. Horizontal distance does not measure elapsed time. These are
illustrations, not executable workflows or a claim of BPMN conformance.

## Order fulfilment: a single path

A customer places an order. Sales accepts it; Warehouse packs and ships it;
the customer receives it. Assume payment and stock checks have succeeded.
The reader should be able to identify each owner and follow the three handoffs.

```{#fig-order-handoffs .illustration}
Show three horizontal lanes labelled Customer, Sales, and Warehouse. Place
Submit order in Customer, Accept order in Sales, Pack / ship in Warehouse,
and Receive order back in Customer. Connect them in that order with explicit
arrowheads and routed right-angle paths. Use crisp blue activity boxes, pale
lane backgrounds, dark strokes, and outlined regular lettering. Do not imply
parallel work or draw a decision. Make the delivery back to Customer visible.
```

## Support escalation: a branch and a retry

A requester reports a problem. Support triages it and asks whether a fix is
known. A known fix goes straight to a reply. An unknown fix needs Engineering
investigation before Support replies. The requester verifies the fix; an
unresolved problem returns to triage. A resolved problem ends the scenario.
The reader should distinguish a conditional branch from a lane handoff.

```{#fig-support-escalation .illustration}
Show Requester, Support, and Engineering as horizontal lanes. Put Report issue
and Verify fix in Requester; Triage issue, a Known fix? decision diamond, and
Reply in Support; and Investigate in Engineering. Label both outgoing decision
branches Yes and No. Route Yes directly to Reply and No through Investigate
before returning to Reply. From Reply point up to Verify fix. Draw an explicit
If unresolved return arrow from verification to triage; mark resolved as the
end condition. Use rough contours with seed 1729, exact pale fills, and protected
outlined regular lettering. Keep all branch labels clear of the arrows.
```

## Construction, appearance, and review

Each asset directory retains `base.svg`, an exact construction with editable
text, and `illustration.json`, with explicit geometry roles and resolved
appearance. The existing `custom-svg` route outlines labels before filtering.
The order example uses crisp geometry. The support example uses the bounded
rect/path rough filter; its lane fills, activity fills, and outlined labels
are protected. Rounded rectangles are confined to the crisp example.
No new adapter, preparation behavior, or third-party dependency is needed.

Rebuild from the repository root with the optional authoring environment set:

```sh
node src/author.mjs --state examples/swimlanes/assets/fig-order-handoffs/illustration.json
node src/author.mjs --state examples/swimlanes/assets/fig-support-escalation/illustration.json
npm run preview
```

Review at the intended 170mm body width: lane membership, arrow direction,
branch labels, return routes, and grayscale readability. The decision stays
recognizable by shape and Yes/No labels without color. The routes are manually
placed for these scenarios; there is no automatic layout or arbitrary swimlane
DSL support. Repeated rendering is checked by the authoring CLI and integration
tests. Browser provenance records the actual version, subject to the toolchain
minimum; cross-version byte identity is not promised.

Standalone gallery and saved-asset preparation review do not verify consumer
HTML layout, EPUB, or PDF pagination.
