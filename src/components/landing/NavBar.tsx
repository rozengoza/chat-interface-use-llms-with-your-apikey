import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import type { UserProfile } from "../../auth";
import faviconUrl from "../../assets/favicon.svg";

interface NavBarProps {
  user: UserProfile | null;
}

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Models", href: "#models" },
  { label: "Pricing", href: "#pricing" },
  { label: "Claude Code", href: "#claude-code" },
  { label: "About", href: "/about" },
];

export default function NavBar({ user }: NavBarProps) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleNavClick = (href: string) => {
    setMenuOpen(false);
    if (href.startsWith("/")) { navigate(href); return; }
    if (window.location.pathname !== "/") { navigate("/" + href); return; }
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 transition-[border-color,background-color] duration-300"
      style={{
        background: scrolled ? "var(--pb-surface)" : "transparent",
        borderBottom: scrolled ? "1px solid var(--pb-rule)" : "1px solid transparent",
      }}
    >
      <div className="pb-container pb-gutter">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5">
            <img src={faviconUrl} alt="ARC" className="w-8 h-8" />
            <span className="pb-display text-xl">ARC</span>
          </button>

          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="pb-mono text-xs uppercase tracking-widest transition-colors"
                style={{ color: "var(--pb-text-dim)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--pb-text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--pb-text-dim)")}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center transition-colors"
              style={{ color: "var(--pb-text-dim)" }}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {user ? (
              <button onClick={() => navigate("/chat")} className="pb-btn pb-btn--primary !py-2 !px-4 text-xs">
                Chat
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="pb-mono text-xs uppercase tracking-widest"
                  style={{ color: "var(--pb-text-dim)" }}
                >
                  Sign in
                </button>
                <button onClick={() => navigate("/signup")} className="pb-btn pb-btn--primary !py-2 !px-4 text-xs">
                  Get started
                </button>
              </>
            )}
          </div>

          <button
            className="md:hidden w-9 h-9 flex items-center justify-center"
            style={{ color: "var(--pb-text)" }}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div
        className="md:hidden overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{
          maxHeight: menuOpen ? "26rem" : "0",
          background: "var(--pb-surface)",
          borderTop: menuOpen ? "1px solid var(--pb-rule)" : "none",
        }}
      >
        <div className="pb-gutter py-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => handleNavClick(link.href)}
              className="w-full text-left px-1 py-2.5 pb-mono text-xs uppercase tracking-widest"
              style={{ color: "var(--pb-text-dim)" }}
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-1 py-2.5 pb-mono text-xs uppercase tracking-widest"
            style={{ color: "var(--pb-text-dim)" }}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <div className="pb-rule my-2" />
          {user ? (
            <button onClick={() => { setMenuOpen(false); navigate("/chat"); }} className="pb-btn pb-btn--primary w-full">
              Chat
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setMenuOpen(false); navigate("/login"); }} className="pb-btn pb-btn--secondary flex-1">Sign in</button>
              <button onClick={() => { setMenuOpen(false); navigate("/signup"); }} className="pb-btn pb-btn--primary flex-1">Get started</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
