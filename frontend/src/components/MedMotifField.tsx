import { useEffect, useRef } from 'react';

type Kind = 'capsule' | 'tablet' | 'sphere';
type Layer = 0 | 1 | 2;

interface ColorPair {
  a: string;
  b: string;
  shadeA: string;
  shadeB: string;
}

interface PillPalette {
  pairs: ColorPair[];
  solids: { fill: string; shade: string }[];
  stroke: string;
  highlight: string;
  score: string;
  rim: string;
}

/** Light UI — slightly softer strokes; clarity without busyness */
const PALETTE_LIGHT: PillPalette = {
  pairs: [
    { a: '#ef4444', b: '#ffffff', shadeA: '#b91c1c', shadeB: '#cbd5e1' },
    { a: '#facc15', b: '#fb923c', shadeA: '#ca8a04', shadeB: '#c2410c' },
    { a: '#2dd4bf', b: '#ffffff', shadeA: '#0d9488', shadeB: '#cbd5e1' },
    { a: '#22c55e', b: '#fef08a', shadeA: '#15803d', shadeB: '#ca8a04' },
    { a: '#ffffff', b: '#e2e8f0', shadeA: '#cbd5e1', shadeB: '#94a3b8' },
    { a: '#f97316', b: '#ffffff', shadeA: '#c2410c', shadeB: '#e2e8f0' },
    { a: '#38bdf8', b: '#fef08a', shadeA: '#0284c7', shadeB: '#ca8a04' },
  ],
  solids: [
    { fill: '#ffffff', shade: '#cbd5e1' },
    { fill: '#fecaca', shade: '#dc2626' },
    { fill: '#fef08a', shade: '#ca8a04' },
    { fill: '#99f6e4', shade: '#0d9488' },
    { fill: '#e2e8f0', shade: '#64748b' },
  ],
  stroke: 'rgba(71, 85, 105, 0.32)',
  highlight: 'rgba(255, 255, 255, 0.55)',
  score: 'rgba(100, 116, 139, 0.45)',
  rim: 'rgba(15, 23, 42, 0.08)',
};

const PALETTE_DARK: PillPalette = {
  pairs: [
    { a: '#f87171', b: '#f8fafc', shadeA: '#b91c1c', shadeB: '#94a3b8' },
    { a: '#facc15', b: '#fb923c', shadeA: '#a16207', shadeB: '#c2410c' },
    { a: '#5eead4', b: '#f8fafc', shadeA: '#0f766e', shadeB: '#64748b' },
    { a: '#86efac', b: '#fef08a', shadeA: '#166534', shadeB: '#a16207' },
    { a: '#f8fafc', b: '#cbd5e1', shadeA: '#94a3b8', shadeB: '#475569' },
    { a: '#fdba74', b: '#f8fafc', shadeA: '#c2410c', shadeB: '#64748b' },
    { a: '#7dd3fc', b: '#fef9c3', shadeA: '#0369a1', shadeB: '#a16207' },
  ],
  solids: [
    { fill: '#f8fafc', shade: '#64748b' },
    { fill: '#fca5a5', shade: '#991b1b' },
    { fill: '#fde047', shade: '#a16207' },
    { fill: '#5eead4', shade: '#0f766e' },
    { fill: '#a7f3d0', shade: '#047857' },
  ],
  stroke: 'rgba(148, 163, 184, 0.38)',
  highlight: 'rgba(255, 255, 255, 0.65)',
  score: 'rgba(203, 213, 225, 0.5)',
  rim: 'rgba(56, 189, 248, 0.35)',
};

interface Motif {
  bx: number;
  by: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRot: number;
  rot: number;
  vr: number;
  kind: Kind;
  size: number;
  phase: number;
  phase2: number;
  phase3: number;
  colorIdx: number;
  wobbleHz: number;
  tumbleHz: number;
  layer: Layer;
}

function layerDriftMul(layer: Layer) {
  return layer === 0 ? 0.48 : layer === 1 ? 0.72 : 1;
}

function layerOpacity(layer: Layer) {
  return layer === 0 ? 0.34 : layer === 1 ? 0.52 : 0.78;
}

function layerScale(layer: Layer) {
  return layer === 0 ? 0.74 : layer === 1 ? 0.9 : 1.12;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function pickLayer(): Layer {
  const u = Math.random();
  if (u < 0.38) return 0;
  if (u < 0.78) return 1;
  return 2;
}

function createMotifs(w: number, h: number): Motif[] {
  const area = w * h;
  const n = Math.min(22, Math.max(10, Math.floor(area / 52000)));
  const out: Motif[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    const kind: Kind = r < 0.52 ? 'capsule' : r < 0.88 ? 'tablet' : 'sphere';
    const layer = pickLayer();
    const baseRot = (Math.random() - 0.5) * 0.85;
    out.push({
      bx: Math.random() * w,
      by: Math.random() * h,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      baseRot,
      rot: baseRot,
      vr: 0,
      kind,
      size: 1.0 + Math.random() * 0.95,
      phase: Math.random() * Math.PI * 2,
      phase2: Math.random() * Math.PI * 2,
      phase3: Math.random() * Math.PI * 2,
      colorIdx: Math.floor(Math.random() * 24),
      wobbleHz: 0.28 + Math.random() * 0.45,
      tumbleHz: 0.2 + Math.random() * 0.35,
      layer,
    });
  }
  out.forEach(m => {
    m.x = m.bx;
    m.y = m.by;
  });
  out.sort((a, b) => a.layer - b.layer);
  return out;
}

function capsulePath(ctx: CanvasRenderingContext2D, pw: number, ph: number) {
  const r = ph / 2;
  ctx.beginPath();
  ctx.moveTo(-pw / 2 + r, -ph / 2);
  ctx.lineTo(pw / 2 - r, -ph / 2);
  ctx.arc(pw / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(-pw / 2 + r, ph / 2);
  ctx.arc(-pw / 2 + r, 0, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
}

function verticalShadeGradient(
  ctx: CanvasRenderingContext2D,
  light: string,
  dark: string,
  halfW: number,
  ph: number,
  offsetX: number,
) {
  const g = ctx.createLinearGradient(offsetX - halfW, -ph / 2, offsetX - halfW, ph / 2);
  g.addColorStop(0, light);
  g.addColorStop(0.45, light);
  g.addColorStop(1, dark);
  return g;
}

function drawCapsule(
  ctx: CanvasRenderingContext2D,
  pw: number,
  ph: number,
  pair: ColorPair,
  pal: PillPalette,
  pulse: number,
  rimStrength: number,
) {
  const r = ph / 2;
  const hw = pw / 2;

  const drawHalf = (sign: -1 | 1) => {
    ctx.beginPath();
    if (sign < 0) {
      ctx.moveTo(0, -ph / 2);
      ctx.lineTo(-hw + r, -ph / 2);
      ctx.arc(-hw + r, 0, r, -Math.PI / 2, Math.PI / 2, true);
      ctx.lineTo(0, ph / 2);
    } else {
      ctx.moveTo(0, -ph / 2);
      ctx.lineTo(hw - r, -ph / 2);
      ctx.arc(hw - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
      ctx.lineTo(0, ph / 2);
    }
    ctx.closePath();
  };

  ctx.save();
  ctx.scale(pulse, pulse);

  drawHalf(-1);
  ctx.fillStyle = verticalShadeGradient(ctx, pair.a, pair.shadeA, hw * 0.5, ph, -hw * 0.5);
  ctx.fill();

  drawHalf(1);
  ctx.fillStyle = verticalShadeGradient(ctx, pair.b, pair.shadeB, hw * 0.5, ph, hw * 0.5);
  ctx.fill();

  capsulePath(ctx, pw, ph);
  ctx.strokeStyle = pal.stroke;
  ctx.lineWidth = 1.05;
  ctx.stroke();

  if (rimStrength > 0.04) {
    ctx.strokeStyle = pal.rim;
    ctx.lineWidth = 1.8 + rimStrength * 0.9;
    ctx.globalAlpha = 0.5 * rimStrength;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.beginPath();
  ctx.ellipse(0, -ph * 0.22, pw * 0.3, ph * 0.25, 0, 0, Math.PI * 2);
  ctx.fillStyle = pal.highlight;
  ctx.globalAlpha = 0.24;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawTablet(
  ctx: CanvasRenderingContext2D,
  radius: number,
  solid: { fill: string; shade: string },
  pal: PillPalette,
  pulse: number,
  rimStrength: number,
) {
  ctx.save();
  ctx.scale(pulse, pulse);
  const g = ctx.createRadialGradient(
    -radius * 0.35,
    -radius * 0.35,
    radius * 0.08,
    0,
    0,
    radius * 1.05,
  );
  g.addColorStop(0, solid.fill);
  g.addColorStop(0.55, solid.fill);
  g.addColorStop(1, solid.shade);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = pal.stroke;
  ctx.lineWidth = 1.05;
  ctx.stroke();
  if (rimStrength > 0.04) {
    ctx.strokeStyle = pal.rim;
    ctx.lineWidth = 1.6 + rimStrength * 0.8;
    ctx.globalAlpha = 0.42 * rimStrength;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = pal.score;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.36, 0);
  ctx.lineTo(radius * 0.36, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-radius * 0.14, -radius * 0.26, radius * 0.38, radius * 0.2, -0.35, 0, Math.PI * 2);
  ctx.fillStyle = pal.highlight;
  ctx.globalAlpha = 0.2;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawSphere(
  ctx: CanvasRenderingContext2D,
  radius: number,
  solid: { fill: string; shade: string },
  pal: PillPalette,
  pulse: number,
  rimStrength: number,
) {
  ctx.save();
  ctx.scale(pulse, pulse);
  const g = ctx.createRadialGradient(
    -radius * 0.42,
    -radius * 0.48,
    0,
    0,
    0,
    radius * 1.15,
  );
  g.addColorStop(0, pal.highlight);
  g.addColorStop(0.18, solid.fill);
  g.addColorStop(0.7, solid.fill);
  g.addColorStop(1, solid.shade);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = pal.stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
  if (rimStrength > 0.04) {
    ctx.strokeStyle = pal.rim;
    ctx.lineWidth = 1.5 + rimStrength * 0.7;
    ctx.globalAlpha = 0.38 * rimStrength;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawMotif(
  ctx: CanvasRenderingContext2D,
  m: Motif,
  t: number,
  pal: PillPalette,
  pulse: number,
  rimStrength: number,
  layerAlpha: number,
) {
  const ls = layerScale(m.layer);
  const base = 13.5 * m.size * ls;
  const wobble =
    Math.sin(t * m.wobbleHz + m.phase) * 0.048 +
    Math.sin(t * m.wobbleHz * 1.55 + m.phase3) * 0.016;
  const tumble = 1 + 0.075 * Math.sin(t * m.tumbleHz + m.phase2);

  ctx.save();
  ctx.globalAlpha = layerAlpha;
  ctx.translate(m.x, m.y);
  ctx.rotate(m.rot + wobble);
  ctx.scale(tumble, 1);

  const pair = pal.pairs[m.colorIdx % pal.pairs.length]!;
  const solid = pal.solids[m.colorIdx % pal.solids.length]!;

  switch (m.kind) {
    case 'capsule': {
      const pw = base * 2.4;
      const ph = base * 0.74;
      drawCapsule(ctx, pw, ph, pair, pal, pulse, rimStrength);
      break;
    }
    case 'tablet': {
      drawTablet(ctx, base * 0.52, solid, pal, pulse, rimStrength);
      break;
    }
    case 'sphere':
      drawSphere(ctx, base * 0.44, solid, pal, pulse, rimStrength);
      break;
  }
  ctx.restore();
}

type Props = { isDark: boolean };

export default function MedMotifField({ isDark }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -99999, y: -99999 });
  const smoothMouseRef = useRef({ x: -99999, y: -99999 });
  const motifsRef = useRef<Motif[]>([]);
  const rafRef = useRef(0);
  const logicalRef = useRef({ w: 0, h: 0 });
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const { width: rw, height: rh } = parent.getBoundingClientRect();
      const w = Math.max(80, Math.floor(rw));
      const h = Math.max(80, Math.floor(rh));
      logicalRef.current = { w, h };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      motifsRef.current = createMotifs(w, h);
      smoothMouseRef.current = { x: w / 2, y: h / 2 };
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const setMouse = (cx: number, cy: number) => {
      mouseRef.current.x = cx;
      mouseRef.current.y = cy;
    };

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      setMouse(e.clientX - r.left, e.clientY - r.top);
    };

    const onTouch = (e: TouchEvent) => {
      const t0 = e.touches[0];
      if (!t0) return;
      const r = canvas.getBoundingClientRect();
      setMouse(t0.clientX - r.left, t0.clientY - r.top);
    };

    const onLeave = () => setMouse(-99999, -99999);

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    canvas.addEventListener('mouseleave', onLeave);

    let last = performance.now();
    const radius = 200;
    const maxPush = 36;
    const springPos = 38;
    const dampVel = 8.8;
    const springRot = 24;
    const dampRot = 11.2;
    const mouseSmooth = 11;

    const loop = (now: number) => {
      const rawDt = (now - last) / 1000;
      last = now;
      const dt = Math.min(rawDt, 0.055);

      const { w, h } = logicalRef.current;
      if (w < 1) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const { x: mx, y: my } = mouseRef.current;
      const sm = smoothMouseRef.current;
      const active = mx > -5000;
      const targetSx = active ? mx : w * 0.5;
      const targetSy = active ? my : h * 0.5;
      const ms = 1 - Math.exp(-mouseSmooth * dt);
      sm.x += (targetSx - sm.x) * ms;
      sm.y += (targetSy - sm.y) * ms;

      const smx = sm.x;
      const smy = sm.y;
      const t = now / 1000;
      const pal = isDarkRef.current ? PALETTE_DARK : PALETTE_LIGHT;

      ctx.clearRect(0, 0, w, h);

      for (const m of motifsRef.current) {
        const dm = layerDriftMul(m.layer);
        const driftX =
          (Math.sin(t * 0.34 + m.phase) * 1.15 + Math.sin(t * 0.21 + m.phase2) * 0.55) * dm;
        const driftY =
          (Math.cos(t * 0.31 + m.phase * 1.03) * 1.05 + Math.cos(t * 0.19 + m.phase2 * 1.08) * 0.48) *
          dm;

        let tx = m.bx + driftX;
        let ty = m.by + driftY;

        const dx = m.bx - smx;
        const dy = m.by - smy;
        const distAnchor = Math.hypot(dx, dy);
        if (active && distAnchor < radius && distAnchor > 0.5) {
          const u = smoothstep(radius * 0.18, radius, distAnchor);
          const influence = (1 - u) * (1 - u);
          const nx = dx / distAnchor;
          const ny = dy / distAnchor;
          tx += nx * maxPush * influence;
          ty += ny * maxPush * influence;
        }

        const ax = (tx - m.x) * springPos;
        const ay = (ty - m.y) * springPos;
        m.vx += ax * dt;
        m.vy += ay * dt;
        m.vx *= Math.exp(-dampVel * dt);
        m.vy *= Math.exp(-dampVel * dt);
        m.x += m.vx * dt;
        m.y += m.vy * dt;

        const distVis = Math.hypot(m.x - smx, m.y - smy);
        const curl =
          active && distAnchor < radius && distAnchor > 0.5
            ? ((radius - distAnchor) / radius) * 0.38
            : 0;
        const targetRot =
          m.baseRot +
          curl * Math.sin(t * 0.95 + m.phase) * 0.26 +
          Math.sin(t * 0.32 + m.phase3) * 0.028;

        const ar = (targetRot - m.rot) * springRot;
        m.vr += ar * dt;
        m.vr *= Math.exp(-dampRot * dt);
        m.rot += m.vr * dt;

        const pulse =
          active && distVis < radius ? 1 + (1 - smoothstep(0, radius, distVis)) * 0.06 : 1;

        const rimStrength =
          active && distVis < radius
            ? (1 - smoothstep(radius * 0.22, radius, distVis)) ** 1.4
            : 0;

        drawMotif(ctx, m, t, pal, pulse, rimStrength, layerOpacity(m.layer));
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('touchmove', onTouch);
      canvas.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.88] dark:opacity-[0.82]"
      aria-hidden
    />
  );
}
