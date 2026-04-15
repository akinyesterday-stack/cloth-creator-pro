import { useEffect, useRef, useState } from "react";

const COLORS = ["#ff0", "#f0f", "#0ff", "#f00", "#0f0", "#ff6600", "#fff", "#ffcc00", "#ff69b4", "#7fff00"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

export function Fireworks({ onComplete }: { onComplete?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];

    // Create multiple bursts at different positions
    const burstCount = 5;
    for (let b = 0; b < burstCount; b++) {
      const cx = canvas.width * (0.15 + Math.random() * 0.7);
      const cy = canvas.height * (0.15 + Math.random() * 0.5);
      const particleCount = 40 + Math.floor(Math.random() * 20);

      setTimeout(() => {
        for (let i = 0; i < particleCount; i++) {
          const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.2;
          const speed = 2 + Math.random() * 6;
          particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            size: 2 + Math.random() * 4,
            alpha: 1,
            decay: 0.015 + Math.random() * 0.01,
          });
        }
      }, b * 400);
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = 0;
      for (const p of particles) {
        if (p.alpha <= 0) continue;
        alive++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity
        p.vx *= 0.99;
        p.alpha -= p.decay;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (alive > 0) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);

    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 4000);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(timer);
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
