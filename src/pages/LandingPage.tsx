import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { UserProfile } from "../auth";
import NavBar from "../components/landing/NavBar";
import HeroSection from "../components/landing/HeroSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import HowItWorksSection from "../components/landing/HowItWorksSection";
import ModelsShowcase from "../components/landing/ModelsShowcase";
import PricingComparison from "../components/landing/PricingComparison";
import ClaudeCodeSection from "../components/landing/ClaudeCodeSection";
import TransparencySection from "../components/landing/TransparencySection";
import NinjaStar from "../components/landing/NinjaStar";
import Footer from "../components/landing/Footer";
import { AdSenseScript, AdUnit } from "../components/AdSense";

interface LandingPageProps {
  user: UserProfile | null;
}

export default function LandingPage({ user }: LandingPageProps) {
  const location = useLocation();

  // Scroll to the anchor on mount / hash change (nav links, footer links)
  useEffect(() => {
    if (!location.hash) return;
    const el = document.querySelector(location.hash);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
  }, [location.hash]);

  // Reset scroll on a plain navigation to "/"
  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-bg text-text">
      <AdSenseScript />
      <NavBar user={user} />
      <main>
        <HeroSection user={user} />
        <FeaturesSection />
        <div className="landing-ad" style={{ maxWidth: 728, margin: "0 auto", padding: "8px 16px" }}>
          <AdUnit slot={import.meta.env.VITE_ADSENSE_AD_SLOT_BANNER || "0000000000"} format="horizontal" />
        </div>
        <HowItWorksSection />
        <ModelsShowcase />
        <PricingComparison />
        <ClaudeCodeSection />
        <TransparencySection />
      </main>
      <Footer />
      <NinjaStar />
    </div>
  );
}
