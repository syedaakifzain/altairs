import { useEffect, useRef, useState } from 'react';

interface Walker {
  id: string;
  /* start/end foot position in SVG coords */
  x0: number; y0: number;
  x1: number; y1: number;
  /** 0–1 scale (depth cue) */
  scale: number;
  /** animation offset so walkers don't all move in sync */
  phase: number;
}

const WALKERS: Walker[] = [
  { id: 'ID 01', x0: 108, y0: 334, x1: 220, y1: 294, scale: 1.00, phase: 0.00 },
  { id: 'ID 02', x0: 258, y0: 224, x1: 334, y1: 206, scale: 0.70, phase: 0.38 },
  { id: 'ID 03', x0: 435, y0: 178, x1: 495, y1: 168, scale: 0.56, phase: 0.72 },
];

// Perspective grid: vanishing point
const VP_X = 285;
const VP_Y = 128;

// Ground plane rows (y positions from near to far)
const ROWS = [372, 338, 308, 282, 260, 242, 228, 217, 208, 200, 194, 190];

// Vertical column x-positions at the near edge (y = max row)
const COL_NEAR = [-60, 0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660];

export function HeroTrackingVisual() {
  const [t, setT] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const cycleMs = 10_000;
    const tick = (now: number) => {
      const elapsed = ((now - start) % cycleMs) / cycleMs;
      // smooth ping-pong
      const wave = 0.5 - 0.5 * Math.cos(elapsed * Math.PI * 2);
      setT(wave);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-[300px] sm:h-[380px] lg:h-[440px] overflow-hidden select-none">
      {/* Gradient fade edges so visual blends into hero background */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-28 z-10 bg-gradient-to-r from-[#F5F5F0] to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-16 z-10 bg-gradient-to-b from-[#F5F5F0] to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 z-10 bg-gradient-to-t from-[#F5F5F0]/70 to-transparent" />

      <svg
        viewBox="0 0 600 420"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
        role="img"
        aria-label="Animated multi-object tracking preview showing pedestrians with bounding boxes, IDs, and trajectory lines"
      >
        <defs>
          {/* Sky gradient */}
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D8D8D2" />
            <stop offset="100%" stopColor="#EAEAE4" />
          </linearGradient>
          {/* Ground gradient (lighter near horizon, slightly warmer near camera) */}
          <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4D4CE" />
            <stop offset="100%" stopColor="#C9C9C2" />
          </linearGradient>
          {/* Trail fade gradient */}
          <linearGradient id="trailFade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#B7F000" stopOpacity="0" />
            <stop offset="60%" stopColor="#B7F000" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#B7F000" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="600" height={VP_Y + 4} fill="url(#skyGrad)" />

        {/* Ground */}
        <rect x="0" y={VP_Y} width="600" height={420 - VP_Y} fill="url(#groundGrad)" />

        {/* Perspective grid: vertical column lines */}
        {COL_NEAR.map((nearX, i) => {
          // Each column converges from (nearX, maxRow) → (VP_X, VP_Y)
          const maxRow = ROWS[0];
          return (
            <line
              key={`col-${i}`}
              x1={nearX}
              y1={maxRow + 30}
              x2={VP_X}
              y2={VP_Y}
              stroke="#BDBDB6"
              strokeWidth="0.8"
              opacity="0.55"
            />
          );
        })}

        {/* Perspective grid: horizontal rows */}
        {ROWS.map((rowY, ri) => {
          // The row spans between the two outermost column lines at that depth
          const maxRow = ROWS[0];
          const frac = (maxRow + 30 - rowY) / (maxRow + 30 - VP_Y);
          const leftX = VP_X + (COL_NEAR[0] - VP_X) * (1 - frac);
          const rightX = VP_X + (COL_NEAR[COL_NEAR.length - 1] - VP_X) * (1 - frac);
          return (
            <line
              key={`row-${ri}`}
              x1={leftX}
              y1={rowY}
              x2={rightX}
              y2={rowY}
              stroke="#BDBDB6"
              strokeWidth="0.8"
              opacity={0.3 + ri * 0.03}
            />
          );
        })}

        {/* Walkers — rendered back to front for natural depth ordering */}
        {[...WALKERS].reverse().map((walker) => {
          const local = Math.min(1, Math.max(0, t + walker.phase * 0.08));
          const footX = walker.x0 + (walker.x1 - walker.x0) * local;
          const footY = walker.y0 + (walker.y1 - walker.y0) * local;

          const s = walker.scale;
          const BW = Math.round(60 * s);
          const BH = Math.round(148 * s);
          const bx = Math.round(footX - BW / 2);
          const by = Math.round(footY - BH);

          // Leg stride animation
          const stride = Math.sin(t * Math.PI * 8 + walker.phase * 10) * 0.6;

          // Trail path from start through current foot to ahead
          const trailStartX = walker.x0 - 80 * s;
          const trailStartY = walker.y0 + 20 * s;
          const ctrlMidX = (trailStartX + footX) / 2;
          const ctrlMidY = (trailStartY + footY) / 2;
          const trailEndX = Math.min(600, footX + 160 * s);
          const trailEndY = footY - 42 * s;

          return (
            <g key={walker.id}>
              {/* Trajectory trail */}
              <path
                d={`M ${trailStartX} ${trailStartY} Q ${ctrlMidX} ${ctrlMidY} ${footX} ${footY} Q ${(footX + trailEndX) / 2} ${(footY + trailEndY) / 2} ${trailEndX} ${trailEndY}`}
                fill="none"
                stroke="#B7F000"
                strokeWidth={s > 0.75 ? 2 : 1.5}
                strokeOpacity="0.75"
                strokeDasharray="none"
              />

              {/* Ground shadow ellipse */}
              <ellipse
                cx={footX}
                cy={footY + 2}
                rx={20 * s}
                ry={4.5 * s}
                fill="#151515"
                opacity="0.14"
              />

              {/* Pedestrian silhouette group anchored at foot */}
              <g transform={`translate(${footX},${footY}) scale(${s})`} fill="#202020">
                {/* Back leg */}
                <path
                  d={`M -3 -52 L ${-14 - stride * 8} -2 L ${-7 - stride * 8} -0 L 3 -50 Z`}
                  fill="#2E2E2E"
                />
                {/* Front leg */}
                <path
                  d={`M 2 -52 L ${14 + stride * 8} -1 L ${7 + stride * 8} 0 L -3 -50 Z`}
                  fill="#181818"
                />
                {/* Torso/coat */}
                <path d="M -11 -104 C -13 -112, 13 -112, 12 -104 L 9 -48 L -10 -48 Z" fill="#1C1C1C" />
                {/* Back arm */}
                <path
                  d={`M -10 -100 L ${-19 + stride * 5} -65 L -13 -63 L -5 -97 Z`}
                  fill="#2A2A2A"
                />
                {/* Front arm */}
                <path
                  d={`M 10 -100 L ${19 - stride * 5} -67 L 13 -65 L 5 -97 Z`}
                  fill="#141414"
                />
                {/* Head */}
                <circle cx="0" cy="-122" r="10" fill="#181818" />
              </g>

              {/* Lime bounding box */}
              <rect
                x={bx}
                y={by}
                width={BW}
                height={BH}
                fill="rgba(183,240,0,0.04)"
                stroke="#B7F000"
                strokeWidth="1.75"
              />

              {/* Corner tick marks */}
              <path
                d={`M ${bx} ${by + 9} V ${by} H ${bx + 9}
                    M ${bx + BW - 9} ${by} H ${bx + BW} V ${by + 9}
                    M ${bx} ${by + BH - 9} V ${by + BH} H ${bx + 9}
                    M ${bx + BW - 9} ${by + BH} H ${bx + BW} V ${by + BH - 9}`}
                fill="none"
                stroke="#B7F000"
                strokeWidth="2.25"
              />

              {/* Lime ID tag */}
              <rect x={bx - 1} y={by - 20} width={44} height={19} rx={2} fill="#B7F000" />
              <text
                x={bx + 21}
                y={by - 7}
                textAnchor="middle"
                fill="#151515"
                fontSize="10"
                fontWeight="700"
                fontFamily="JetBrains Mono, monospace"
              >
                {walker.id}
              </text>

              {/* Ground anchor dot */}
              <circle cx={footX} cy={footY} r={2.5} fill="#B7F000" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
