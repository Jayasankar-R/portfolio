export type Theme = {
  name: string;
  bg: string;
  panel: string;
  fg: string;
  dim: string;
  line: string;
  accent: string;
  accent2: string;
};

export const themes: Theme[] = [
  { name: 'obsidian', bg: '#050505', panel: '#0c0c0c', fg: '#d9d9d9', dim: '#6a6a6a', line: '#262626', accent: '#e8c547', accent2: '#7ee787' },
  { name: 'circuit', bg: '#03100c', panel: '#061a14', fg: '#bff5e2', dim: '#4c7a6c', line: '#123a2e', accent: '#2ef2b8', accent2: '#5ac8ff' },
  { name: 'ember', bg: '#0d0604', panel: '#160b07', fg: '#f2dace', dim: '#85604f', line: '#331a10', accent: '#ff6a3d', accent2: '#ffc857' },
  { name: 'voltage', bg: '#07070f', panel: '#0e0e1c', fg: '#dcdcff', dim: '#5f5f8c', line: '#22224a', accent: '#a78bfa', accent2: '#facc15' },
  { name: 'mono', bg: '#000000', panel: '#0a0a0a', fg: '#f5f5f5', dim: '#666666', line: '#2a2a2a', accent: '#ffffff', accent2: '#a3a3a3' },
  { name: 'paper', bg: '#f2efe6', panel: '#e8e4d8', fg: '#1d1c19', dim: '#8a857a', line: '#cfc9b8', accent: '#c2410c', accent2: '#0f766e' },
];

export function applyTheme(t: Theme) {
  const s = document.documentElement.style;
  s.setProperty('--bg', t.bg);
  s.setProperty('--panel', t.panel);
  s.setProperty('--fg', t.fg);
  s.setProperty('--dim', t.dim);
  s.setProperty('--line', t.line);
  s.setProperty('--accent', t.accent);
  s.setProperty('--accent2', t.accent2);
}
