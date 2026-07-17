import { useEffect, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────
declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

// ── Config ─────────────────────────────────────────────────────
// Set VITE_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX in .env to enable ads
const CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID || "";

// ── AdUnit ─────────────────────────────────────────────────────
interface AdUnitProps {
  /** Ad slot ID from the AdSense dashboard (e.g. "1234567890") */
  slot: string;
  /** Ad format — "auto" is responsive and recommended */
  format?: "auto" | "rectangle" | "horizontal" | "vertical" | "fluid";
  /** In-feed layout (use "in-feed" for feed placements) */
  layout?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * A single AdSense ad unit.
 *
 * Usage:
 * ```tsx
 * <AdUnit slot="1234567890" format="auto" />
 * ```
 *
 * Every `slot` must be created in the AdSense dashboard first.
 * This component is a no-op (renders nothing) when VITE_ADSENSE_CLIENT_ID
 * is not set, so it's safe to drop into any view even before AdSense
 * is configured.
 */
export function AdUnit({ slot, format = "auto", layout, className, style }: AdUnitProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!CLIENT_ID || pushed.current) return;
    pushed.current = true;

    // AdSense needs the <ins> in the DOM before we push.
    // requestAnimationFrame fires after paint so the element is guaranteed
    // to be rendered — more reliable than a fixed setTimeout delay.
    const raf = requestAnimationFrame(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // Ad-blocker or other non-fatal error — safely ignored
      }
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  if (!CLIENT_ID) return null;

  return (
    <div
      className={className}
      style={{
        overflow: "hidden",
        ...style,
      }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block", textAlign: "center" }}
        data-ad-client={CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
        {...(layout ? { "data-ad-layout": layout } : {})}
      />
    </div>
  );
}
