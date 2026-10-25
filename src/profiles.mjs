export const PROFILES = [
  { name: 'mild', seed: 1729, roughness: 0.6, bowing: 0.5 },
  { name: 'rough', seed: 1729, roughness: 1.8, bowing: 1 }
];
const sha256 = data => createHash('sha256').update(data).digest('hex');

export function selectProfile(name, roughness) {
  if (name === 'regular' || name === 'crisp') return { name: 'crisp', seed: 1729, roughness: 0, bowing: 0 };
  const preset = PROFILES.find(profile => profile.name === name);
  if (preset) return { ...preset };
  if (name === 'custom' && Number.isFinite(roughness) && roughness >= 0 && roughness <= 5) {
    return { name, seed: 1729, roughness, bowing: 1 };
  }
  throw new Error('Choose crisp, mild, rough, or custom roughness from 0 to 5.');
}
