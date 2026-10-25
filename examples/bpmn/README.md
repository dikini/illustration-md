---
diagrams:
  - kind: illustration
    id: fig-bpmn-order
    width: 180mm
    caption: BPMN order fulfilment with a stock decision
    description: A Customer black-box pool sends an order to a Merchant message start event. Sales checks stock. An exclusive gateway sends unavailable orders to Decline order and an end event, or available orders across the Warehouse lane to Pack order, Ship order and a separate end event. Ship order sends a dispatch message to Customer.
  - kind: illustration
    id: fig-bpmn-support
    width: 180mm
    caption: BPMN support escalation with an exclusive merge
    description: A Requester black-box pool sends an issue to a Service message start event. Support triages it. A Known fix exclusive gateway routes Yes directly to an exclusive merge, or No through Engineering investigation before merging. Support replies, sends a message to Requester and reaches a normal end event. No parallel split or retry is shown.
---

# BPMN 2.0 companions to swimlanes

The [swimlane examples](../swimlanes/README.md) explain ownership and handoffs.
These two examples add BPMN process notation: events define entry and exit,
exclusive gateways select or merge alternatives, and participants communicate
across pool boundaries. They are saved visual illustrations of a small subset
of [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF), not executable
process definitions, BPMN XML interchange files, or a complete BPMN renderer.

## Order fulfilment: crisp collaboration

A customer places an order. Within the Merchant participant, Sales checks
stock. If stock is unavailable, Sales declines the order and that path ends.
Otherwise, Warehouse packs and ships it; shipping sends a dispatch notice to
the customer before the successful path ends. The customer is a black-box pool:
its internal actions are intentionally undisplayed. The Sales-to-Warehouse
handoff crosses a lane boundary inside Merchant, so it is a sequence flow.
The order and dispatch notice cross participant boundaries as message flows.

```{#fig-bpmn-order .illustration}
Draw a Customer black-box pool above a Merchant process pool containing Sales
and Warehouse lanes. An Order message flow enters a thin-ring message start
event with an unfilled envelope in Sales. Follow with Check stock and an
exclusive diamond marked X, labelled In stock?. No leads to Decline order
and a thick-ring normal end event. Yes crosses into Warehouse, then Pack order,
Ship order, and a separate normal end event. Ship order sends a Dispatch notice
message to Customer. Use rounded tasks, crisp geometry and regular lettering.
Use solid sequence lines with filled arrowheads only within Merchant; use dashed
message lines with source circles and open arrowheads between participants.
```

## Support escalation: sketch collaboration

A requester reports an issue. Support triages it and decides whether a fix is
known. A known fix goes straight to an exclusive merge. Otherwise Engineering
investigates before returning to that same merge. Support replies to the
requester and the process ends. Only one alternative runs; the merge is not
a parallel synchronization. This companion focuses on escalation and reply;
requester verification and the swimlane example's retry loop are omitted.

```{#fig-bpmn-support .illustration}
Draw a Requester black-box pool above a Service pool with Support and Engineering
lanes. Receive an Issue message at a message start event, then Triage issue and
an X-marked Known fix? exclusive gateway. Yes leads directly to an X-marked
exclusive merge. No crosses into Engineering for Investigate, then returns to
the merge. After merging, Support performs Reply, sends a Reply message to
Requester and reaches a thick-ring normal end event. Make container, lane and
rounded task outlines rough and handwritten in appearance. Preserve exact event
rings, envelope, X diamonds, filled sequence arrowheads, and dashed message flows
with source circles and open heads. Protect task fills and outlined Excalifont.
```

## Construction and appearance

[`construct.mjs`](construct.mjs) explicitly constructs only these two examples.
It retains exact `base.svg` sources and a separate prepared `sketch.svg` for the
support illustration. The latter uses the existing Rough.js dependency with
roughness 1.8, bowing 1 and seeds incrementing from 1729 in marked-element order.
It clones exact task fills before sketching their rounded contours. Events,
gateways and connectors are not selected for roughening. The script renders
the sketch twice and requires byte agreement before saving construction.

The ordinary `custom-svg` authoring route then outlines labels and validates
the final SVG. Both sidecars save a crisp final appearance profile because
this final phase preserves the already prepared source contours. Sketch
parameters belong to `sourceConstruction`, separately from final appearance.
Applying the existing broad rect/path rough filter again would remove important
fills, round-task geometry, and message-flow distinctions; it is not requested.
No core filter, preparation behavior, dependency or pin changes are needed.

With the optional authoring environment set, rebuild drawing sources and then
accepted artwork from the repository root:

```sh
node examples/bpmn/construct.mjs
node src/author.mjs --state examples/bpmn/assets/fig-bpmn-order/illustration.json
node src/author.mjs --state examples/bpmn/assets/fig-bpmn-support/illustration.json
npm run preview
```

## Review and limits

Review at the chosen 180mm width and in grayscale. Check task roundness, thin
start versus thick end rings, envelope visibility, gateway X marks, branch
labels and all arrowhead clearances. Follow both alternatives to their ends.
Message flows must remain distinguishable by dashes and open heads without
relying on color. Sequence flows stay within their process pool even when
crossing lanes. Exact source symbols and fills are checked against the sketch;
both final SVGs participate in saved-hash rebuild tests.

The symbols follow the limited notation described above. No engine execution,
XML schema conformance or full BPMN conformance validation is claimed.
Standalone gallery and saved-SVG preparation checks do not review consumer
HTML layout, EPUB, or PDF pagination.
