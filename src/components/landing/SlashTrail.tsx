import { useEffect, useRef } from "react";

interface Props {
  sx: number; sy: number;
  ex: number; ey: number;
  color: string;
}

/**
 * A single Fruit-Ninja-style slash line that fades over ~400ms.
 */
export default function SlashTrail({ sx, sy, ex, ey, color }: Props) {
  const svgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = svgRef.current;
    if (!root) return;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:998;overflow:visible;";

    // Main slash — bright core
    const main = document.createElementNS("http://www.w3.org/2000/svg", "line");
    main.setAttribute("x1", String(sx));
    main.setAttribute("y1", String(sy));
    main.setAttribute("x2", String(ex));
    main.setAttribute("y2", String(ey));
    main.setAttribute("stroke", color);
    main.setAttribute("stroke-width", "2");
    main.setAttribute("stroke-linecap", "round");
    main.setAttribute("opacity", "0.85");
    svg.appendChild(main);

    // Outer glow — wider, same line, softer
    const glow = document.createElementNS("http://www.w3.org/2000/svg", "line");
    glow.setAttribute("x1", String(sx));
    glow.setAttribute("y1", String(sy));
    glow.setAttribute("x2", String(ex));
    glow.setAttribute("y2", String(ey));
    glow.setAttribute("stroke", color);
    glow.setAttribute("stroke-width", "5");
    glow.setAttribute("stroke-linecap", "round");
    glow.setAttribute("opacity", "0.25");
    svg.appendChild(glow);

    root.appendChild(svg);

    // Fade and remove
    const start = performance.now();
    const duration = 420;
    let animId: number;

    const tick = () => {
      const t = Math.min((performance.now() - start) / duration, 1);
      const ease = 1 - t;
      main.setAttribute("opacity", String(Math.max(0, 0.85 * ease)));
      glow.setAttribute("opacity", String(Math.max(0, 0.25 * ease)));
      if (t < 1) {
        animId = requestAnimationFrame(tick);
      } else {
        svg.remove();
      }
    };
    animId = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(animId); svg.remove(); };
  }, [sx, sy, ex, ey, color]);

  return <div ref={svgRef} aria-hidden="true" />;
}
