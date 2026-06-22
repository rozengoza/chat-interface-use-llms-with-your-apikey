import { useRef, useEffect } from "react";
import * as THREE from "three";

type Theme = "dark" | "light";

function getTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

// Dark theme: bright stars glowing additively against a near-black sky.
// Light theme: soft, low-contrast dark dots alpha-blended over a warm light
// background so they read as a subtle texture instead of fighting the text.
const THEMES: Record<Theme, { bg: number; blending: THREE.Blending; opacity: number }> = {
  dark: { bg: 0x050510, blending: THREE.AdditiveBlending, opacity: 0.85 },
  // NormalBlending (not Multiply) so the texture's alpha is respected —
  // multiply would leave a faint square tint where the soft-star texture's
  // edge color is non-zero but its alpha has faded to 0.
  light: { bg: 0xfffaf6, blending: THREE.NormalBlending, opacity: 0.55 },
};

function fillStarColors(colors: Float32Array, count: number, theme: Theme) {
  for (let i = 0; i < count; i++) {
    const isWarm = Math.random() < 0.25;
    let r: number, g: number, b: number;
    if (theme === "light") {
      // Muted, dark warm/cool tones so stars read as a soft texture against
      // the light background instead of harsh contrasty dots.
      if (isWarm) {
        r = 0.42 + Math.random() * 0.12;
        g = 0.34 + Math.random() * 0.10;
        b = 0.28 + Math.random() * 0.10;
      } else {
        r = 0.30 + Math.random() * 0.10;
        g = 0.33 + Math.random() * 0.10;
        b = 0.40 + Math.random() * 0.12;
      }
    } else {
      if (isWarm) {
        r = 1.0;
        g = 0.8 + Math.random() * 0.2;
        b = 0.6 + Math.random() * 0.3;
      } else {
        r = 0.7 + Math.random() * 0.3;
        g = 0.8 + Math.random() * 0.2;
        b = 1.0;
      }
      const brightness = 0.5 + Math.random() * 0.5;
      r *= brightness;
      g *= brightness;
      b *= brightness;
    }
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
}

export default function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetRotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let theme = getTheme();

    // --- Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(THEMES[theme].bg);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(THEMES[theme].bg, 1);

    // --- Soft star texture (glow) ---
    const createSoftStarTexture = () => {
      const texCanvas = document.createElement("canvas");
      texCanvas.width = 32;
      texCanvas.height = 32;
      const ctx = texCanvas.getContext("2d")!;
      const center = 16;
      const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.4, "rgba(255,255,255,0.8)");
      gradient.addColorStop(0.7, "rgba(200,210,255,0.4)");
      gradient.addColorStop(1, "rgba(100,120,180,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, texCanvas.width, texCanvas.height);
      const texture = new THREE.CanvasTexture(texCanvas);
      texture.needsUpdate = true;
      return texture;
    };

    const starTexture = createSoftStarTexture();

    // --- Stars ---
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      positions[i*3] = (Math.random() - 0.5) * 60;
      positions[i*3+1] = (Math.random() - 0.5) * 40;
      positions[i*3+2] = (Math.random() - 0.5) * 50 - 15;

      sizes[i] = 0.06 + Math.random() * 0.08;
    }
    fillStarColors(colors, starCount, theme);

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const colorAttr = new THREE.BufferAttribute(colors, 3);
    starGeometry.setAttribute("color", colorAttr);
    starGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: THEMES[theme].opacity,
      blending: THEMES[theme].blending,
      map: starTexture,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // --- React to theme toggle without a full remount ---
    const applyTheme = (next: Theme) => {
      theme = next;
      const t = THEMES[theme];
      scene.background = new THREE.Color(t.bg);
      renderer.setClearColor(t.bg, 1);
      starMaterial.opacity = t.opacity;
      starMaterial.blending = t.blending;
      starMaterial.needsUpdate = true;
      fillStarColors(colors, starCount, theme);
      colorAttr.needsUpdate = true;
    };

    const themeObserver = new MutationObserver(() => {
      const next = getTheme();
      if (next !== theme) applyTheme(next);
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // --- Mouse move handler for parallax ---
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      targetRotationRef.current = { x: y * 0.12, y: x * 0.12 };
    };

    window.addEventListener("mousemove", handleMouseMove);

    // --- Animation loop with smooth parallax following ---
    let currentRotation = { x: 0, y: 0 };
    let time = 0;
    function animate() {
      requestAnimationFrame(animate);
      time += 0.002;

      currentRotation.x += (targetRotationRef.current.x - currentRotation.x) * 0.05;
      currentRotation.y += (targetRotationRef.current.y - currentRotation.y) * 0.05;

      stars.rotation.x = currentRotation.x;
      stars.rotation.y = currentRotation.y;
      stars.rotation.z = Math.sin(time * 0.1) * 0.02;

      renderer.render(scene, camera);
    }
    animate();

    // --- Resize handler ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // --- Cleanup ---
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      themeObserver.disconnect();
      starGeometry.dispose();
      starMaterial.dispose();
      starTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ pointerEvents: "none", zIndex: 0 }}
    />
  );
}