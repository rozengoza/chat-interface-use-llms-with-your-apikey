import { useEffect, useRef, useState, useCallback } from "react";
import ShatterEffect from "./ShatterEffect";
import SlashTrail from "./SlashTrail";

const STAR_SVG = (
  <svg viewBox="0 0 512 512" aria-hidden="true" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
    <path fill="currentColor" d="M277.95 333.754c-18.707 5.27-39.12 3.777-57.213-5.024-8.2 15.105-12.253 34.398-14.837 55.104L24.977 477.958c41.176-120.353 94.123-176.934 153.265-200.01-5.278-18.693-3.76-39.107 5.024-57.207-15.113-8.19-34.397-12.236-55.12-14.843L34.038 24.973c120.345 41.192 176.92 94.13 199.987 153.273 18.7-5.27 39.115-3.753 57.214 5.008 8.215-15.09 12.253-34.374 14.844-55.112l180.94-94.116c-41.193 120.37-94.148 176.95-153.29 200.02 5.27 18.7 3.777 39.113-5.016 57.213 15.113 8.215 34.398 12.236 55.112 14.828l94.14 180.94c-120.392-41.208-176.95-94.132-200.02-153.274zm-16.66-36.538c22.752-2.916 38.837-23.756 35.922-46.51-2.924-22.768-23.74-38.83-46.517-35.922-22.745 2.916-38.83 23.733-35.907 46.493 2.908 22.76 23.733 38.846 46.5 35.94z"/>
  </svg>
);

/* ── Physics ── */
const GRAVITY = 0.55;
const FRICTION = 0.99;
const SPIN_FRICTION = 0.998;
const SIZE = 64;
const HALF = SIZE / 2;
const REST_VEL = 0.3;
const FLICK_THRESHOLD = 4;

interface Pos { x: number; y: number; }
interface Shatter { id: number; x: number; y: number; wall: number; color: string; }
interface Spray { id: number; x: number; y: number; dx: number; dy: number; color: string; }
interface Trail { id: number; sx: number; sy: number; ex: number; ey: number; color: string; }

export default function NinjaStar() {
  /* ── Theme ── */
  const [color, setColor] = useState("#d1d5db");
  const colorRef = useRef("#d1d5db");
  useEffect(() => {
    const update = () => {
      const t = document.documentElement.getAttribute("data-theme");
      const c = t === "light" ? "#1e3a5f" : "#d1d5db";
      setColor(c); colorRef.current = c;
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  /* ── Effects state ── */
  const [shatters, setShatters] = useState<Shatter[]>([]);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [sprays, setSprays] = useState<Spray[]>([]);
  const sid = useRef(0);

  const spawnShatter = useCallback((x: number, y: number, wall: number) => {
    const id = ++sid.current;
    setShatters(prev => [...prev, { id, x, y, wall, color: colorRef.current }]);
    setTimeout(() => setShatters(prev => prev.filter(s => s.id !== id)), 3000);
  }, []);

  const spawnSpray = useCallback((x: number, y: number, dx: number, dy: number) => {
    const id = ++sid.current;
    setSprays(prev => [...prev, { id, x, y, dx, dy, color: colorRef.current }]);
    setTimeout(() => setSprays(prev => prev.filter(s => s.id !== id)), 700);
  }, []);

  const el = useRef<HTMLDivElement>(null);
  const p = useRef<Pos>({ x: 0, y: 0 });
  const prevPos = useRef<Pos>({ x: 0, y: 0 });
  const v = useRef<Pos>({ x: 0, y: 0 });
  const flick = useRef<Pos>({ x: 0, y: 0 });
  const ang = useRef(0);
  const angV = useRef(0);
  const drag = useRef(false);
  const rest = useRef(true);
  const off = useRef<Pos>({ x: 0, y: 0 });
  const id = useRef(0);
  const alive = useRef(true);

  const sync = useCallback(() => {
    const t = el.current;
    if (!t) return;
    t.style.transform = `translate3d(${p.current.x - HALF}px,${p.current.y - HALF}px,0) rotate(${ang.current}deg)`;
  }, []);

  /* ── Physics tick ── */
  const tick = useCallback(() => {
    if (!alive.current) return;
    const pw = window.innerWidth, ph = window.innerHeight;

    if (drag.current) { id.current = requestAnimationFrame(tick); return; }
    if (rest.current) { sync(); id.current = requestAnimationFrame(tick); return; }

    const spd = Math.sqrt(v.current.x * v.current.x + v.current.y * v.current.y);
    if (spd < REST_VEL) {
      v.current.x = 0; v.current.y = 0; angV.current = 0;
      rest.current = true;
      if (p.current.y + HALF >= ph - 2) p.current.y = ph - HALF;
      if (p.current.x + HALF >= pw - 2) p.current.x = pw - HALF;
      if (p.current.x - HALF <= 2) p.current.x = HALF;
      if (p.current.y - HALF <= 2) p.current.y = HALF;
      sync(); id.current = requestAnimationFrame(tick); return;
    }

    // ── Fruit Ninja slash trail + spray ──
    if (spd > 1.5) {
      const trailId = ++sid.current;
      setTrails(prev => [...prev, { id: trailId, sx: prevPos.current.x, sy: prevPos.current.y, ex: p.current.x, ey: p.current.y, color: colorRef.current }]);
      setTimeout(() => setTrails(prev => prev.filter(t => t.id !== trailId)), 500);

      // Spray perpendicular to movement
      const len = Math.sqrt(v.current.x * v.current.x + v.current.y * v.current.y);
      if (len > 2) {
        const perpX = -v.current.y / len;
        const perpY = v.current.x / len;
        for (let i = 0; i < 2; i++) {
          const spread = (Math.random() - 0.5) * 0.8;
          spawnSpray(
            p.current.x + (Math.random() - 0.5) * 8,
            p.current.y + (Math.random() - 0.5) * 8,
            perpX * (3 + Math.random() * 5) + spread,
            perpY * (3 + Math.random() * 5) + spread - 1,
          );
        }
      }
    }

    prevPos.current = { x: p.current.x, y: p.current.y };

    v.current.y += GRAVITY;
    v.current.x *= FRICTION;
    v.current.y *= FRICTION;
    angV.current *= SPIN_FRICTION;

    // Wall/floor stick with shatter
    if (p.current.x - HALF < 0) { p.current.x = HALF; v.current.x = 0; v.current.y = 0; angV.current = 0; rest.current = true; spawnShatter(0, p.current.y, 1); sync(); id.current = requestAnimationFrame(tick); return; }
    if (p.current.x + HALF > pw) { p.current.x = pw - HALF; v.current.x = 0; v.current.y = 0; angV.current = 0; rest.current = true; spawnShatter(pw, p.current.y, 0); sync(); id.current = requestAnimationFrame(tick); return; }
    if (p.current.y - HALF < 0) { p.current.y = HALF; v.current.x = 0; v.current.y = 0; angV.current = 0; rest.current = true; spawnShatter(p.current.x, 0, 3); sync(); id.current = requestAnimationFrame(tick); return; }
    if (p.current.y + HALF > ph) { p.current.y = ph - HALF; v.current.x = 0; v.current.y = 0; angV.current = 0; rest.current = true; spawnShatter(p.current.x, ph, 2); sync(); id.current = requestAnimationFrame(tick); return; }

    p.current.x += v.current.x;
    p.current.y += v.current.y;
    ang.current += angV.current * 0.4;

    sync();
    id.current = requestAnimationFrame(tick);
  }, [sync, spawnShatter, spawnSpray]);

  useEffect(() => {
    alive.current = true;
    p.current = { x: window.innerWidth - 120, y: window.innerHeight - 140 };
    prevPos.current = { ...p.current };
    v.current = { x: 0, y: 0 }; angV.current = 0; rest.current = true;
    sync();
    id.current = requestAnimationFrame(tick);
    return () => { alive.current = false; cancelAnimationFrame(id.current); };
  }, [tick, sync]);

  /* ── Grab ── */
  const onDown = useCallback((e: React.PointerEvent) => {
    const t = el.current;
    if (!t) return;
    t.setPointerCapture(e.pointerId);
    drag.current = true; rest.current = false;
    const r = t.getBoundingClientRect();
    off.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    v.current = { x: 0, y: 0 }; flick.current = { x: 0, y: 0 }; angV.current = 0;
  }, []);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current) return;
    const nx = e.clientX - off.current.x + HALF;
    const ny = e.clientY - off.current.y + HALF;
    flick.current = { x: nx - p.current.x, y: ny - p.current.y };
    prevPos.current = { x: p.current.x, y: p.current.y };
    p.current.x = nx; p.current.y = ny;
    const w = window.innerWidth, h = window.innerHeight;
    p.current.x = Math.max(HALF, Math.min(w - HALF, p.current.x));
    p.current.y = Math.max(HALF, Math.min(h - HALF, p.current.y));
    sync();
  }, [sync]);

  const onUp = useCallback(() => {
    drag.current = false;
    const fspd = Math.sqrt(flick.current.x * flick.current.x + flick.current.y * flick.current.y);
    if (fspd > FLICK_THRESHOLD) {
      v.current.x = flick.current.x * 1.8;
      v.current.y = flick.current.y * 1.8;
      angV.current = (flick.current.x >= 0 ? 1 : -1) * (fspd * 1.2 + 12);
    } else {
      v.current.x = 0; v.current.y = 1; angV.current = 0;
    }
  }, []);

  const onClick = useCallback(() => {
    if (drag.current || !rest.current) return;
    const pw = window.innerWidth, ph = window.innerHeight;
    const edge = p.current.x <= HALF + 2 || p.current.x >= pw - HALF - 2 ||
                 p.current.y <= HALF + 2 || p.current.y >= ph - HALF - 2;
    if (!edge) return;
    rest.current = false;
    const dir = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5);
    v.current.x = dir * 14;
    v.current.y = -28;
    angV.current = dir * (45 + Math.random() * 15);
  }, []);

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[900] select-none overflow-hidden" aria-hidden="true">
        <div
          ref={el}
          role="button"
          tabIndex={0}
          aria-label="Ninja star"
          onClick={onClick}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          className="pointer-events-auto absolute h-[52px] w-[52px] cursor-grab touch-none drop-shadow-[0_8px_12px_rgba(0,0,0,0.4)] active:cursor-grabbing sm:h-16 sm:w-16"
          style={{ transform: "translate3d(0, 0, 0)", color }}
        >
          {STAR_SVG}
        </div>
      </div>
      {trails.map(t => (
        <SlashTrail key={t.id} sx={t.sx} sy={t.sy} ex={t.ex} ey={t.ey} color={t.color} />
      ))}
      {sprays.map(s => (
        <SprayBurst key={s.id} x={s.x} y={s.y} dx={s.dx} dy={s.dy} color={s.color} />
      ))}
      {shatters.map(s => (
        <ShatterEffect key={s.id} x={s.x} y={s.y} wall={s.wall} color={s.color} />
      ))}
    </>
  );
}

/* ── Spray burst particle ── */
function SprayBurst({ x, y, dx, dy, color }: { x: number; y: number; dx: number; dy: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const d = document.createElement("div");
    const size = 2 + Math.random() * 3;
    d.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color};border-radius:50%;pointer-events:none;z-index:997;opacity:0.8;`;
    document.body.appendChild(d);

    const start = performance.now();
    const dur = 500 + Math.random() * 200;
    let animId: number;
    const tick = () => {
      const t = Math.min((performance.now() - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 1.5);
      const px = dx * ease * 40;
      const py = dy * ease * 40 + 0.5 * ease * ease * 80;
      d.style.transform = `translate(${px}px,${py}px)`;
      d.style.opacity = String(Math.max(0, 0.8 * (1 - t)));
      if (t < 1) animId = requestAnimationFrame(tick);
      else d.remove();
    };
    animId = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(animId); d.remove(); };
  }, [x, y, dx, dy]);

  return null;
}
