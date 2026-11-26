import React, { useEffect, useRef, useState } from 'react';
import type { HandLandmarker as HL, NormalizedLandmark } from '@mediapipe/tasks-vision';

// Keep in sync with the installed @mediapipe/tasks-vision version (package.json; used for types).
const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3';
const LIB_URL = `${CDN}/vision_bundle.mjs`;
const WASM_URL = `${CDN}/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

type Loaded = { landmarker: HL; connections: { start: number; end: number }[] };
// Created once per page: MediaPipe can't load its WASM runtime twice, so toggling reuses it.
let loading: Promise<Loaded> | null = null;
function getLandmarker(): Promise<Loaded> {
  if (!loading) {
    loading = (async () => {
      // Loaded from the CDN at runtime: the webpack-bundled copy hangs during init under CRA.
      const { FilesetResolver, HandLandmarker } = (await import(
        /* webpackIgnore: true */ LIB_URL
      )) as typeof import('@mediapipe/tasks-vision');
      const files = await FilesetResolver.forVisionTasks(WASM_URL);
      const landmarker = await HandLandmarker.createFromOptions(files, {
        // GPU init can hang on some browsers/drivers; CPU is reliable and fast enough for 2 hands
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numHands: 2,
      });
      return { landmarker, connections: HandLandmarker.HAND_CONNECTIONS };
    })();
    loading.catch(() => { loading = null; });
  }
  return loading;
}

export type HandStatus = 'off' | 'loading' | 'on' | 'denied' | 'error';

type Props = {
  enabled: boolean;
  onStatus: (s: HandStatus, hands: number) => void;
  /** fingertip position in viewport fractions (0..1), used to drive the eye */
  onPointer: (x: number, y: number) => void;
};

const W = 240, H = 150;
// map the comfortable middle of the camera frame to the full screen
const span = (v: number, lo: number, hi: number) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));

function clickableAt(x: number, y: number): HTMLElement | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  return el?.closest('button, a, input') as HTMLElement | null;
}

export default function HandTracker({ enabled, onStatus, onPointer }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [readout, setReadout] = useState<string[]>([]);
  const cb = useRef({ onStatus, onPointer });
  cb.current = { onStatus, onPointer };

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let landmarker: HL | null = null;
    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;

    let lastVideoTime = -1;
    let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    let pinched = false;
    let lastReadout = 0;
    let lastCount = -1;

    const start = async () => {
      cb.current.onStatus('loading', 0);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      } catch {
        if (!cancelled) cb.current.onStatus('denied', 0);
        return;
      }
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
      video.srcObject = stream;
      await video.play();
      try {
        const loaded = await getLandmarker();
        if (cancelled) return;
        landmarker = loaded.landmarker;
        const connections = loaded.connections;
        cb.current.onStatus('on', 0);
        loop(connections);
      } catch (e) {
        console.error('hand tracking failed', e);
        if (!cancelled) cb.current.onStatus('error', 0);
      }
    };

    const loop = (connections: { start: number; end: number }[]) => {
      raf = requestAnimationFrame(() => loop(connections));
      if (!landmarker || video.readyState < 2 || video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;
      const res = landmarker.detectForVideo(video, performance.now());
      const hands = res.landmarks;
      draw(hands, connections);

      if (hands.length !== lastCount) { lastCount = hands.length; cb.current.onStatus('on', hands.length); }

      const cursor = cursorRef.current;
      if (!hands.length) {
        if (cursor) cursor.style.opacity = '0';
        pinched = false;
        return;
      }
      const lm = hands[0];
      const tip = lm[8];
      // mirrored: moving your hand right moves the cursor right
      const fx = span(1 - tip.x, 0.15, 0.85), fy = span(tip.y, 0.15, 0.8);
      cx += (fx * window.innerWidth - cx) * 0.35;
      cy += (fy * window.innerHeight - cy) * 0.35;
      cb.current.onPointer(cx / window.innerWidth, cy / window.innerHeight);

      const palm = Math.hypot(lm[0].x - lm[9].x, lm[0].y - lm[9].y) || 1;
      const pinchD = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) / palm;
      const nowPinched = pinched ? pinchD < 0.45 : pinchD < 0.3; // hysteresis
      if (nowPinched && !pinched) clickableAt(cx, cy)?.click();
      pinched = nowPinched;

      if (cursor) {
        cursor.style.opacity = '1';
        cursor.style.transform = `translate(${cx}px, ${cy}px)`;
        cursor.classList.toggle('pinch', pinched);
        cursor.classList.toggle('over', !!clickableAt(cx, cy));
      }

      const t = performance.now();
      if (t - lastReadout > 120) {
        lastReadout = t;
        setReadout(hands.map((h, i) => {
          const side = res.handedness[i]?.[0]?.categoryName === 'Left' ? 'r' : 'l'; // mirrored view
          return `['hand${i}:${side}'] ${(1 - h[8].x).toFixed(4)} ${h[8].y.toFixed(4)}`;
        }).concat(`pinch ${pinchD.toFixed(2)}${pinched ? ' ●' : ''}`));
      }
    };

    const draw = (hands: NormalizedLandmark[][], connections: { start: number; end: number }[]) => {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext('2d')!;
      const css = getComputedStyle(document.documentElement);
      const fg = css.getPropertyValue('--fg').trim();
      const acc = css.getPropertyValue('--accent').trim();
      const line = css.getPropertyValue('--line').trim();
      ctx.clearRect(0, 0, W, H);
      // faint grid
      ctx.strokeStyle = line;
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 20) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
      for (const lm of hands) {
        const px = (p: NormalizedLandmark) => (1 - p.x) * W;
        const py = (p: NormalizedLandmark) => p.y * H;
        // bounding box
        const xs = lm.map(px), ys = lm.map(py);
        const x0 = Math.min(...xs) - 6, y0 = Math.min(...ys) - 6;
        ctx.strokeStyle = fg;
        ctx.globalAlpha = 0.35;
        ctx.strokeRect(x0, y0, Math.max(...xs) + 6 - x0, Math.max(...ys) + 6 - y0);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = fg;
        ctx.lineWidth = 1.2;
        for (const c of connections) {
          ctx.beginPath();
          ctx.moveTo(px(lm[c.start]), py(lm[c.start]));
          ctx.lineTo(px(lm[c.end]), py(lm[c.end]));
          ctx.stroke();
        }
        lm.forEach((p, i) => {
          ctx.fillStyle = i === 4 || i === 8 ? acc : fg;
          ctx.beginPath();
          ctx.arc(px(p), py(p), i === 4 || i === 8 ? 2.6 : 1.6, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    };

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
      setReadout([]);
      cb.current.onStatus('off', 0);
    };
  }, [enabled]);

  return (
    <>
      <div className="hands">
        <canvas ref={canvasRef} width={W} height={H} aria-hidden="true" />
        <pre className="readout">{readout.length ? readout.join('\n') : 'no hands in frame'}</pre>
      </div>
      <div ref={cursorRef} className="hand-cursor" aria-hidden="true" />
    </>
  );
}
