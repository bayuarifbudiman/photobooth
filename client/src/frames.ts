import type { CSSProperties } from 'react';

export interface PixelSlot {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function slotStyle(slot: PixelSlot, cw: number, ch: number): CSSProperties {
  return {
    position: 'absolute',
    left: `${(slot.x / cw) * 100}%`,
    top: `${(slot.y / ch) * 100}%`,
    width: `${(slot.w / cw) * 100}%`,
    height: `${(slot.h / ch) * 100}%`,
    overflow: 'hidden',
  };
}

// ── Frame types ───────────────────────────────────────────────────────────────

interface FrameBase {
  id: string;
  name: string;
  emoji: string;
  canvasW: number;
  canvasH: number;
  bgColor: string;
  drawBackground: (ctx: CanvasRenderingContext2D, isDuo: boolean) => void;
  drawForeground: (ctx: CanvasRenderingContext2D, isDuo: boolean) => void;
}

export interface SingleFrame extends FrameBase {
  frameType: 'single';
  soloSlot: PixelSlot;
  duoSlots: [PixelSlot, PixelSlot];
}

// 3-shot burst strip — each stripSlot holds one scene (full duo or solo)
export interface StripFrame extends FrameBase {
  frameType: 'strip';
  stripSlots: [PixelSlot, PixelSlot, PixelSlot];
}

export type Frame = SingleFrame | StripFrame;

// ── helpers ───────────────────────────────────────────────────────────────────

function filmHoles(ctx: CanvasRenderingContext2D, cw: number, ch: number, stripW: number) {
  const hW = Math.round(stripW * 0.42);
  const hH = Math.round(hW * 1.5);
  const xL = Math.round((stripW - hW) / 2);
  const xR = cw - stripW + xL;
  const count = 10;
  ctx.fillStyle = '#252525';
  for (let i = 0; i < count; i++) {
    const y = Math.round((ch / count) * i + (ch / count) * 0.25);
    ctx.beginPath(); ctx.roundRect(xL, y, hW, hH, 3); ctx.fill();
    ctx.beginPath(); ctx.roundRect(xR, y, hW, hH, 3); ctx.fill();
  }
}

// ── Single frames ─────────────────────────────────────────────────────────────

export const frames: Frame[] = [
  // None
  {
    id: 'none', name: 'None', emoji: '⬜', frameType: 'single',
    canvasW: 1280, canvasH: 720, bgColor: '#111111',
    soloSlot:  { x: 0,   y: 0, w: 1280, h: 720 },
    duoSlots: [{ x: 0,   y: 0, w: 640,  h: 720 },
               { x: 640, y: 0, w: 640,  h: 720 }],
    drawBackground: (ctx) => { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 1280, 720); },
    drawForeground: (ctx, isDuo) => {
      if (isDuo) { ctx.fillStyle = '#111'; ctx.fillRect(639, 0, 2, 720); }
    },
  },

  // Polaroid
  {
    id: 'polaroid', name: 'Polaroid', emoji: '🖼️', frameType: 'single',
    canvasW: 600, canvasH: 720, bgColor: '#ffffff',
    soloSlot:  { x: 30,  y: 30, w: 540, h: 540 },
    duoSlots: [{ x: 30,  y: 30, w: 255, h: 540 },
               { x: 315, y: 30, w: 255, h: 540 }],
    drawBackground: (ctx) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 600, 720); },
    drawForeground: (ctx, isDuo) => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 600, 30);
      ctx.fillRect(0, 570, 600, 150);
      ctx.fillRect(0, 30, 30, 540);
      ctx.fillRect(570, 30, 30, 540);
      if (isDuo) ctx.fillRect(285, 30, 30, 540);
      const g = ctx.createLinearGradient(0, 30, 0, 90);
      g.addColorStop(0, 'rgba(0,0,0,0.09)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(30, 30, 540, 60);
    },
  },

  // Neon
  {
    id: 'neon', name: 'Neon', emoji: '✨', frameType: 'single',
    canvasW: 700, canvasH: 700, bgColor: '#0a0a0f',
    soloSlot:  { x: 30,  y: 30, w: 640, h: 640 },
    duoSlots: [{ x: 30,  y: 30, w: 305, h: 640 },
               { x: 365, y: 30, w: 305, h: 640 }],
    drawBackground: (ctx) => { ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, 700, 700); },
    drawForeground: (ctx, isDuo) => {
      ctx.save();
      const t = 5;
      ctx.shadowColor = '#ff00aa'; ctx.shadowBlur = 28; ctx.strokeStyle = '#ff00aa'; ctx.lineWidth = t;
      ctx.strokeRect(t/2, t/2, 700-t, 700-t);
      ctx.shadowColor = '#00eeff'; ctx.shadowBlur = 18; ctx.strokeStyle = '#00eeff'; ctx.lineWidth = t * 0.6;
      const g = t * 3.5; ctx.strokeRect(g, g, 700-g*2, 700-g*2);
      if (isDuo) {
        ctx.shadowColor = '#ff00aa'; ctx.shadowBlur = 14; ctx.strokeStyle = '#ff00aa'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(350, 30); ctx.lineTo(350, 670); ctx.stroke();
      }
      ctx.restore();
    },
  },

  // Floral
  {
    id: 'floral', name: 'Floral', emoji: '🌸', frameType: 'single',
    canvasW: 700, canvasH: 700, bgColor: '#fdf2f8',
    soloSlot:  { x: 65,  y: 65, w: 570, h: 570 },
    duoSlots: [{ x: 65,  y: 65, w: 270, h: 570 },
               { x: 365, y: 65, w: 270, h: 570 }],
    drawBackground: (ctx) => { ctx.fillStyle = '#fdf2f8'; ctx.fillRect(0, 0, 700, 700); },
    drawForeground: (ctx, isDuo) => {
      const drawPetal = (cx: number, cy: number, angle: number, s: number) => {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
        ctx.beginPath(); ctx.ellipse(0, -s*0.6, s*0.27, s*0.6, 0, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(244,114,182,0.88)'; ctx.fill(); ctx.restore();
      };
      const drawLeaf = (cx: number, cy: number, angle: number, s: number) => {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
        ctx.beginPath(); ctx.ellipse(0, -s*0.5, s*0.17, s*0.5, 0, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(134,239,172,0.82)'; ctx.fill(); ctx.restore();
      };
      const drawFlower = (cx: number, cy: number, s: number) => {
        for (let i = 0; i < 6; i++) drawPetal(cx, cy, (i*Math.PI*2)/6, s);
        ctx.beginPath(); ctx.arc(cx, cy, s*0.22, 0, Math.PI*2);
        ctx.fillStyle = '#fde68a'; ctx.fill();
      };
      const s = 30;
      const corners: [number, number][] = [[40,40],[660,40],[40,660],[660,660]];
      const la: [number, number][] = [[-0.8,-0.1],[0.8,0.1],[-0.1,0.8],[0.1,-0.8]];
      corners.forEach(([cx, cy], i) => {
        drawLeaf(cx-s*0.55, cy, la[i][0], s*0.75);
        drawLeaf(cx, cy-s*0.55, la[i][1], s*0.75);
        drawFlower(cx, cy, s);
      });
      ctx.strokeStyle = 'rgba(244,114,182,0.35)'; ctx.lineWidth = 2;
      ctx.strokeRect(65, 65, 570, 570);
      if (isDuo) { ctx.fillStyle = '#fdf2f8'; ctx.fillRect(335, 65, 30, 570); }
    },
  },

  // Film Strip
  {
    id: 'filmstrip', name: 'Film', emoji: '🎞️', frameType: 'single',
    canvasW: 520, canvasH: 780, bgColor: '#111111',
    soloSlot:  { x: 60,  y: 40, w: 400, h: 700 },
    duoSlots: [{ x: 60,  y: 40, w: 185, h: 700 },
               { x: 275, y: 40, w: 185, h: 700 }],
    drawBackground: (ctx) => {
      ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, 520, 780);
      filmHoles(ctx, 520, 780, 60);
    },
    drawForeground: (ctx, isDuo) => {
      ctx.fillStyle = '#111111';
      ctx.fillRect(0, 0, 60, 780); ctx.fillRect(460, 0, 60, 780);
      filmHoles(ctx, 520, 780, 60);
      if (isDuo) { ctx.fillStyle = '#111111'; ctx.fillRect(245, 40, 30, 700); }
    },
  },

  // Vintage
  {
    id: 'vintage', name: 'Vintage', emoji: '🏛️', frameType: 'single',
    canvasW: 620, canvasH: 760, bgColor: '#f5e6c8',
    soloSlot:  { x: 60,  y: 60, w: 500, h: 500 },
    duoSlots: [{ x: 60,  y: 60, w: 235, h: 500 },
               { x: 325, y: 60, w: 235, h: 500 }],
    drawBackground: (ctx) => {
      ctx.fillStyle = '#f5e6c8'; ctx.fillRect(0, 0, 620, 760);
      for (let i = 0; i < 2500; i++) {
        ctx.fillStyle = `rgba(100,70,30,${Math.random()*0.035})`;
        ctx.fillRect(Math.random()*620, Math.random()*760, 1, 1);
      }
    },
    drawForeground: (ctx, isDuo) => {
      const b = 18;
      ctx.strokeStyle = '#c8a96e'; ctx.lineWidth = b;
      ctx.strokeRect(b/2, b/2, 620-b, 760-b);
      ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 2;
      const g = b+8; ctx.strokeRect(g, g, 620-g*2, 760-g*2);
      const v = ctx.createRadialGradient(310, 380, 160, 310, 380, 500);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,20,0,0.42)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, 620, 760);
      ctx.fillStyle = '#8b6914'; ctx.font = 'italic 20px Georgia, serif';
      ctx.textAlign = 'center'; ctx.fillText('✦  Memories  ✦', 310, 710);
      if (isDuo) {
        ctx.strokeStyle = '#c8a96e'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(295, 60); ctx.lineTo(295, 560); ctx.stroke();
      }
    },
  },

  // ── Strip 3×1 ─────────────────────────────────────────────────────────────
  // Canvas 480×1480 | header 120px | 3×385px slots | 10px gaps | footer 185px
  {
    id: 'strip3x1',
    name: 'Strip 3×1',
    emoji: '🎬',
    frameType: 'strip',
    canvasW: 480,
    canvasH: 1480,
    bgColor: '#ffffff',
    stripSlots: [
      { x: 20, y: 120, w: 440, h: 385 },
      { x: 20, y: 515, w: 440, h: 385 },
      { x: 20, y: 910, w: 440, h: 385 },
    ],
    drawBackground: (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 480, 1480);
    },
    drawForeground: (ctx, _isDuo) => {
      const W = 480;
      // Re-cover margins + gaps in white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, 120);          // header area
      ctx.fillRect(0, 505, W, 10);          // gap 1–2
      ctx.fillRect(0, 900, W, 10);          // gap 2–3
      ctx.fillRect(0, 1295, W, 185);        // footer area
      ctx.fillRect(0, 0, 20, 1480);         // left margin
      ctx.fillRect(W-20, 0, 20, 1480);      // right margin

      // Thin decorative lines
      const line = (y: number, w = W - 40, x = 20) => {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
      };
      ctx.strokeStyle = '#aaaaaa';
      ctx.lineWidth = 0.6;
      line(28);         // top header line
      line(108);        // bottom header line
      line(1300);       // top footer line
      line(1456);       // bottom footer line

      // Vertical divider in header (left third & right third corners for date/year)
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(W/2, 28); ctx.lineTo(W/2, 72); ctx.stroke();

      // Date & year in header corners
      const now = new Date();
      ctx.fillStyle = '#666';
      ctx.font = '11px "Georgia", serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
        28, 56
      );
      ctx.textAlign = 'right';
      ctx.fillText(now.getFullYear().toString(), W - 28, 56);

      // Center title in header
      ctx.fillStyle = '#222';
      ctx.font = 'italic 26px "Georgia", "Times New Roman", serif';
      ctx.textAlign = 'center';
      ctx.fillText('Photobooth', W / 2, 96);

      // Footer text
      ctx.fillStyle = '#555';
      ctx.font = '600 12px "Georgia", serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('✦ MEMORIES ✦', W / 2, 1390);
      ctx.letterSpacing = '0px';

      // Slot numbers (small, subtle)
      ctx.fillStyle = '#cccccc';
      ctx.font = '10px "Georgia", serif';
      [120, 515, 910].forEach((y, i) => {
        ctx.textAlign = 'right';
        ctx.fillText(`${i + 1}`, W - 24, y + 370);
      });
    },
  },
];
