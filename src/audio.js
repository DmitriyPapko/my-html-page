import state from './state.js';

const AC = window.AudioContext ? new AudioContext() : null;

export function beep(freq = 440, dur = 0.08, type = 'triangle', gain = 0.06) {
  if (state.muted || !AC) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = freq;
  o.connect(g); g.connect(AC.destination); g.gain.value = gain;
  o.start();
  g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + dur);
  o.stop(AC.currentTime + dur);
}

export function playSfx(name) {
  if (state.muted || !AC) return;
  if (name === 'denied') {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine';
    o.frequency.value = 110;
    o.connect(g); g.connect(AC.destination); g.gain.value = 0.08;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + 0.25);
    o.stop(AC.currentTime + 0.25);
  }
}
