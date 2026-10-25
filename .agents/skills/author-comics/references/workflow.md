# A reusable episode workflow

Read [the file and fence contract](../../../../docs/comics.md) for exact paths
and sidecar fields. Read [the worked example](../../../../examples/comics/README.md)
for ready-to-run commands. These links resolve within illustration-md.

1. Read the requested lesson, surrounding curriculum, canonical program and
   relevant series references. Save the lesson path and source revision when
   available; do not edit an external consumer to make a comic example.
2. Add a page directory with its Markdown `.comic` fence and metadata. Add
   that page's relative source path to `series.json` explicitly. Keep an
   episode script beside its future accepted asset: exact dialogue/code,
   panel beats, prerequisites, source and review notes. These are prose files,
   not a required panel schema or executable renderer specification.
3. For a new cast, create and inspect a reference sheet first. Place it under
   the series' shared assets, describe identity anchors in the character
   bible, and register it in the `references` pool. At acceptance, select only
   IDs actually supplied via repeated `--reference ID` options; omitting the
   option snapshots the whole pool. Keep v1 files/IDs when adding v2. Older
   episodes check their selected v1 bytes; new ones may select v2. Reference
   snapshots store paths/hashes, not copies; preserve historical image files.
4. Supply those images to the model and retain the final exact prompt. Save
   candidates under `.build/comics/` or another explicitly chosen draft area.
   Generation is an authoring action, never a build action.
5. Review the generated image. Revise if needed. Run `accept` only after
   semantic and visual review; the command checks files, not narrative truth.
   It copies PNG bytes without resizing or tracing and snapshots references.
   Use `--replace` only for an intended revision. Each accepted file rename is
   atomic, but the three-file set is not a transaction; use Git or a backup to
   recover from an interrupted replacement. Never author one ID concurrently.
6. Run `catalogue`. Resolve missing files or provenance drift explicitly.
   Changing shared assets does not invalidate ordinary document preparation;
   it raises an editorial review issue in this separate authoring check.
7. Prepare the source with Pandoc and `illustration_md.prepare`, setting the
   resource root to the page directory. Stage final page-local PNGs in each
   consumer format. Inspect actual book placement, pagination and lettering.

A prose change does not require regeneration. A missing image requires
restoring accepted artwork or an explicit authoring task. Preparation-only
requests do neither. Store generator name/model only as reported by the tool;
use `not exposed by tool` when the model identity is unavailable.
