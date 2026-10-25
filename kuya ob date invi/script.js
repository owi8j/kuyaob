// --- PERSONALIZE YOUR DATE DETAILS ---
const dateDetails = {
  date: "YOUR DATE HERE" // e.g. "SATURDAY, NOVEMBER 14TH"
};

document.getElementById("dateText").textContent = dateDetails.date;

// DOM Elements
const container = document.getElementById("container");
const flap = document.getElementById("flap");
const seal = document.getElementById("seal");
const pocket = document.getElementById("pocket");
const card = document.getElementById("card");
const panel2 = document.getElementById("panel2");
const panel3 = document.getElementById("panel3");
const coverInfo = document.getElementById("coverInfo");
const hintEl = document.getElementById("gestureHint");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

// --- PROGRESS MODEL ---
// P = 0 closed · 0→1 envelope opens and card rises · 1→2 fold 2 unfolds · 2→3 fold 3 unfolds
const MAX = 3;
const PX_PER_UNIT = 170;      // finger distance (px) for one stage
const CARD_W = 320;           // keep in sync with style.css
const CARD_H = 200;
const PANELS = 3;

let P = 0;
let target = 0;
let raf = 0;
let scale = 1, topOpen = 0, envH = 0;

// Gesture state
let isDragging = false;
let startY = 0, startP = 0, lastY = 0, lastT = 0, vel = 0;

// --- WEB AUDIO SYNTHESIZED PIANO ENGINE ---
let audioCtx = null;
let isPlayingMusic = false;
let musicInterval = null;
let chordIdx = 0;

const chords = [
  [261.63, 329.63, 392.00, 523.25], // C maj7
  [220.00, 261.63, 329.63, 440.00], // A min7
  [174.61, 220.00, 261.63, 349.23], // F maj7
  [196.00, 246.94, 293.66, 392.00]  // G maj
];

function playChord() {
  if (!isPlayingMusic || !audioCtx) return;
  const notes = chords[chordIdx];
  chordIdx = (chordIdx + 1) % chords.length;

  notes.forEach((freq, i) => {
    setTimeout(() => {
      if (!isPlayingMusic || !audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      // Soft acoustic attack & decay
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.035, audioCtx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 3.8);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 4.0);
    }, i * 160);
  });
}

// Music starts with her first swipe (browsers only allow sound after a gesture)
// and pauses again if she closes the envelope.
function setMusic(on) {
  if (on) {
    try {
      if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
      }
      audioCtx.resume();
      if (!isPlayingMusic) {
        isPlayingMusic = true;
        playChord();
        musicInterval = setInterval(playChord, 4600);
      }
    } catch (e) {
      console.log("Audio Context not allowed", e);
    }
  } else if (isPlayingMusic) {
    isPlayingMusic = false;
    clearInterval(musicInterval);
    if (audioCtx) audioCtx.suspend();
  }
}

const syncMusic = () => setMusic(target > 0);

// --- LAYOUT: scale the 3-panel card so it fits the envelope when fully open ---
function layout() {
  envH = container.clientHeight;
  const envW = container.clientWidth;
  scale = Math.min((envH - 32) / (CARD_H * PANELS), (envW - 32) / CARD_W, 1.15);
  topOpen = (envH - CARD_H * PANELS * scale) / 2;
}

// --- RENDER ENGINE ---
function fold(el, f, z) {
  // f: 1 = folded back behind its parent, 0 = lying flat
  el.style.transform = `translateZ(${z}px) rotateX(${-180 * f}deg)`;
  el.style.setProperty("--shade", (Math.sin(Math.PI * f) * 0.26).toFixed(3));
}

function setHint() {
  let text = "";
  if (P >= 2.95) text = "Slide down to fold it back";
  else if (P > 0.05) text = "Keep sliding up";
  if (text) hintEl.textContent = text;
  hintEl.classList.toggle("show", !!text);
}

function render() {
  P = clamp(P, 0, MAX);
  const p1 = Math.min(P, 1);

  // 1. Envelope flap: unfolds from 0deg to 180deg
  flap.style.transform = `rotateX(${p1 * 180}deg)`;
  flap.style.zIndex = p1 > 0.4 ? "1" : "4";

  // 2. Wax seal: scale down & fade as flap unfolds
  seal.style.transform = `translate(-50%, -50%) scale(${Math.max(0, 1 - p1 * 2.2)})`;
  seal.style.opacity = Math.max(0, 1 - p1 * 2);

  // 3. Cover text fades immediately
  coverInfo.style.opacity = Math.max(0, 1 - p1 * 2.5);

  // 4. Card rises out of the envelope, 1-to-1 with the finger
  pocket.style.zIndex = p1 > 0.4 ? "5" : "2";
  const y = envH - p1 * (envH - topOpen);
  card.style.transform = `translateY(${y}px) scale(${scale})`;

  // 5. Z-fold: each panel swings down from behind the previous one
  fold(panel2, 1 - clamp(P - 1, 0, 1), -1.5);
  fold(panel3, 1 - clamp(P - 2, 0, 1), -0.75);

  card.setAttribute("aria-hidden", String(P < 0.95));
  setHint();
}

layout();
render();
window.addEventListener("resize", () => { layout(); render(); });

// --- SETTLE (smooth snap to a stage) ---
function settle(t) {
  target = clamp(Math.round(t), 0, MAX);
  if (reduceMotion) { P = target; render(); return; }
  if (!raf) raf = requestAnimationFrame(tick);
}

function tick() {
  P += (target - P) * 0.14;
  if (Math.abs(target - P) < 0.002) { P = target; raf = 0; }
  else raf = requestAnimationFrame(tick);
  render();
}

// --- DIRECT 1:1 POINTER & TOUCH GESTURE TRACKING ---
function onPointerDown(e) {
  isDragging = true;
  cancelAnimationFrame(raf);
  raf = 0;
  startY = lastY = e.clientY;
  startP = P;
  lastT = performance.now();
  vel = 0;
  if (container.setPointerCapture && e.pointerId !== undefined) {
    container.setPointerCapture(e.pointerId);
  }
}

function onPointerMove(e) {
  if (!isDragging) return;
  const now = performance.now();
  const dt = now - lastT;
  if (dt > 0) vel = 0.7 * vel + 0.3 * ((lastY - e.clientY) / dt); // upward = positive px/ms
  lastY = e.clientY;
  lastT = now;

  P = startP + (startY - e.clientY) / PX_PER_UNIT;                 // upward swipe opens
  render();
}

function onPointerUp() {
  if (!isDragging) return;
  isDragging = false;

  if (performance.now() - lastT > 90) vel = 0;                     // finger paused before release
  const moved = P - startP;
  let t = P + (vel / PX_PER_UNIT) * 180;                           // a quick flick carries further
  t += Math.sign(moved) * 0.15;                                    // small bias so short swipes still commit
  if (Math.abs(moved) < 0.03) t = startP;                          // plain touch: stay put

  settle(t);
  syncMusic();
}

container.addEventListener("pointerdown", onPointerDown);
container.addEventListener("pointermove", onPointerMove);
container.addEventListener("pointerup", onPointerUp);
container.addEventListener("pointercancel", onPointerUp);
container.addEventListener("touchend", syncMusic, { passive: true }); // extra nudge for iOS audio

// Keyboard fallback for desktop testing
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") { settle(target + 1); syncMusic(); }
  if (e.key === "ArrowDown") { settle(target - 1); syncMusic(); }
});