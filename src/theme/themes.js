export const THEME_STORAGE_KEY = 'fancy-store-theme';

export const THEMES = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Clean black & white',
    preview: ['#0a0a0a', '#ffffff', '#f4f4f5'],
  },
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Dark charcoal admin',
    preview: ['#e8e8ea', '#141416', '#1c1c1f'],
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Cool slate & teal',
    preview: ['#0f2f3a', '#f3f7f8', '#0d9488'],
  },
  {
    id: 'olive',
    label: 'Olive',
    description: 'Warm stone & moss',
    preview: ['#1f2a1c', '#f6f5f0', '#5c6b3a'],
  },
  {
    id: 'blush',
    label: 'Blush',
    description: 'Soft rose neutrals',
    preview: ['#2a1a1d', '#fbf7f8', '#b76e79'],
  },
];

export const DEFAULT_THEME = 'classic';

export function isValidTheme(id) {
  return THEMES.some((theme) => theme.id === id);
}
