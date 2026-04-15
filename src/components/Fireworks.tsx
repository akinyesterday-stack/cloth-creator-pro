import { useEffect, useRef, useState } from "react";

const COLORS = [
  "#ff0", "#f0f", "#0ff", "#f00", "#0f0", "#ff6600", "#fff", 
  "#ffcc00", "#ff69b4", "#7fff00", "#ff4444", "#44ff44", "#4444ff",
  "#ff8800", "#88ff00", "#0088ff", "#ff0088", "#00ff88"
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  trail: { x: number; y: number; alpha: number }[];
}

export function Fireworks({ onComplete }: { onComplete?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(true);
  const [textVisible, setTextVisible] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];

    const createBurst = (cx: number, cy: number) => {
      const particleCount = 80 + Math.floor(Math.random() * 40);
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3;
        const speed = 3 + Math.random() * 8;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 2 + Math.random() * 5,
          alpha: 1,
          decay: 0.008 + Math.random() * 0.008,
          trail: [],
        });
      }
    };

    // Create 8 bursts with staggered timing
    const burstPositions = [
      { x: 0.2, y: 0.2 }, { x: 0.5, y: 0.15 }, { x: 0.8, y: 0.2 },
      { x: 0.3, y: 0.4 }, { x: 0.7, y: 0.4 },
      { x: 0.15, y: 0.6 }, { x: 0.5, y: 0.5 }, { x: 0.85, y: 0.6 },
    ];

    const timeouts: number[] = [];
    burstPositions.forEach((pos, i) => {
      const t = setTimeout(() => {
        createBurst(
          canvas.width * (pos.x + (Math.random() - 0.5) * 0.1),
          canvas.height * (pos.y + (Math.random() - 0.5) * 0.1)
        );
      }, i * 350) as unknown as number;
      timeouts.push(t);
    });

    let animId: number;
    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let alive = 0;
      for (const p of particles) {
        if (p.alpha <= 0) continue;
        alive++;

        // Save trail
        p.trail.push({ x: p.x, y: p.y, alpha: p.alpha * 0.5 });
        if (p.trail.length > 6) p.trail.shift();

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
        p.vx *= 0.985;
        p.alpha -= p.decay;

        // Draw trail
        for (const t of p.trail) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, t.alpha * 0.3);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(t.x, t.y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Draw particle with glow
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Sparkle effect
        if (Math.random() < 0.1 && p.alpha > 0.3) {
          ctx.save();
          ctx.globalAlpha = p.alpha * 0.8;
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(p.x + (Math.random() - 0.5) * 10, p.y + (Math.random() - 0.5) * 10, 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      if (alive > 0 || timeouts.length > 0) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);

    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 6000);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(timer);
      timeouts.forEach(clearTimeout);
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-[9999] pointer-events-none"
        style={{ width: "100vw", height: "100vh" }}
      />
      {/* Flashing text overlay */}
      {textVisible && (
        <div className="fixed inset-0 z-[10000] pointer-events-none flex items-center justify-center">
          <div className="fireworks-text-container">
            <h1 className="fireworks-main-text">🎉 YENİ SİPARİŞ GELDİ! 🎉</h1>
            <p className="fireworks-sub-text">Bildirimlerden detayları görebilirsiniz</p>
          </div>
        </div>
      )}
    </>
  );
}
