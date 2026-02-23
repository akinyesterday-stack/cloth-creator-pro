import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  size: number;
  trail: { x: number; y: number; alpha: number }[];
}

interface Rocket {
  x: number;
  y: number;
  vy: number;
  targetY: number;
  color: string;
  exploded: boolean;
}

const COLORS = [
  "#ff4444", "#ff8800", "#ffcc00", "#44ff44",
  "#00ccff", "#ff44ff", "#ffffff", "#ff6699",
  "#44ffcc", "#ffaa44",
];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function Fireworks({ onComplete }: { onComplete?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const rocketsRef = useRef<Rocket[]>([]);
  const startTime = useRef(Date.now());

  const createExplosion = useCallback((x: number, y: number) => {
    const count = 60 + Math.floor(Math.random() * 40);
    const color = randomColor();
    const secondColor = randomColor();

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.2;
      const speed = 2 + Math.random() * 5;
      const useSecond = Math.random() > 0.6;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: useSecond ? secondColor : color,
        alpha: 1,
        decay: 0.012 + Math.random() * 0.01,
        size: 2 + Math.random() * 2,
        trail: [],
      });
    }
  }, []);

  const launchRocket = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    rocketsRef.current.push({
      x: canvas.width * (0.15 + Math.random() * 0.7),
      y: canvas.height,
      vy: -(8 + Math.random() * 5),
      targetY: canvas.height * (0.1 + Math.random() * 0.35),
      color: randomColor(),
      exploded: false,
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Launch rockets in waves
    const launchIntervals: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < 15; i++) {
      launchIntervals.push(
        setTimeout(() => {
          launchRocket();
          if (i % 2 === 0) launchRocket(); // double rockets occasionally
        }, i * 300 + Math.random() * 200)
      );
    }

    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update rockets
      for (let i = rocketsRef.current.length - 1; i >= 0; i--) {
        const r = rocketsRef.current[i];
        r.y += r.vy;

        // Draw rocket trail
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = r.color;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(r.x, r.y, 6, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 6);
        gradient.addColorStop(0, r.color + "80");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fill();

        if (r.y <= r.targetY && !r.exploded) {
          r.exploded = true;
          createExplosion(r.x, r.y);
          rocketsRef.current.splice(i, 1);
        }
      }

      // Update particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];

        p.trail.push({ x: p.x, y: p.y, alpha: p.alpha * 0.5 });
        if (p.trail.length > 5) p.trail.shift();

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06; // gravity
        p.vx *= 0.985;
        p.alpha -= p.decay;

        // Draw trail
        for (let t = 0; t < p.trail.length; t++) {
          const tr = p.trail[t];
          const trAlpha = tr.alpha * (t / p.trail.length) * 0.4;
          if (trAlpha <= 0) continue;
          ctx.beginPath();
          ctx.arc(tr.x, tr.y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = p.color + Math.round(trAlpha * 255).toString(16).padStart(2, "0");
          ctx.fill();
        }

        // Draw particle
        if (p.alpha > 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, "0");
          ctx.fill();

          // Glow
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          glow.addColorStop(0, p.color + Math.round(p.alpha * 80).toString(16).padStart(2, "0"));
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.fill();
        }

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
        }
      }

      // End after 5 seconds
      const elapsed = Date.now() - startTime.current;
      if (elapsed < 5000 || particlesRef.current.length > 0 || rocketsRef.current.length > 0) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onComplete?.();
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      launchIntervals.forEach(clearTimeout);
    };
  }, [createExplosion, launchRocket, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{ background: "transparent" }}
    />
  );
}
