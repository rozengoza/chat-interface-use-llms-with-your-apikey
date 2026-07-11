import { useEffect, useRef } from "react";

interface Props {
  x: number;
  y: number;
  /** 0=right, 1=left, 2=bottom, 3=top */
  wall: number;
  color: string;
}

interface Seg { x1: number; y1: number; x2: number; y2: number; w: number; }
interface Shard {
  x: number; y: number;
  vx: number; vy: number;
  rot: number; rv: number;
  w: number; h: number;
}

/**
 * Glass shatter — deep spiderweb cracks + flying glass splinters.
 * Cracks fade over ~3s, shards fly and fade over ~1.5s.
 */
export default function ShatterEffect({ x, y, wall, color }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    /* ── Biased angle helper ── */
    const biasAngle = (): number => {
      const spread = 1.6;
      switch (wall) {
        case 0: return Math.PI + (Math.random() - 0.5) * spread;
        case 1: return (Math.random() - 0.5) * spread;
        case 2: return -Math.PI / 2 + (Math.random() - 0.5) * spread;
        case 3: return Math.PI / 2 + (Math.random() - 0.5) * spread;
        default: return Math.random() * Math.PI * 2;
      }
    };

    /* ── Glass fracture: radial cracks in all directions ── */
    const segs: Seg[] = [];
    const SCALE = 1.6;
    const angles: number[] = [];

    // Evenly space primary cracks around the full circle with slight randomness
    const primary = 7 + Math.floor(Math.random() * 3);
    for (let i = 0; i < primary; i++) {
      const base = (i / primary) * Math.PI * 2;
      angles.push(base + (Math.random() - 0.5) * (Math.PI / primary));
    }

    // Primary cracks — thick at center, taper to hairline
    for (const a of angles) {
      const len = (14 + Math.random() * 20) * SCALE;
      const pts = 2 + Math.floor(Math.random() * 2);
      let px = 0, py = 0;
      for (let s = 0; s < pts; s++) {
        const t = (s + 1) / pts;
        const straight = Math.cos(a) * len * t;
        const offY = Math.sin(a) * len * t;
        // Keep cracks very straight — glass fractures are linear
        const nx = straight + (Math.random() - 0.5) * 2;
        const ny = offY + (Math.random() - 0.5) * 2;
        const w = Math.max(0.3, 2.8 - s * 0.9);
        segs.push({ x1: px, y1: py, x2: nx, y2: ny, w });
        px = nx; py = ny;
      }

      // 1-2 short branch cracks off the middle of primary rays
      const bc = 1 + Math.floor(Math.random() * 2);
      for (let b = 0; b < bc; b++) {
        const ba = a + (Math.random() - 0.5) * 1.0;
        const bl = (4 + Math.random() * 10) * SCALE;
        const bw = 0.4 + Math.random() * 0.4;
        const midR = len * (0.3 + Math.random() * 0.3);
        segs.push({
          x1: Math.cos(a) * midR + (Math.random() - 0.5) * 2,
          y1: Math.sin(a) * midR + (Math.random() - 0.5) * 2,
          x2: Math.cos(a) * midR + Math.cos(ba) * bl,
          y2: Math.sin(a) * midR + Math.sin(ba) * bl,
          w: bw,
        });
      }
    }

    // Secondary cracks — interleaved between primaries, shorter and thinner
    const secondary = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < secondary; i++) {
      const a = (i / secondary) * Math.PI * 2 + (Math.random() - 0.5) * (Math.PI / secondary) + (Math.PI / primary / 2);
      const len = (6 + Math.random() * 12) * SCALE;
      const w = Math.max(0.2, 1.4 - (Math.random() * 0.4));
      const nx = Math.cos(a) * len + (Math.random() - 0.5) * 1.5;
      const ny = Math.sin(a) * len + (Math.random() - 0.5) * 1.5;
      segs.push({ x1: 0, y1: 0, x2: nx, y2: ny, w });
    }

    // Cross-cracks connecting adjacent primary rays (the classic web)
    for (let i = 0; i < angles.length; i++) {
      const next = (i + 1) % angles.length;
      if (Math.random() > 0.6) continue;
      const r = (5 + Math.random() * 10) * SCALE;
      segs.push({
        x1: Math.cos(angles[i]) * r + (Math.random() - 0.5) * 2,
        y1: Math.sin(angles[i]) * r + (Math.random() - 0.5) * 2,
        x2: Math.cos(angles[next]) * r + (Math.random() - 0.5) * 2,
        y2: Math.sin(angles[next]) * r + (Math.random() - 0.5) * 2,
        w: 0.3,
      });
    }

    // A few more cross-cracks at a larger radius
    for (let i = 0; i < angles.length; i++) {
      const next = (i + 2) % angles.length;
      if (Math.random() > 0.5) continue;
      const r = (12 + Math.random() * 8) * SCALE;
      segs.push({
        x1: Math.cos(angles[i]) * r + (Math.random() - 0.5) * 3,
        y1: Math.sin(angles[i]) * r + (Math.random() - 0.5) * 3,
        x2: Math.cos(angles[next]) * r + (Math.random() - 0.5) * 3,
        y2: Math.sin(angles[next]) * r + (Math.random() - 0.5) * 3,
        w: 0.2,
      });
    }

    /* ── Build cracks SVG ── */
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const viewSize = 100 * SCALE;
    svg.setAttribute("viewBox", `${-viewSize / 2} ${-viewSize / 2} ${viewSize} ${viewSize}`);
    svg.style.cssText = `position:absolute;left:${-viewSize / 2}px;top:${-viewSize / 2}px;width:${viewSize}px;height:${viewSize}px;pointer-events:none;overflow:visible;`;

    for (const seg of segs) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(seg.x1));
      line.setAttribute("y1", String(seg.y1));
      line.setAttribute("x2", String(seg.x2));
      line.setAttribute("y2", String(seg.y2));
      line.setAttribute("stroke", color);
      line.setAttribute("stroke-width", String(seg.w));
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("opacity", "0.7");
      svg.appendChild(line);
    }

    // Impact crater (small dark circle)
    const crater = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    crater.setAttribute("cx", "0");
    crater.setAttribute("cy", "0");
    crater.setAttribute("r", "2.5");
    crater.setAttribute("fill", color);
    crater.setAttribute("opacity", "0.4");
    svg.appendChild(crater);

    root.appendChild(svg);

    /* ── 2. FLYING GLASS SHARDS ── */
    const shards: Shard[] = [];
    const shardCount = 14 + Math.floor(Math.random() * 10);

    for (let i = 0; i < shardCount; i++) {
      const a = biasAngle() + (Math.random() - 0.5) * 0.8;
      const speed = 3 + Math.random() * 10;
      shards.push({
        x: 0, y: 0,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 2,
        rot: Math.random() * 360,
        rv: (Math.random() - 0.5) * 20,
        w: 2 + Math.random() * 5,
        h: 1 + Math.random() * 3,
      });
    }

    const shardEls: HTMLDivElement[] = [];
    for (const s of shards) {
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;left:0;top:0;pointer-events:none;
        width:${s.w}px;height:${s.h}px;
        background:${color};
        border-radius:${Math.random() > 0.6 ? "50%" : "0.5px"};
        opacity:0.85;
        transform-origin:center center;`;
      root.appendChild(d);
      shardEls.push(d);
    }

    /* ── Animation loop ── */
    let animId: number;
    const start = performance.now();
    const crackDuration = 2900;
    const shardDuration = 1400;

    const tick = () => {
      const elapsed = performance.now() - start;
      const ct = Math.min(elapsed / crackDuration, 1);
      const st = Math.min(elapsed / shardDuration, 1);

      // Cracks fade
      const crackOpacity = Math.max(0, 0.7 * (1 - Math.pow(1 - ct, 2)));
      svg.querySelectorAll("line, circle").forEach(el => {
        el.setAttribute("opacity", String(crackOpacity));
      });

      // Shards fly + fade
      for (let i = 0; i < shards.length; i++) {
        const s = shards[i];
        const d = shardEls[i];
        if (!d) continue;
        const ease = 1 - Math.pow(1 - Math.min(st * 1.5, 1), 1.8);
        const px = s.x + s.vx * ease * 55;
        const py = s.y + s.vy * ease * 55 + 0.5 * ease * ease * 120; // gravity
        const r = s.rot + s.rv * ease * 40;
        d.style.transform = `translate(${px}px,${py}px) rotate(${r}deg)`;
        d.style.opacity = String(Math.max(0, 0.85 * (1 - ease)));
      }

      if (ct < 1 || st < 1) {
        animId = requestAnimationFrame(tick);
      } else {
        svg.remove();
        shardEls.forEach(d => d.remove());
      }
    };
    animId = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(animId); svg.remove(); shardEls.forEach(d => d.remove()); };
  }, [x, y, wall, color]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      style={{ position: "fixed", left: x, top: y, pointerEvents: "none", zIndex: 999 }}
    />
  );
}
