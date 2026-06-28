'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Billboard, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useRef, useMemo, useEffect, Suspense } from 'react';

import type { MatchDetail } from '@/db/queries';

type BracketLayout3DProps = {
  matches: MatchDetail[];
};

// Match IDs per tier — mirrors BracketLayout.tsx structure
const TIERS = [
  {
    label: 'ROUND OF 32',
    color: '#38bdf8',
    r: 9.4,
    y: -7.6,
    rot: 0,
    ids: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
  },
  {
    label: 'ROUND OF 16',
    color: '#5fa8ff',
    r: 6.6,
    y: -2.8,
    rot: 0.2,
    ids: [89, 90, 93, 94, 91, 92, 95, 96],
  },
  {
    label: 'QUARTER-FINAL',
    color: '#2dd4bf',
    r: 4.3,
    y: 1.6,
    rot: 0.45,
    ids: [97, 98, 99, 100],
  },
  {
    label: 'SEMI-FINAL',
    color: '#a78bfa',
    r: 2.5,
    y: 5.2,
    rot: 0.9,
    ids: [101, 102],
  },
  {
    label: 'FINAL',
    color: '#fbbf24',
    r: 0,
    y: 8.6,
    rot: 0,
    ids: [104],
  },
] as const;

const THIRD_PLACE_ID = 103;

type CardStyle = 'default' | 'gold' | 'bronze';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const CARD_STYLES = {
  default: {
    bg0: '#1d3454',
    bg1: '#0e1f36',
    border: '#2c4a6e',
    hi: 'rgba(45,212,191,0.18)',
    score: '#3ff0d4',
  },
  gold: {
    bg0: '#2e1e00',
    bg1: '#170e00',
    border: '#ffd24a',
    hi: 'rgba(255,210,74,0.22)',
    score: '#ffd24a',
  },
  bronze: {
    bg0: '#251500',
    bg1: '#130900',
    border: '#c87840',
    hi: 'rgba(200,120,64,0.22)',
    score: '#d4935a',
  },
} as const;

function makeCardTexture(
  match: MatchDetail | null | undefined,
  style: CardStyle,
): THREE.CanvasTexture {
  const W = 300, H = 360;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const s = CARD_STYLES[style];

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, s.bg0);
  grad.addColorStop(1, s.bg1);
  roundRect(ctx, 8, 8, W - 16, H - 16, 22);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = s.border;
  ctx.stroke();

  if (match?.homeTeam && match.awayTeam) {
    const rowY = [H * 0.34, H * 0.7];
    const sides = [
      { team: match.homeTeam, score: match.homeScore },
      { team: match.awayTeam, score: match.awayScore },
    ];
    sides.forEach(({ team, score }, i) => {
      const win = match.winnerTeamId === team.id;
      if (win) {
        roundRect(ctx, 22, rowY[i] - 58, W - 44, 108, 16);
        ctx.fillStyle = s.hi;
        ctx.fill();
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '118px "Apple Color Emoji","Segoe UI Emoji",serif';
      ctx.fillText(team.flag, W * 0.36, rowY[i]);
      ctx.font = 'bold 96px system-ui,sans-serif';
      ctx.fillStyle = win ? s.score : '#8aa0bd';
      ctx.fillText(score !== null ? String(score) : '—', W * 0.74, rowY[i]);
    });
  } else {
    ctx.fillStyle = '#4a6da0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 44px system-ui,sans-serif';
    ctx.fillText('TBD', W / 2, H / 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  return tex;
}

function makeLabelTexture(text: string, color: string): THREE.CanvasTexture {
  const W = 560, H = 130;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  roundRect(ctx, 6, 34, W - 12, H - 68, 30);
  ctx.fillStyle = 'rgba(8,16,30,0.72)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 54px system-ui,sans-serif';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.fillText(text, W / 2, H / 2);
  return new THREE.CanvasTexture(canvas);
}

function makeTrophyTexture(): THREE.CanvasTexture {
  const S = 320;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ffd24a';
  ctx.shadowBlur = 50;
  ctx.font = '220px "Apple Color Emoji","Segoe UI Emoji",serif';
  ctx.fillText('🏆', S / 2, S / 2 + 10);
  return new THREE.CanvasTexture(canvas);
}

// --- Sub-components ---

function MatchCard({
  match,
  position,
  width,
  height,
  style,
  opacity = 1,
}: {
  match: MatchDetail | null | undefined;
  position: [number, number, number];
  width: number;
  height: number;
  style: CardStyle;
  opacity?: number;
}) {
  const tex = useMemo(
    () => makeCardTexture(match, style),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [match?.id, match?.homeScore, match?.awayScore, match?.winnerTeamId, match?.homeTeam?.id, match?.awayTeam?.id, style],
  );
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <Billboard position={position}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={tex} transparent opacity={opacity} />
      </mesh>
    </Billboard>
  );
}

function RoundLabel({
  text,
  color,
  position,
  scale = 1,
}: {
  text: string;
  color: string;
  position: [number, number, number];
  scale?: number;
}) {
  const tex = useMemo(() => makeLabelTexture(text, color), [text, color]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <Billboard position={position}>
      <mesh scale={[4.6 * scale, 1.07 * scale, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} />
      </mesh>
    </Billboard>
  );
}

function Trophy({ position }: { position: [number, number, number] }) {
  const tex = useMemo(() => makeTrophyTexture(), []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <Billboard position={position}>
      <mesh>
        <planeGeometry args={[2.6, 2.6]} />
        <meshBasicMaterial map={tex} transparent />
      </mesh>
    </Billboard>
  );
}

function ChampLight() {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.intensity = 2.4 + Math.sin(clock.elapsedTime * 3) * 1.0;
    }
  });
  return <pointLight ref={ref} color={0xffd24a} intensity={2.4} distance={50} position={[0, 13, 2]} />;
}

function ConnectingLines({ positions }: { positions: THREE.Vector3[][] }) {
  const lineObjects = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.6 });
    return positions.slice(0, -1).flatMap((cur, ti) =>
      cur.map((p, i) => {
        const nxt = positions[ti + 1];
        const parent = nxt[Math.floor(i / 2)] ?? nxt[0];
        const geo = new THREE.BufferGeometry().setFromPoints([p, parent]);
        return new THREE.Line(geo, mat);
      }),
    );
  }, [positions]);

  useEffect(() => {
    return () => {
      for (const line of lineObjects) {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      }
    };
  }, [lineObjects]);

  return (
    <>
      {lineObjects.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </>
  );
}

function FogSetup() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const fog = new THREE.FogExp2(0x04060d, 0.017);
    // eslint-disable-next-line react-hooks/immutability -- R3F scene mutation is the canonical API
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// --- Main scene ---

function Scene({ matches }: { matches: MatchDetail[] }) {
  const byId = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);

  const tierPositions = useMemo<THREE.Vector3[][]>(
    () =>
      TIERS.map((tier) => {
        const n = tier.ids.length;
        return tier.ids.map((_, i) => {
          const ang = n > 1 ? (i / n) * Math.PI * 2 + tier.rot : 0;
          return new THREE.Vector3(Math.cos(ang) * tier.r, tier.y, Math.sin(ang) * tier.r);
        });
      }),
    [],
  );

  const finalTier = TIERS[TIERS.length - 1];
  const thirdPlaceAng = 2.55;
  const thirdPlaceR = 2.8;
  const thirdPos: [number, number, number] = [
    Math.cos(thirdPlaceAng) * thirdPlaceR,
    finalTier.y,
    Math.sin(thirdPlaceAng) * thirdPlaceR,
  ];

  return (
    <>
      <FogSetup />
      <ambientLight color={0x4a6da0} intensity={0.6} />
      <ChampLight />
      <Stars radius={80} depth={60} count={1000} factor={0.18} saturation={0} fade speed={0.3} />

      {/* Tier cards */}
      {TIERS.map((tier, ti) => {
        const n = tier.ids.length;
        const isFinal = ti === TIERS.length - 1;
        const style: CardStyle = isFinal ? 'gold' : 'default';
        const w = isFinal ? 3.0 : 2.0;
        const h = isFinal ? 3.6 : 2.4;

        return tier.ids.map((id, i) => {
          const ang = n > 1 ? (i / n) * Math.PI * 2 + tier.rot : 0;
          const pos: [number, number, number] = [
            Math.cos(ang) * tier.r,
            tier.y,
            Math.sin(ang) * tier.r,
          ];
          return (
            <MatchCard key={id} match={byId.get(id)} position={pos} width={w} height={h} style={style} />
          );
        });
      })}

      {/* Round labels */}
      {TIERS.map((tier) => (
        <RoundLabel
          key={tier.label}
          text={tier.label}
          color={tier.color}
          position={[tier.r > 0 ? tier.r + 2.4 : 2.6, tier.y, 0]}
        />
      ))}

      {/* Trophy */}
      <Trophy position={[0, finalTier.y + 3.1, 0]} />

      {/* 3rd place */}
      <MatchCard
        match={byId.get(THIRD_PLACE_ID)}
        position={thirdPos}
        width={1.8}
        height={2.2}
        style="bronze"
        opacity={0.72}
      />
      <RoundLabel
        text="3RD PLACE"
        color="#b8a060"
        position={[thirdPos[0], thirdPos[1] + 1.7, thirdPos[2]]}
        scale={0.65}
      />

      {/* Connecting lines */}
      <ConnectingLines positions={tierPositions} />

      {/* Post-processing */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.82} luminanceSmoothing={0.5} intensity={0.85} />
      </EffectComposer>

      <OrbitControls
        target={[0, 1, 0]}
        enableDamping
        dampingFactor={0.06}
        autoRotate
        autoRotateSpeed={0.8}
        minDistance={12}
        maxDistance={64}
      />
    </>
  );
}

// --- Exported component ---

export function BracketLayout3D({ matches }: BracketLayout3DProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '70vh',
        background: '#04060d',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <Canvas
        camera={{ position: [0, 4, 27], fov: 55, near: 0.1, far: 200 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene matches={matches} />
        </Suspense>
      </Canvas>
    </div>
  );
}
