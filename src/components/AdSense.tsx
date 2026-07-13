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

// ── AdSenseScript ──────────────────────────────────────────────
/**
 * Loads the AdSense script once at the app root.
 * Place this near the top of your app layout (only once).
 * When no CLIENT_ID is set, this is a no-op.
 */
export function AdSenseScript() {
  useEffect(() => {
    if (!CLIENT_ID) return;
    const id = "adsbygoogle-init";
    if (document.getElementById(id)) return;

    const script = document.createElement("script");
    script.id = id;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`;
    script.crossOrigin = "anonymous";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return null;
}

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

    // AdSense needs the <ins> in the DOM before we push
    const timer = setTimeout(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // Ad-blocker or other non-fatal error — safely ignored
      }
    }, 200);

    return () => clearTimeout(timer);
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
