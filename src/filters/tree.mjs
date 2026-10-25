export function transformTree({ source, scene, id, profile }) {
  if (!Number.isInteger(profile.seed) || profile.seed < 1 || profile.seed >= 2 ** 31) throw new Error('Invalid seed.');
  if (![profile.roughness, profile.bowing].every(value => Number.isFinite(value) && value >= 0)) {
    throw new Error('Invalid roughness or bowing.');
  }
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (document.querySelector('parsererror')) throw new Error('Invalid SVG.');
  const svg = document.documentElement;
  if (svg.localName !== 'svg' || svg.querySelector('[transform], text, script, filter, foreignObject, image, defs')) {
    throw new Error('Unsupported tree SVG content.');
  }
  const geometry = [...svg.children].filter(node => !['title', 'desc'].includes(node.localName));
  const bindings = [];
  const counts = {};
  let index = 0;
  for (const element of scene.elements) {
    const kind = element.kind;
    counts[kind] = (counts[kind] ?? 0) + 1;
    if (!['circle', 'emptyCircle', 'solidCircle', 'triangle', 'edge', 'downArrow'].includes(kind)) {
      throw new Error(`Unsupported tree scene element: ${kind}`);
    }
    const split = kind === 'circle' || kind === 'emptyCircle';
    const tags = split ? ['path', 'path', 'circle'] : [kind === 'solidCircle' ? 'circle' : 'path'];
    const nodes = geometry.slice(index, index + tags.length);
    if (nodes.length !== tags.length || nodes.some((node, at) => node.localName !== tags[at])) {
      throw new Error('Tree geometry differs from the pinned scene.');
    }
    index += tags.length;
    bindings.push({ element, node: nodes.at(-1) });
  }
  if (index !== geometry.length) throw new Error('Unexpected tree geometry.');
  if (profile.roughness === 0) return { svg: source, counts };
  const renderer = rough.svg(svg);
  const serializer = new XMLSerializer();
  const protectedBytes = () => [...svg.querySelectorAll('title, desc')]
    .map(node => serializer.serializeToString(node)).join('\n');
  const metadata = protectedBytes();
  for (const [position, { element, node }] of bindings.entries()) {
    const kind = element.kind;
    let seed = profile.seed;
    for (const character of `${id}:${kind}:${position}`) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
    const options = { seed: (seed >>> 0) % (2 ** 31 - 1) + 1,
      roughness: profile.roughness, bowing: profile.bowing, preserveVertices: true,
      stroke: element.stroke, strokeWidth: element.strokeWidth };
    const group = document.createElementNS(svg.namespaceURI, 'g');
    group.setAttribute('data-shape', kind);
    if (kind === 'triangle' || kind === 'solidCircle') {
      const fill = node.cloneNode(true);
      fill.setAttribute('stroke', 'none');
      group.append(fill);
    }
    if (['circle', 'emptyCircle', 'solidCircle'].includes(kind)) {
      group.append(renderer.circle(element.cx, element.cy, element.r * 2, options));
    } else if (kind === 'triangle') {
      const bottom = element.apex + element.height;
      group.append(renderer.polygon([[element.x, element.apex], [element.x - element.half, bottom],
        [element.x + element.half, bottom]], options));
    } else if (kind === 'edge') {
      group.append(renderer.line(element.x1, element.y1, element.x2, element.y2, options));
    } else {
      group.append(renderer.line(element.x, element.y1, element.x, element.y2, options));
      group.append(renderer.linearPath([[element.x - element.head, element.y2 - element.head],
        [element.x, element.y2], [element.x + element.head, element.y2 - element.head]], options));
    }
    node.replaceWith(group);
  }
  if (metadata !== protectedBytes()) throw new Error('Tree metadata changed.');
  return { svg: serializer.serializeToString(svg), counts };
}
