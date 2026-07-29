// src/components/homepageComponents/TravelingMapRoutes.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  EXPLOSION_MS,
  MapCollisionExplosion,
  pickExplosionType,
  type ExplosionType,
} from "@/components/homepageComponents/MapCollisionExplosion";
import { createMapAnimationGate } from "@/components/homepageComponents/mapAnimationLoop";

export type MapRoute = {
  id: string;
  d: string;
  stroke: string;
  strokeOpacity: number;
  strokeDasharray?: string;
  strokeWidth: number;
};

export type MapTravelerDef = {
  id: string;
  routeIndex: number;
  durationMs: number;
  delayMs: number;
  r: number;
};

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
  def: MapTravelerDef;
  progress: number;
  dir: number;
  resumeDir: number;
  bounceUntil: number;
  cooldownUntil: number;
  scale: number;
  x: number;
  y: number;
};

const COLLISION_DIST = 22;
const BOUNCE_MS = 420;
const COOLDOWN_MS = 1400;

function pointOnPath(path: SVGPathElement, progress: number) {
  const len = path.getTotalLength();
  if (!len) return { x: 0, y: 0 };
  const t = ((progress % 1) + 1) % 1;
  return path.getPointAtLength(t * len);
}

type TravelingMapRoutesProps = {
  routes: readonly MapRoute[];
  travelers: readonly MapTravelerDef[];
  viewBox?: string;
  gradientId: string;
  className?: string;
  preserveAspectRatio?: string;
};

/**
 * SVG overlay of routes with nodes that travel those paths
 * and bounce/explode on contact.
 */
export function TravelingMapRoutes({
  routes,
  travelers: travelerDefs,
  viewBox = "0 0 1200 700",
  gradientId,
  className = "absolute inset-0 h-full w-full",
  preserveAspectRatio = "xMidYMid slice",
}: TravelingMapRoutesProps) {
  const reduce = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const pathElsRef = useRef<(SVGPathElement | null)[]>([]);
  const [nodes, setNodes] = useState<NodeRender[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const travelersRef = useRef<TravelerRuntime[]>([]);
  const startRef = useRef(0);
  const lastRef = useRef(0);

  useEffect(() => {
    pathElsRef.current = pathElsRef.current.slice(0, routes.length);

    const getPaths = () =>
      pathElsRef.current.filter((p): p is SVGPathElement => Boolean(p));

    const paths = getPaths();
    if (paths.length !== routes.length) return;

    if (reduce) {
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

    travelersRef.current = travelerDefs.map((def) => {
      const path = paths[def.routeIndex]!;
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
    let explosionId = 0;
    const gateRef: {
      current: ReturnType<typeof createMapAnimationGate> | null;
    } = { current: null };

    const tick = (now: number) => {
      const livePaths = getPaths();
      if (livePaths.length !== routes.length) {
        gateRef.current?.continueLoop();
        return;
      }

      const dt = Math.min(48, now - lastRef.current);
      lastRef.current = now;
      const elapsed = now - startRef.current;
      const travelers = travelersRef.current;

      for (const t of travelers) {
        const path = livePaths[t.def.routeIndex]!;
        if (elapsed < t.def.delayMs) {
          const p = pointOnPath(path, 0);
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

        const p = pointOnPath(path, t.progress);
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

      gateRef.current?.continueLoop();
    };

    const gate = createMapAnimationGate(svgRef.current, tick, {
      rootMargin: "80px",
    });
    gateRef.current = gate;
    gate.startLoop();

    return () => gate.dispose();
  }, [reduce, routes, travelerDefs]);

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      overflow="visible"
      fill="none"
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--brand-from)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--brand-to)" stopOpacity="0.85" />
        </radialGradient>
      </defs>

      {routes.map((route, index) => (
        <path
          key={route.id}
          ref={(el) => {
            pathElsRef.current[index] = el;
          }}
          d={route.d}
          stroke={route.stroke}
          strokeWidth={route.strokeWidth}
          strokeOpacity={route.strokeOpacity}
          strokeDasharray={
            route.strokeDasharray && route.strokeDasharray !== "none"
              ? route.strokeDasharray
              : undefined
          }
          fill="none"
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
            fill={`url(#${gradientId})`}
            stroke="white"
            strokeWidth="1.5"
            opacity="0.95"
          />
        </g>
      ))}
    </svg>
  );
}
