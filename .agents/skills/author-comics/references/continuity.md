# Character and curriculum continuity

Use the series' character bible plus actual reference pixels. One clear
sheet with front, three-quarter and profile views and expressions is usually
more useful than a long prompt. Add a measured group silhouette when height
matters; a model-generated height caption is not a measurement.

For the Learn Ash example, Alice has dark curly hair, round glasses and a
teal sweater. Bot has an ochre rounded head, black face screen, pale eyes,
one ball-tipped antenna, rounded joints and one central chest button. The
pilot had two chest details; the cast sheet and current episode standardize
one. Preserve these anchors while changing poses and expressions.

The accepted pilot is a style reference, not an equally authoritative second
character bible. If references disagree, say which is authoritative before
asking the model to draw. Inspect every local reference before supplying it.
With a recent-image API, include the smallest recent set that contains all
required references. If references cannot all be supplied, request the missing
images rather than silently generating from names.

Record per-episode knowledge: lesson position, concepts introduced, concepts
assumed, and any deliberate recap. Generation order can differ from reading
order. Alice can be an advanced pattern learner in lesson 10 and a beginner
in lesson 4. Bot should encourage prediction and evidence; it need not always
supply the answer. Other cast members can learn and discover too.

For revisions, identify what changes and what stays fixed. Preserve the
previous accepted file until the replacement passes review. Save a new
versioned character sheet for a deliberate redesign; old episode reference
hashes remain historical evidence. Never relabel them as having used the new
sheet. Selective regeneration is an agent/editor decision.

Review at the intended physical width. Check speech tails, label clearance,
underscore versus dash, `==` versus `=`, and `=>` versus an arrow drawing.
Grayscale must preserve any selected arm through position, wording or arrows.
Record which book formats were actually inspected. Re-running an image model
cannot be used as an identical-render check; hash the accepted saved bytes.
