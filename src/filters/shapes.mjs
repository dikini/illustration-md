export function transformSvg({ source, figure, profile }) {
  if (!Number.isInteger(profile.seed) || profile.seed < 1 || profile.seed >= 2 ** 31) {
    throw new Error('A nonzero seed in the supported range is required.');
  }
  if (![profile.roughness, profile.bowing].every(value => Number.isFinite(value) && value >= 0)) {
    throw new Error('Roughness and bowing must be finite nonnegative numbers.');
  }
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (document.querySelector('parsererror') || document.documentElement.localName !== 'svg') {
    throw new Error('The phase needs an SVG document.');
  }
  const svg = document.documentElement;
  const geometry = [...svg.querySelectorAll('rect, path, line, polygon, polyline, circle, ellipse')]
    .filter(node => !node.closest('g[aria-label]'));
  if (geometry.some(node => !['rect', 'path'].includes(node.localName))) {
    throw new Error('This shape filter supports only rect and path geometry.');
  }
  if (geometry.length !== figure.roles.length || geometry.some((node, index) =>
    node.localName !== figure.roles[index][0])) {
    throw new Error('The SVG does not match the approved pilot geometry.');
  }
  for (const node of geometry) {
    for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
      if (ancestor.hasAttribute('transform')) throw new Error('The phase does not support transformed geometry.');
    }
  }
  const serializer = new XMLSerializer();
  const labelBytes = () => [...svg.querySelectorAll('g[aria-label], title, desc')]
    .map(node => serializer.serializeToString(node)).join('\n');
  const originalLabels = labelBytes();
  if (profile.roughness === 0) return { svg: source, pairVertices: null,
    roles: figure.roles.map(([, role]) => role) };
  const paint = (node, attribute, fallback) => {
    for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
      if (ancestor.hasAttribute(attribute)) return ancestor.getAttribute(attribute);
    }
    return fallback;
  };
  const seedFor = role => {
    let hash = profile.seed;
    for (const character of `${figure.id}:${role}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    return (hash >>> 0) % (2 ** 31 - 1) + 1;
  };
  const renderer = rough.svg(svg);
  let pairVertices = null;
  const pairIndex = figure.roles.findIndex(([, role]) => role === 'pair');
  if (pairIndex >= 0) {
    const pair = geometry[pairIndex];
    const seam = geometry[figure.roles.findIndex(([, role]) => role === 'seam')];
    const horizontal = Number(pair.getAttribute('x'));
    const vertical = Number(pair.getAttribute('y'));
    const width = Number(pair.getAttribute('width'));
    const height = Number(pair.getAttribute('height'));
    const start = seam.getPointAtLength(0);
    const end = seam.getPointAtLength(seam.getTotalLength());
    if (start.x !== horizontal + width / 2 || start.y !== vertical ||
        end.x !== start.x || end.y !== vertical + height) {
      throw new Error('The pair seam must meet the outer contour at both ends.');
    }
    pairVertices = [[horizontal, vertical], [start.x, vertical], [horizontal + width, vertical],
      [horizontal + width, vertical + height], [end.x, vertical + height], [horizontal, vertical + height]];
  }
  for (const [index, node] of geometry.entries()) {
    const role = figure.roles[index][1];
    const options = { seed: seedFor(role), roughness: profile.roughness, bowing: profile.bowing,
      preserveVertices: true, stroke: paint(node, 'stroke', 'none'),
      strokeWidth: Number(paint(node, 'stroke-width', '1')) };
    const replacement = document.createElementNS(svg.namespaceURI, 'g');
    replacement.setAttribute('data-sketch-role', role);
    replacement.setAttribute('stroke-linecap', paint(node, 'stroke-linecap', 'butt'));
    replacement.setAttribute('stroke-linejoin', paint(node, 'stroke-linejoin', 'miter'));
    let outline;
    if (node.localName === 'rect') {
      const fill = node.cloneNode(true);
      fill.setAttribute('stroke', 'none');
      replacement.append(fill);
      outline = role === 'pair' ? renderer.polygon(pairVertices, options) : renderer.rectangle(
        Number(node.getAttribute('x')), Number(node.getAttribute('y')),
        Number(node.getAttribute('width')), Number(node.getAttribute('height')), options);
    } else if (role === 'seam') {
      const start = node.getPointAtLength(0);
      const end = node.getPointAtLength(node.getTotalLength());
      outline = renderer.line(start.x, start.y, end.x, end.y, options);
    } else {
      outline = renderer.path(node.getAttribute('d'), options);
    }
    replacement.append(outline);
    node.replaceWith(replacement);
  }
  if (labelBytes() !== originalLabels) throw new Error('The outline phase changed protected lettering or metadata.');
  return { svg: serializer.serializeToString(svg), pairVertices,
    roles: figure.roles.map(([, role]) => role) };
}
