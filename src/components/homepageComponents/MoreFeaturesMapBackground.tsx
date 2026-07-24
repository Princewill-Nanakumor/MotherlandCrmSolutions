// src/components/homepageComponents/MoreFeaturesMapBackground.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  EXPLOSION_MS,
  MapCollisionExplosion,
  pickExplosionType,
  type ExplosionType,
} from "@/components/homepageComponents/MapCollisionExplosion";

const ROUTES = [
  {
    id: "more-route-1",
    d: "M 80 520 C 260 200, 480 180, 640 340 S 920 560, 1120 280",
    stroke: "var(--brand-from)",
    strokeOpacity: 0.35,
    strokeWidth: 2,
    drawDelay: 0,
    drawDuration: 2.2,
  },
  {
    id: "more-route-2",
    d: "M 140 180 C 360 320, 520 480, 760 360 S 980 200, 1160 420",
    stroke: "var(--brand-to)",
    strokeOpacity: 0.3,
    strokeWidth: 2,
    drawDelay: 0.2,
    drawDuration: 2.4,
  },
  {
    id: "more-route-3",
    d: "M 60 320 C 280 420, 520 120, 780 300 S 1000 520, 1180 360",
    stroke: "var(--brand-from)",
    strokeOpacity: 0.22,
    strokeWidth: 1.5,
    drawDelay: 0.35,
    drawDuration: 2.6,
  },
] as const;

type TravelerDef = {
  id: string;
  routeIndex: number;
  durationMs: number;
  delayMs: number;
  r: number;
};

const TRAVELERS: TravelerDef[] = [
  { id: "m1a", routeIndex: 0, durationMs: 12000, delayMs: 0, r: 5 },
  { id: "m1b", routeIndex: 0, durationMs: 16000, delayMs: 4000, r: 3.5 },
  { id: "m2a", routeIndex: 1, durationMs: 14000, delayMs: 800, r: 4.5 },
  { id: "m2b", routeIndex: 1, durationMs: 18000, delayMs: 5500, r: 3 },
  { id: "m3a", routeIndex: 2, durationMs: 13000, delayMs: 1500, r: 4 },
  { id: "m3b", routeIndex: 2, durationMs: 17000, delayMs: 7000, r: 3 },
];

const COLLISION_DIST = 22;
const BOUNCE_MS = 420;
const COOLDOWN_MS = 1400;

type NodeRender = {
  id: string;
  x: number;
  y: number;
  r: number;
  scale: number;
};

type Explosion = {
  id: string;
  x: number;
  y: number;
  born: number;
  type: ExplosionType;
};

type TravelerRuntime = {
  def: TravelerDef;
  progress: number;
  dir: number;
  resumeDir: number;
  bounceUntil: number;
  cooldownUntil: number;
  scale: number;
  x: number;
  y: number;
};

function createPath(d: string) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  return path;
}

function pointOnPath(path: SVGPathElement, progress: number) {
  const len = path.getTotalLength();
  const t = ((progress % 1) + 1) % 1;
  return path.getPointAtLength(t * len);
}

/**
 * Map backdrop for “Everything else your team needs” — cross-hatch grid plus
 * route arcs with traveling nodes that explode/bounce on contact.
 */
export function MoreFeaturesMapBackground() {
  const reduce = useReducedMotion();
  const [nodes, setNodes] = useState<NodeRender[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const travelersRef = useRef<TravelerRuntime[]>([]);
  const pathsRef = useRef<SVGPathElement[]>([]);
  const startRef = useRef(0);
  const lastRef = useRef(0);

  useEffect(() => {
    if (reduce) {
      const paths = ROUTES.map((r) => createPath(r.d));
      const staticNodes: NodeRender[] = [];
      paths.forEach((path, routeIndex) => {
        [0.28, 0.62].forEach((t, i) => {
          const p = pointOnPath(path, t);
          staticNodes.push({
            id: `static-${routeIndex}-${i}`,
            x: p.x,
            y: p.y,
            r: 4,
            scale: 1,
          });
        });
      });
      setNodes(staticNodes);
      return;
    }

    pathsRef.current = ROUTES.map((r) => createPath(r.d));
    travelersRef.current = TRAVELERS.map((def) => {
      const path = pathsRef.current[def.routeIndex]!;
      const p = pointOnPath(path, 0);
      return {
        def,
        progress: 0,
        dir: 1,
        resumeDir: 1,
        bounceUntil: 0,
        cooldownUntil: 0,
        scale: 1,
        x: p.x,
        y: p.y,
      };
    });

    startRef.current = performance.now();
    lastRef.current = startRef.current;
    let raf = 0;
    let explosionId = 0;

    const tick = (now: number) => {
      const dt = Math.min(48, now - lastRef.current);
      lastRef.current = now;
      const elapsed = now - startRef.current;
      const travelers = travelersRef.current;
      const paths = pathsRef.current;

      for (const t of travelers) {
        if (elapsed < t.def.delayMs) {
          const p = pointOnPath(paths[t.def.routeIndex]!, 0);
          t.x = p.x;
          t.y = p.y;
          t.scale += (1 - t.scale) * 0.15;
          continue;
        }

        if (t.bounceUntil && now >= t.bounceUntil) {
          t.dir = t.resumeDir;
          t.bounceUntil = 0;
        }

        const speed = dt / t.def.durationMs;
        t.progress = (((t.progress + speed * t.dir) % 1) + 1) % 1;

        const p = pointOnPath(paths[t.def.routeIndex]!, t.progress);
        t.x = p.x;
        t.y = p.y;
        t.scale += (1 - t.scale) * 0.12;
      }

      const newExplosions: Explosion[] = [];
      for (let i = 0; i < travelers.length; i++) {
        for (let j = i + 1; j < travelers.length; j++) {
          const a = travelers[i]!;
          const b = travelers[j]!;
          if (elapsed < a.def.delayMs || elapsed < b.def.delayMs) continue;
          if (now < a.cooldownUntil || now < b.cooldownUntil) continue;

          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist >= COLLISION_DIST || dist < 0.001) continue;

          a.resumeDir = a.dir;
          b.resumeDir = b.dir;
          a.dir = -a.dir;
          b.dir = -b.dir;
          a.bounceUntil = now + BOUNCE_MS;
          b.bounceUntil = now + BOUNCE_MS;
          a.cooldownUntil = now + COOLDOWN_MS;
          b.cooldownUntil = now + COOLDOWN_MS;
          a.scale = 1.85;
          b.scale = 1.85;

          newExplosions.push({
            id: `boom-${explosionId++}`,
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
            born: now,
            type: pickExplosionType(),
          });
        }
      }

      setNodes(
        travelers.map((t) => ({
          id: t.def.id,
          x: t.x,
          y: t.y,
          r: t.def.r,
          scale: t.scale,
        })),
      );

      if (newExplosions.length) {
        setExplosions((prev) =>
          [...prev, ...newExplosions].filter((e) => now - e.born < EXPLOSION_MS),
        );
      } else {
        setExplosions((prev) =>
          prev.length ? prev.filter((e) => now - e.born < EXPLOSION_MS) : prev,
        );
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--brand-from)_7%,#f8fafc)]" />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(45deg, color-mix(in srgb, var(--brand-from) 28%, transparent) 1.5px, transparent 1.5px),
            linear-gradient(-45deg, color-mix(in srgb, var(--brand-to) 24%, transparent) 1.5px, transparent 1.5px)
          `,
          backgroundSize: "36px 36px",
          opacity: 0.85,
          maskImage:
            "radial-gradient(ellipse 90% 80% at 50% 45%, black 20%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 80% at 50% 45%, black 20%, transparent 85%)",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, color-mix(in srgb, var(--brand-from) 22%, transparent) 1px, transparent 1px),
            linear-gradient(to bottom, color-mix(in srgb, var(--brand-from) 22%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
          opacity: 0.7,
          maskImage:
            "radial-gradient(ellipse 85% 75% at 50% 50%, black, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 85% 75% at 50% 50%, black, transparent 80%)",
        }}
      />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 700"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <radialGradient id="more-node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--brand-from)" stopOpacity="1" />
            <stop
              offset="100%"
              stopColor="var(--brand-to)"
              stopOpacity="0.85"
            />
          </radialGradient>
        </defs>

        {ROUTES.map((route) => (
          <motion.path
            key={route.id}
            d={route.d}
            stroke={route.stroke}
            strokeWidth={route.strokeWidth}
            strokeOpacity={route.strokeOpacity}
            strokeLinecap="round"
            initial={reduce ? undefined : { pathLength: 0, opacity: 0 }}
            animate={reduce ? undefined : { pathLength: 1, opacity: 1 }}
            transition={{
              duration: route.drawDuration,
              ease: "easeInOut",
              delay: route.drawDelay,
            }}
          />
        ))}

        {explosions.map((boom) => (
          <MapCollisionExplosion
            key={boom.id}
            type={boom.type}
            x={boom.x}
            y={boom.y}
          />
        ))}

        {nodes.map((node) => (
          <g
            key={node.id}
            transform={`translate(${node.x} ${node.y}) scale(${node.scale})`}
          >
            <circle r={node.r + 4} fill="var(--brand-from)" opacity="0.18" />
            <circle
              r={node.r}
              fill="url(#more-node-glow)"
              stroke="white"
              strokeWidth="1.5"
              opacity="0.95"
            />
          </g>
        ))}
      </svg>

      <div
        className="absolute -left-20 top-1/4 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--brand-from)" }}
      />
      <div
        className="absolute -right-16 bottom-[-10%] h-96 w-96 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--brand-to)" }}
      />
    </div>
  );
}
