---
diagrams:
  - kind: illustration
    id: fig-item-lookup
    width: 140mm
    caption: A caller receives an item through a service.
    description: Caller asks Service to get an item. Service asks Store to read it. Store replies to Service, then Service replies to Caller. Requests are solid and replies dashed; time flows downward.
---

# Following a request and its reply

The task is to explain how a caller obtains an item through a service. The
agent inferred a sequence diagram because message order matters more than
spatial structure. The caller does not contact the store directly.

```{#fig-item-lookup .illustration}
Make a Mermaid sequence diagram with Caller, Service, and Store, arranged
left to right. Caller sends Get item to Service; Service sends Read item to
Store. Store replies Item to Service, then Service replies Item to Caller.
Show time flowing downward, solid requests, and dashed replies. Use regular
lettering and crisp strokes. Keep only these four messages, without retries
or failures. Do not apply the tree or box rough filter to sequence geometry.
```

## Construction and review

The agent translated the prose into Mermaid syntax saved in the sidecar.
Mermaid renders explicitly during authoring. The PDF-to-SVG outlining phase
removes reader-font dependencies using the bundled IBM Plex Mono face.
The accepted SVG is what document preparation reads.

```sh
node src/author.mjs --state examples/sequence/assets/fig-item-lookup/illustration.json
```

Review participant order, four messages, reply direction, dashed/solid
distinction, label clearance, and narrow-screen legibility. This adapter
supports crisp, regular-lettered sequences only. The example does not specify
error handling, storage semantics, concurrency, or elapsed durations.
