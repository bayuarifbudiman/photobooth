export interface Frame {
  id: string;
  name: string;
  emoji: string;
  // CSS applied to the live preview overlay container
  previewStyle: React.CSSProperties;
  // Draw the frame on top of the already-rendered canvas
  drawOverlay: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export const frames: Frame[] = [
  {
    id: 'none',
    name: 'None',
    emoji: '⬜',
    previewStyle: {},
    drawOverlay: () => {},
  },

  {
    id: 'polaroid',
    name: 'Polaroid',
    emoji: '🖼️',
    previewStyle: {
      border: '18px solid #fff',
      borderBottomWidth: '70px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      background: 'transparent',
    },
    drawOverlay: (ctx, w, h) => {
      const b = Math.round(w * 0.03);
      const bBottom = Math.round(h * 0.14);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, b);
      ctx.fillRect(0, h - bBottom, w, bBottom);
      ctx.fillRect(0, 0, b, h);
      ctx.fillRect(w - b, 0, b, h);
      // Subtle drop shadow lines
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(b, h - bBottom, w - b * 2, 3);
    },
  },

  {
    id: 'neon',
    name: 'Neon',
    emoji: '✨',
    previewStyle: {
      border: '6px solid #ff00aa',
      boxShadow:
        '0 0 12px #ff00aa, 0 0 30px #ff00aa, inset 0 0 12px rgba(0,238,255,0.3)',
      outline: '3px solid #00eeff',
      outlineOffset: '-9px',
    },
    drawOverlay: (ctx, w, h) => {
      const thick = Math.round(w * 0.012);
      // Outer pink
      ctx.save();
      ctx.shadowColor = '#ff00aa';
      ctx.shadowBlur = 24;
      ctx.strokeStyle = '#ff00aa';
      ctx.lineWidth = thick;
      ctx.strokeRect(thick / 2, thick / 2, w - thick, h - thick);
      // Inner cyan
      ctx.shadowColor = '#00eeff';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = '#00eeff';
      ctx.lineWidth = thick * 0.6;
      const gap = thick * 2.5;
      ctx.strokeRect(gap, gap, w - gap * 2, h - gap * 2);
      ctx.restore();
    },
  },

  {
    id: 'floral',
    name: 'Floral',
    emoji: '🌸',
    previewStyle: {
      border: '4px solid #f9a8d4',
      boxShadow: '0 0 0 8px rgba(249,168,212,0.15)',
    },
    drawOverlay: (ctx, w, h) => {
      function drawPetal(
        cx: number, cy: number, angle: number, size: number
      ) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.6, size * 0.3, size * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(249,168,212,0.85)';
        ctx.fill();
        ctx.restore();
      }
      function drawFlower(cx: number, cy: number, size: number) {
        for (let i = 0; i < 6; i++) {
          drawPetal(cx, cy, (i * Math.PI * 2) / 6, size);
        }
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = '#fde68a';
        ctx.fill();
      }
      function drawLeaf(cx: number, cy: number, angle: number, size: number) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.5, size * 0.2, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(134,239,172,0.8)';
        ctx.fill();
        ctx.restore();
      }
      const s = Math.min(w, h) * 0.07;
      // Corners
      const corners = [
        [s * 1.2, s * 1.2],
        [w - s * 1.2, s * 1.2],
        [s * 1.2, h - s * 1.2],
        [w - s * 1.2, h - s * 1.2],
      ] as [number, number][];
      const leafAngles = [
        [Math.PI * 0.25, Math.PI * -0.25],
        [Math.PI * 0.75, Math.PI * 1.25],
        [Math.PI * -0.25, Math.PI * 0.25],
        [Math.PI * 1.25, Math.PI * 0.75],
      ];
      corners.forEach(([cx, cy], i) => {
        drawLeaf(cx - s * 0.5, cy, leafAngles[i][0], s * 0.8);
        drawLeaf(cx, cy - s * 0.5, leafAngles[i][1], s * 0.8);
        drawFlower(cx, cy, s);
      });
      // Thin pink border
      ctx.strokeStyle = 'rgba(249,168,212,0.6)';
      ctx.lineWidth = Math.max(2, w * 0.004);
      ctx.strokeRect(s * 0.4, s * 0.4, w - s * 0.8, h - s * 0.8);
    },
  },

  {
    id: 'filmstrip',
    name: 'Film',
    emoji: '🎞️',
    previewStyle: {
      borderLeft: '28px solid #111',
      borderRight: '28px solid #111',
      borderTop: '8px solid #111',
      borderBottom: '8px solid #111',
    },
    drawOverlay: (ctx, w, h) => {
      const strip = Math.round(w * 0.055);
      // Left & right black strips
      ctx.fillStyle = '#111111';
      ctx.fillRect(0, 0, strip, h);
      ctx.fillRect(w - strip, 0, strip, h);
      // Top & bottom thin bars
      const bar = Math.round(h * 0.015);
      ctx.fillRect(strip, 0, w - strip * 2, bar);
      ctx.fillRect(strip, h - bar, w - strip * 2, bar);
      // Sprocket holes
      const holeW = strip * 0.55;
      const holeH = holeW * 1.4;
      const holeX = (strip - holeW) / 2;
      const count = 8;
      const spacing = h / count;
      ctx.fillStyle = '#2a2a2a';
      for (let i = 0; i < count; i++) {
        const y = spacing * i + spacing * 0.3;
        drawRoundedRect(ctx, holeX, y, holeW, holeH, holeW * 0.2);
        ctx.fill();
        drawRoundedRect(ctx, w - strip + holeX, y, holeW, holeH, holeW * 0.2);
        ctx.fill();
      }
    },
  },

  {
    id: 'vintage',
    name: 'Vintage',
    emoji: '🏛️',
    previewStyle: {
      border: '10px solid #c8a96e',
      boxShadow:
        'inset 0 0 30px rgba(0,0,0,0.5), 0 0 0 3px #8b6914, 0 8px 24px rgba(0,0,0,0.4)',
      filter: 'saturate(0.85)',
    },
    drawOverlay: (ctx, w, h) => {
      // Sepia vignette gradient
      const vignette = ctx.createRadialGradient(
        w / 2, h / 2, h * 0.2,
        w / 2, h / 2, h * 0.85
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(40,20,0,0.55)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      // Gold border
      const b = Math.round(w * 0.018);
      ctx.strokeStyle = '#c8a96e';
      ctx.lineWidth = b;
      ctx.strokeRect(b / 2, b / 2, w - b, h - b);
      // Inner thin line
      ctx.strokeStyle = '#8b6914';
      ctx.lineWidth = Math.max(1, b * 0.3);
      const gap = b * 2;
      ctx.strokeRect(gap, gap, w - gap * 2, h - gap * 2);
    },
  },
];
