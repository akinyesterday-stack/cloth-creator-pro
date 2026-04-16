import { useEffect, useRef, useState } from "react";

const COLORS = [
  "#ff0", "#f0f", "#0ff", "#f00", "#0f0", "#ff6600", "#fff",
  "#ffcc00", "#ff69b4", "#7fff00", "#ff4444", "#44ff44", "#4444ff",
  "#ff8800", "#88ff00", "#0088ff", "#ff0088", "#00ff88",
  "#ffd700", "#ff1493", "#00ffff", "#adff2f", "#ff6347",
];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string; size: number;
  alpha: number; decay: number;
  trail: { x: number; y: number; alpha: number }[];
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

    const createBurst = (cx: number, cy: number, big = false) => {
      const count = big ? 200 : 120;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const speed = big ? (5 + Math.random() * 14) : (4 + Math.random() * 10);
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: big ? (4 + Math.random() * 8) : (3 + Math.random() * 6),
          alpha: 1,
          decay: 0.005 + Math.random() * 0.006,
          trail: [],
        });
      }
    };

    // 12 bursts across the whole screen
    const bursts = [
      { x: 0.15, y: 0.15, d: 200, big: false },
      { x: 0.5, y: 0.12, d: 400, big: true },
      { x: 0.85, y: 0.15, d: 600, big: false },
      { x: 0.25, y: 0.35, d: 900, big: true },
      { x: 0.75, y: 0.3, d: 1100, big: false },
      { x: 0.5, y: 0.45, d: 1400, big: true },
      { x: 0.1, y: 0.55, d: 1800, big: false },
      { x: 0.9, y: 0.55, d: 2000, big: false },
      { x: 0.35, y: 0.65, d: 2400, big: true },
      { x: 0.65, y: 0.7, d: 2700, big: false },
      { x: 0.5, y: 0.35, d: 3200, big: true },
      { x: 0.2, y: 0.45, d: 3600, big: false },
    ];

    const timeouts: number[] = [];
    bursts.forEach((b) => {
      const t = setTimeout(() => {
        createBurst(
          canvas.width * (b.x + (Math.random() - 0.5) * 0.08),
          canvas.height * (b.y + (Math.random() - 0.5) * 0.08),
          b.big
        );
      }, b.d) as unknown as number;
      timeouts.push(t);
    });

    let animId: number;
    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let alive = 0;
      for (const p of particles) {
        if (p.alpha <= 0) continue;
        alive++;

        p.trail.push({ x: p.x, y: p.y, alpha: p.alpha * 0.6 });
        if (p.trail.length > 8) p.trail.shift();

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.035;
        p.vx *= 0.988;
        p.alpha -= p.decay;

        // Trail
        for (const t of p.trail) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, t.alpha * 0.35);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(t.x, t.y, p.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Particle glow
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Extra sparkles
        if (Math.random() < 0.15 && p.alpha > 0.3) {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(
            p.x + (Math.random() - 0.5) * 14,
            p.y + (Math.random() - 0.5) * 14,
            1.5, 0, Math.PI * 2
          );
          ctx.fill();
          ctx.restore();
        }
      }

      if (alive > 0 || timeouts.some(() => true)) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);

    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 7000);

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
      <div className="fixed inset-0 z-[10000] pointer-events-none flex items-center justify-center">
        <div className="text-center animate-pulse">
          <h1
            className="text-6xl md:text-8xl font-black drop-shadow-[0_0_40px_rgba(255,215,0,0.8)]"
            style={{
              background: "linear-gradient(90deg, #ffd700, #ff6347, #ff69b4, #ffd700)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "fireworks-gradient 1s linear infinite, fireworks-scale 0.5s ease-in-out infinite alternate",
            }}
          >
            🎉 YENİ SİPARİŞ GELDİ! 🎉
          </h1>
          <p
            className="text-2xl md:text-4xl font-bold mt-4 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.9)]"
            style={{ animation: "fireworks-blink 0.6s ease-in-out infinite alternate" }}
          >
            Bildirimlerden detayları görebilirsiniz
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fireworks-gradient {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fireworks-scale {
          0% { transform: scale(1); }
          100% { transform: scale(1.08); }
        }
        @keyframes fireworks-blink {
          0% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}</style>
    </>
  );
}
