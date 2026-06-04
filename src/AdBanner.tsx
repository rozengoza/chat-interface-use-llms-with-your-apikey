// AdBanner.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface AdBannerProps {
  adClient: string;
  adSlot: string;
  format?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export const AdBanner = ({ adClient, adSlot, format = 'auto' }: AdBannerProps) => {
  const location = useLocation();
  const componentKey = `${location.pathname}-${adSlot}`;

  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

  return (
    <ins
      key={componentKey}
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client={adClient}
      data-ad-slot={adSlot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
};