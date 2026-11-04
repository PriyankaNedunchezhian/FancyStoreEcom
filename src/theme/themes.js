export const THEME_STORAGE_KEY = 'fancy-store-theme';

export const THEMES = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Light blue & white',
    preview: ['#2563eb', '#ffffff', '#f8fafc'],
  },
  {
    id: 'midnight',
    label: 'Slate',
    description: 'Cool slate surfaces',
    preview: ['#2563eb', '#ffffff', '#f1f5f9'],
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Sky blue accent',
    preview: ['#0284c7', '#ffffff', '#f8fafc'],
  },
  {
    id: 'olive',
    label: 'Teal',
    description: 'Soft teal accent',
    preview: ['#0f766e', '#ffffff', '#f8fafc'],
  },
  {
    id: 'blush',
    label: 'Blush',
    description: 'Rose accent on white',
    preview: ['#db2777', '#ffffff', '#f8fafc'],
  },
];

export const DEFAULT_THEME = 'classic';

export function isValidTheme(id) {
  return THEMES.some((theme) => theme.id === id);
}
