---
diagrams:
  - kind: illustration
    id: fig-web-service-network
    width: 170mm
    caption: "Web service: public entry and private services"
    description: Internet clients connect over HTTPS to a public load balancer. The load balancer connects to App A and App B in the private zone; both applications connect to one database. Lines are bidirectional logical connections, not a packet timeline.
  - kind: illustration
    id: fig-office-network
    width: 170mm
    caption: "Office network: wired and wireless access"
    description: The Internet connects to an office firewall/router, then to a LAN switch. The switch connects to a Wi-Fi access point, wired PCs and a NAS. Wi-Fi laptops connect through the access point. Lines are bidirectional logical connections; no redundant uplink or guest-network isolation is shown.
---

# Network infrastructure examples

The task is to illustrate two infrastructure scenarios with distinct appearance:
a crisp service topology and a rough office sketch. These are invented examples,
not diagrams of a deployed system. They show connectivity and grouping rather
than packet order, physical cable lengths, or a complete security configuration.

## Web service: crisp topology

The reader's question is how clients reach the service and where application
and database connections belong. One public load balancer distributes traffic
to two application instances; both use a single private database. The split
and merge expose the shared entry and storage points. They do not establish
high availability: replication, failover, firewall rules, and administration
paths are outside this example.

```{#fig-web-service-network .illustration}
Show Internet clients at the left, a public load balancer in a labelled Public
entry enclosure, and two application instances plus one database in a labelled
Private services enclosure. Connect clients to the load balancer with an HTTPS
link. Branch from the balancer to App A and App B, and join their database links
to the shared Database. Use crisp rectangles and orthogonal connection lines,
pale blue service fills, a pale yellow database fill, and outlined regular
lettering. Draw connections without arrowheads and explicitly state that lines
are bidirectional logical connections. Keep labels and zone headings clear of
links. Label the single-database assumption so two apps do not imply failover.
```

## Office network: rough sketch

The reader's question is which equipment connects the office's wired and
wireless devices. A firewall/router connects the Internet to the LAN switch.
The switch serves a Wi-Fi access point, wired PCs, and a network-attached
storage device (NAS). Laptops connect through the access point. The office
boundary groups local equipment, while the Internet remains outside it.
A shared line junction means connectivity, not a separate device. This sketch
does not show guest isolation, VLANs, link redundancy, or a Wi-Fi radio survey.

```{#fig-office-network .illustration}
Place the Internet above a labelled Office LAN enclosure. Inside, arrange a
Firewall / router above a LAN switch. Fan out the switch's Ethernet connections
to Wi-Fi AP, Wired PCs, and NAS. Put Laptops below the access point and label
that connection Wi-Fi. Label the router uplink WAN and its internal side LAN.
Use rough sketch contours, handwritten Excalifont labels, exact pale fills,
and seed 1729. Keep device boxes separate from shared connection junctions.
Use bidirectional logical links without arrowheads, explain the line convention,
and state that the single-uplink sketch omits guest VLANs and failover.
```

## Construction, appearance, and review

Each figure retains editable `base.svg` construction and an `illustration.json`
sidecar beside its accepted `figure.svg`. The existing `custom-svg` authoring
route outlines labels before applying appearance. Semantic geometry roles name
zones, devices, and connections. Zone fills are painted first, then connections,
then device boxes and labels, so no link runs through a device's interior.

The service example uses crisp strokes and bundled IBM Plex Mono. The office
example uses the existing bounded rect/path rough filter and bundled Excalifont.
Only declared contours receive seeded rough strokes; rectangle fills and
outlined lettering remain protected. This is manual construction for two
specific topologies, with no new dependencies or automatic layout engine.
Preparation validates and substitutes saved assets without interpreting links.

Rebuild from the repository root with the optional authoring environment set:

```sh
node src/author.mjs --state examples/network/assets/fig-web-service-network/illustration.json
node src/author.mjs --state examples/network/assets/fig-office-network/illustration.json
npm run preview
```

Review at the intended 170mm body width and in grayscale. Check both application
branches and their shared database link; check the office switch's three
branches and the separate Wi-Fi laptop link. Labels, enclosures, and topology
carry meaning without relying on color. Preserve connection endpoints and
junctions during filtering. The authoring CLI compares repeated renders;
integration tests rebuild both accepted SVGs and verify their saved hashes.
Exact browser and dependency provenance are recorded in each sidecar.

Gallery review and saved-SVG preparation do not verify consumer HTML layout,
EPUB rendering, or PDF pagination.
