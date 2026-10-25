---
name: maintain-illustration-md
description: Maintain illustration-md's deterministic fence transformer, saved-artwork validation, explicit authoring adapters, appearance resolution, or filtering. Use for tool changes and consumer integration boundaries, not interpreting an illustration problem.
---

# Maintain illustration-md

Read [the contract](../../../docs/contract.md) and identify which operation is
changing: preparation, explicit authoring, or consumer integration.

Preparation lives in `illustration_md/prepare.py`, needs only Python's standard
library, and operates on Pandoc JSON. Keep parsing with Pandoc. Preserve stable
IDs, nested context, descriptions, physical widths, local path containment,
SVG validation, non-execution, and unchanged input files. Do not import drawing
dependencies, resolve defaults, or use hashes as a semantic-freshness decision.

Explicit authoring lives in `src/`. Appearance resolution and size calculation
are separate from construction. The box/tree rough filters have structural
preconditions; do not relax those into a claim of arbitrary SVG support.
For another filter, first establish input limits, protected geometry, phase
order, supported combinations, deterministic parameters, and a worked example.

Use failing regression tests before changing behavior. `npm test` checks the
core and appearance/size helpers. `npm run test:authoring` exercises real
adapters, repeated output, protected fills/labels, edge order, saved hashes,
and failure preservation; it requires the declared optional toolchain.
Consult [setup and pins](../../../README.md#set-up-optional-authoring).

Keep dependency and font hashes checked, retain licenses, and deliberately
review changed pins. Do not hide an unavailable dependency with a fallback
renderer. Do not run an untrusted construction program because a sidecar names
one: the provided CLI dispatches only supported construction kinds.

Consumers own relative resource paths, asset staging, page layout, translation,
and cross-format review. Integrate with ash-doc only on an explicit request;
the initial extraction leaves its working consumer unchanged. Report what was
tested independently and what still needs consumer review.
