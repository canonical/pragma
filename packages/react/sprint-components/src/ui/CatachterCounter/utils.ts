export function mapToColor(value: number, min: number, max: number) {
  // Clamp value to range
  value = Math.max(min, Math.min(max, value));

  // Normalize value between 0 and 1
  const t = (value - min) / (max - min);

  // Interpolate green and blue channels
  const r = 255;
  const g = Math.round(255 * (1 - t));
  const b = Math.round(255 * (1 - t));

  return `rgb(${r}, ${g}, ${b})`;
}

export function pseudoRandom1D(val: number, seed: number): number {
  const sinInput = val * 12.9898 + seed * 78.233;
  return Math.abs(Math.sin(sinInput) * 43758.5453) % 1;
}

export function mapToRange(
  pseudo: number,
  outMin: number,
  outMax: number
): number {
  return outMin + pseudo * (outMax - outMin);
}

export function pseudoRandom2DMap(
  x: number,
  y: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): [number, number] {
  const normX = (x - inMin) / (inMax - inMin);
  const normY = (y - inMin) / (inMax - inMin);

  const randX = pseudoRandom1D(normX, 1);
  const randY = pseudoRandom1D(normY, 2);

  const mappedX = mapToRange(randX, outMin, outMax);
  const mappedY = mapToRange(randY, outMin, outMax);

  return [mappedX, mappedY];
}
