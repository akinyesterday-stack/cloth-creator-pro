import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  speed: number;
  decay: number;
  opacity: number;
}

const COLORS = ["#ff0", "#f0f", "#0ff", "#f00", "#0f0", "#ff6600", "#fff", "#ffcc00"];

export function Fireworks({ onComplete }: { onComplete?: () => void }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const allParticles: Particle[] = [];
    // Create 3 bursts
    for (let burst = 0; burst < 3; burst++) {
      const cx = 20 + Math.random() * 60; // % position
      const cy = 20 + Math.random() * 40;
      for (let i = 0; i < 30; i++) {
        allParticles.push({
          id: burst * 30 + i,
          x: cx,
          y: cy,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 3 + Math.random() * 5,
          angle: (Math.PI * 2 * i) / 30 + Math.random() * 0.3,
          speed: 2 + Math.random() * 4,
          decay: 0.96 + Math.random() * 0.02,
          opacity: 1,
        });
      }
    }
    setParticles(allParticles);

    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-firework-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            '--angle': `${p.angle}rad`,
            '--speed': `${p.speed * 30}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
