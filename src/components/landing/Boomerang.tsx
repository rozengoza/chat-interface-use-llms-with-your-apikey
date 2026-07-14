import { useEffect, useRef, useState, useCallback } from "react";

/**
 * A proper boomerang — the Inkscape SVG path.
 */
const BOOMERANG_SVG = (
  <svg viewBox="0 0 533.01 300.44" aria-hidden="true" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="m462.69 101.54c-56.25-43.123-171.33-105.78-244.18-99.183-72.58 11.95-157.65 143.63-180.73 177.25-32.87 53.56-45.01 92.48-28.69 114.37 28.09 20 77.36-30.18 103.17-58.45 26.72-27.88 69.5-90.99 133.6-122.1 30.24-13.51 123.23 33.43 149.51 44.55 51.14 23.58 103.31 62.55 131.06 42.45 17.9-19.44-17.78-69.9-63.74-98.89z"
    />
  </svg>
);

/* ── Physics ──
 *
 * How a real returning boomerang flies: its spin causes gyroscopic
 * precession, which turns the flight path at a rate set by the spin and
 * blade geometry — NOT by how hard it was thrown. The result is a path
 * of roughly constant curvature: a circle of fixed radius. Throw harder
 * and it goes around the same circle faster, not around a bigger circle.
 *
 * So the model here is: pick a RADIUS at launch (sized to fit the
 * viewport so the arc never hits a wall), then each frame rotate the
 * velocity by ω = speed / radius. Friction only slows the traversal —
 * the geometry stays a perfect circle that ends where it began.
 */

// Orbit mode (thrown)
const R_MIN = 90;            // tightest allowed arc, px
const R_MAX = 340;           // widest allowed arc, px
const SPEED_TO_R = 12;       // throw speed → desired radius (before clamping)
const MAX_LAUNCH_SPEED = 28; // px/frame — cap wild flicks
const MIN_ORBIT_SPEED = 5;   // a boomerang glides; it doesn't stall mid-air
const ARC_FRICTION = 0.999;  // affects flight duration only, not path shape
const HOMING = 0.02;         // pull toward the hand during the final stretch
const CATCH_DIST = 26;       // px — close enough to "catch"

// Free-fall mode (dropped, weak flick)
const FALL_GRAVITY = 0.35;
const FALL_FRICTION = 0.99;
const BOUNCE = 0.35;

// General
const SPIN_FRICTION = 0.997;
const SIZE = 64;
const HALF = SIZE / 2;
const REST_VEL = 0.3;
const FLICK_THRESHOLD = 3;

interface Pos {
  x: number;
  y: number;
}

export default function Boomerang() {
  /* ── Theme ── */
  const [color, setColor] = useState("#d1d5db");
  const colorRef = useRef("#d1d5db");
  useEffect(() => {
    const update = () => {
      const t = document.documentElement.getAttribute("data-theme");
      const c = t === "light" ? "#1e3a5f" : "#d1d5db";
      setColor(c);
      colorRef.current = c;
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);

  /* ── Refs ── */
  const el = useRef<HTMLDivElement>(null);
  const p = useRef<Pos>({ x: 0, y: 0 });
  const v = useRef<Pos>({ x: 0, y: 0 });
  const flick = useRef<Pos>({ x: 0, y: 0 });
  const ang = useRef(0);
  const angV = useRef(0);
  const drag = useRef(false);
  const rest = useRef(true);
  const off = useRef<Pos>({ x: 0, y: 0 });
  const id = useRef(0);
  const alive = useRef(true);

  /* ── Flight tracking ── */
  const origin = useRef<Pos>({ x: 0, y: 0 });
  const orbiting = useRef(false);
  const totalRot = useRef(0);      // Accumulated heading change; 2π = full loop
  const radius = useRef(160);      // Fixed arc radius for this flight
  const turnSign = useRef(1);      // +1 / -1 — which way this flight curves

  const sync = useCallback(() => {
    const t = el.current;
    if (!t) return;
    t.style.transform = `translate3d(${p.current.x - HALF}px,${p.current.y - HALF}px,0) rotate(${ang.current}deg)`;
  }, []);

  /* ── Physics tick ── */
  const tick = useCallback(() => {
    if (!alive.current) return;
    const pw = window.innerWidth;
    const ph = window.innerHeight;

    if (drag.current) {
      id.current = requestAnimationFrame(tick);
      return;
    }
    if (rest.current) {
      sync();
      id.current = requestAnimationFrame(tick);
      return;
    }

    /* ── ORBIT MODE (thrown) — constant-curvature arc, exact return ── */
    if (orbiting.current) {
      let speed = Math.sqrt(v.current.x * v.current.x + v.current.y * v.current.y);

      // A returning boomerang glides on lift — keep it from stalling.
      if (speed < MIN_ORBIT_SPEED) {
        const k = MIN_ORBIT_SPEED / Math.max(speed, 1e-3);
        v.current.x *= k;
        v.current.y *= k;
        speed = MIN_ORBIT_SPEED;
      }

      // === 1. Constant curvature: turn rate scales with speed ===
      // ω = speed / radius keeps the geometric circle fixed no matter
      // how fast or slow the boomerang is moving. (Exact rotation via
      // cos/sin — no shear drift.)
      const w = (turnSign.current * speed) / radius.current;
      const cos = Math.cos(w);
      const sin = Math.sin(w);
      const nvx = v.current.x * cos - v.current.y * sin;
      const nvy = v.current.x * sin + v.current.y * cos;
      v.current.x = nvx * ARC_FRICTION;
      v.current.y = nvy * ARC_FRICTION;
      totalRot.current += Math.abs(w);

      // === 2. Final stretch: home in on the thrower's hand ===
      if (totalRot.current > Math.PI * 1.7) {
        const dx = origin.current.x - p.current.x;
        const dy = origin.current.y - p.current.y;
        // Homing strengthens the longer it overshoots, so it always lands.
        const pull = HOMING * (totalRot.current > Math.PI * 2 ? 3 : 1);
        v.current.x += dx * pull;
        v.current.y += dy * pull;

        // === 3. Caught! Full loop done + back at the hand → rest ===
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (totalRot.current >= Math.PI * 2 && dist < CATCH_DIST) {
          p.current.x = origin.current.x;
          p.current.y = origin.current.y;
          v.current.x = 0;
          v.current.y = 0;
          angV.current = 0;
          rest.current = true;
          orbiting.current = false;
          sync();
          id.current = requestAnimationFrame(tick);
          return;
        }
      }

      // === 4. Safety walls ===
      // The radius is sized at launch so the arc fits on screen, so these
      // almost never fire — they only matter if the window is resized
      // mid-flight. Soft reflection, and homing will still bring it back.
      if (p.current.x - HALF < 0) { p.current.x = HALF; v.current.x = Math.abs(v.current.x) * 0.7; }
      if (p.current.x + HALF > pw) { p.current.x = pw - HALF; v.current.x = -Math.abs(v.current.x) * 0.7; }
      if (p.current.y - HALF < 0) { p.current.y = HALF; v.current.y = Math.abs(v.current.y) * 0.7; }
      if (p.current.y + HALF > ph) { p.current.y = ph - HALF; v.current.y = -Math.abs(v.current.y) * 0.7; }

      // Sprite spin eases off slightly over the flight
      angV.current *= 0.999;

    /* ── FREE-FALL MODE (dropped) — gravity + bounce, never orbits ── */
    } else {
      const spd = Math.sqrt(v.current.x * v.current.x + v.current.y * v.current.y);

      // Too slow → rest (only applies to free-fall; orbit ends via catch)
      if (spd < REST_VEL) {
        v.current.x = 0;
        v.current.y = 0;
        angV.current = 0;
        rest.current = true;
        p.current.x = Math.max(HALF, Math.min(pw - HALF, p.current.x));
        p.current.y = Math.max(HALF, Math.min(ph - HALF, p.current.y));
        sync();
        id.current = requestAnimationFrame(tick);
        return;
      }

      v.current.y += FALL_GRAVITY;
      v.current.x *= FALL_FRICTION;
      v.current.y *= FALL_FRICTION;
      angV.current *= SPIN_FRICTION;

      if (p.current.x - HALF < 0) { p.current.x = HALF; v.current.x = -v.current.x * BOUNCE; }
      if (p.current.x + HALF > pw) { p.current.x = pw - HALF; v.current.x = -v.current.x * BOUNCE; }
      if (p.current.y - HALF < 0) { p.current.y = HALF; v.current.y = -v.current.y * BOUNCE; }
      if (p.current.y + HALF > ph) { p.current.y = ph - HALF; v.current.y = -v.current.y * BOUNCE; }
    }

    p.current.x += v.current.x;
    p.current.y += v.current.y;
    ang.current += angV.current * 0.4;

    sync();
    id.current = requestAnimationFrame(tick);
  }, [sync]);

  useEffect(() => {
    alive.current = true;
    p.current = { x: window.innerWidth - 120, y: window.innerHeight - 140 };
    origin.current = { ...p.current };
    v.current = { x: 0, y: 0 };
    angV.current = 0;
    rest.current = true;
    orbiting.current = false;
    sync();
    id.current = requestAnimationFrame(tick);
    return () => {
      alive.current = false;
      cancelAnimationFrame(id.current);
    };
  }, [tick, sync]);

  /* ── Launch ── */
  const launchFrom = useCallback((x: number, y: number, vx: number, vy: number) => {
    let speed = Math.sqrt(vx * vx + vy * vy);
    if (speed < 0.01) return;

    // Cap wild flicks — a harder throw goes around FASTER, not FARTHER.
    if (speed > MAX_LAUNCH_SPEED) {
      const k = MAX_LAUNCH_SPEED / speed;
      vx *= k;
      vy *= k;
      speed = MAX_LAUNCH_SPEED;
    }
    const ux = vx / speed;
    const uy = vy / speed;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const M = HALF + 4;

    // For turn direction s (+1/-1), the arc is a circle through (x, y)
    // with center at (x - s·r·uy, y + s·r·ux). Find the largest radius
    // that keeps the whole circle inside the viewport — each screen edge
    // gives one linear constraint on r.
    const maxR = (s: number) => {
      let r = Infinity;
      const constraints: Array<[number, number]> = [
        [1 + s * uy, x - M],       // left edge
        [1 - s * uy, W - M - x],   // right edge
        [1 - s * ux, y - M],       // top edge
        [1 + s * ux, H - M - y],   // bottom edge
      ];
      for (const [d, lim] of constraints) {
        if (d > 1e-4) r = Math.min(r, lim / d);
      }
      return r;
    };

    // Curve toward whichever side has more room — throws from a corner
    // arc out into the open space instead of into the wall.
    const rCCW = maxR(1);
    const rCW = maxR(-1);
    const s = rCCW >= rCW ? 1 : -1;
    const rFit = Math.max(s === 1 ? rCCW : rCW, 40);

    // Desired size from throw strength, clamped to taste + screen fit.
    const r = Math.min(Math.max(speed * SPEED_TO_R, R_MIN), R_MAX, rFit);

    origin.current = { x, y };
    v.current = { x: vx, y: vy };
    turnSign.current = s;
    radius.current = r;
    totalRot.current = 0;
    // Sprite spin direction matches the curve direction — like real
    // gyroscopic precession, the spin is what bends the path.
    angV.current = s * (speed * 1.6 + 14);
    orbiting.current = true;
    rest.current = false;
  }, []);

  /* ── Pointer handlers ── */
  const onDown = useCallback((e: React.PointerEvent) => {
    const t = el.current;
    if (!t) return;
    t.setPointerCapture(e.pointerId);
    drag.current = true;
    rest.current = false;
    orbiting.current = false;
    const r = t.getBoundingClientRect();
    off.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    v.current = { x: 0, y: 0 };
    flick.current = { x: 0, y: 0 };
    angV.current = 0;
  }, []);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current) return;
    const nx = e.clientX - off.current.x + HALF;
    const ny = e.clientY - off.current.y + HALF;
    flick.current = { x: nx - p.current.x, y: ny - p.current.y };
    p.current.x = nx;
    p.current.y = ny;
    const w = window.innerWidth;
    const h = window.innerHeight;
    p.current.x = Math.max(HALF, Math.min(w - HALF, p.current.x));
    p.current.y = Math.max(HALF, Math.min(h - HALF, p.current.y));
    sync();
  }, [sync]);

  const onUp = useCallback(() => {
    drag.current = false;
    const fspd = Math.sqrt(
      flick.current.x * flick.current.x + flick.current.y * flick.current.y,
    );
    if (fspd > FLICK_THRESHOLD) {
      launchFrom(
        p.current.x,
        p.current.y,
        flick.current.x * 0.7,
        flick.current.y * 0.7,
      );
    } else {
      orbiting.current = false;
      v.current.x = flick.current.x * 0.3;
      v.current.y = flick.current.y * 0.3;
      angV.current = (Math.random() - 0.5) * 6;
    }
  }, [launchFrom]);

  const onClick = useCallback(() => {
    if (drag.current || !rest.current) return;
    rest.current = false;
    const dir = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5);
    launchFrom(p.current.x, p.current.y, dir * 7, -14);
  }, [launchFrom]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[900] select-none overflow-hidden"
      aria-hidden="true"
    >
      <div
        ref={el}
        role="button"
        tabIndex={0}
        aria-label="Boomerang"
        onClick={onClick}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        className="pointer-events-auto absolute h-[52px] w-[52px] cursor-grab touch-none drop-shadow-[0_8px_12px_rgba(0,0,0,0.4)] active:cursor-grabbing sm:h-16 sm:w-16"
        style={{ transform: "translate3d(0, 0, 0)", color }}
      >
        {BOOMERANG_SVG}
      </div>
    </div>
  );
}
