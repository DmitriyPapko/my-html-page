// Warcraft-style UI theme constants
export const WC = {
  colors: {
    gold: '#C8A65B',
    bronze: '#8C6A2E',
    obsidian: '#1c1a20',
    panel: '#27252D',
    hp: '#C93333',
    mp: '#2E7BCB',
    xp: '#8E4DEB',
    text: '#E6E2D3',
    tooltipBg: '#F3E5AB',
    tooltipBorder: '#7A5A2E'
  },
  bevel: { outer: '#18161C', inner: '#3A3842', highlight: 'rgba(255,255,255,0.08)' },
  radius: 8,
  gap: 6,
  sizes: { resBarH: 48, portrait: 96, cmdBtn: 48, panelH: 140 },
};

// README:
// This theme powers the Warcraft-like HUD.  Adjust colours and sizes here
// to tweak the overall appearance.  The HUD itself can be enabled by calling
// initUI() and drawUI() from src/ui.js.
