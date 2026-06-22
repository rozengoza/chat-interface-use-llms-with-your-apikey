import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { UserProfile } from "../auth";
import NavBar from "../components/landing/NavBar";
import Stars from "../components/Stars";
import HeroSection from "../components/landing/HeroSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import ModelsShowcase from "../components/landing/ModelsShowcase";
import PricingComparison from "../components/landing/PricingComparison";
import ClaudeCodeSection from "../components/landing/ClaudeCodeSection";
import HowItWorksSection from "../components/landing/HowItWorksSection";
import GitHubSection from "../components/landing/GitHubSection";
import Footer from "../components/landing/Footer";

interface LandingPageProps {
  user: UserProfile | null;
}

export default function LandingPage({ user }: LandingPageProps) {
  const location = useLocation();

  // Scroll to hash on mount or when hash changes
  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }
  }, [location.hash]);

  // Scroll to top on direct navigation to /
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <Stars />
      <NavBar user={user} />
      <main>
        <HeroSection user={user} />
        <FeaturesSection />
        <HowItWorksSection />
        <ModelsShowcase />
        <PricingComparison />
        <ClaudeCodeSection />
        <GitHubSection />
      </main>
      <Footer />
    </div>
  );
}
