export function figureWidth(viewWidth, shapeUnits, placement, shape, sizes) {
  const dimension = sizes[placement]?.[`${shape}Mm`];
  if (![viewWidth, shapeUnits, dimension].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('A supported placement, shape, and positive dimensions are required.');
  }
  return `${(viewWidth * dimension / shapeUnits).toFixed(3)}mm`;
}
