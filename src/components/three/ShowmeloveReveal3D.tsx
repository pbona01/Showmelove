import { Component, type ReactNode, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { GiftAnimationType, GiftArtworkId } from '../../types/showmelove';
import { backOut, giftRevealTimeline, smootherstep } from '../../lib/animation';

export function detectWebGlSupport(): { supported: boolean; isSoftwareGl: boolean } {
  if (typeof document === 'undefined') {
    return { supported: false, isSoftwareGl: true };
  }
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) return { supported: false, isSoftwareGl: true };

    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

class WebGLErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

function easeInOutQuad(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function createHeartGeometry(scale = 1, depth = 0.34): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.58 * scale);
  shape.bezierCurveTo(
    0.15 * scale,
    -0.46 * scale,
    0.72 * scale,
    -0.06 * scale,
    0.72 * scale,
    0.34 * scale,
  );
  shape.bezierCurveTo(
    0.72 * scale,
    0.66 * scale,
    0.34 * scale,
    0.78 * scale,
    0.0 * scale,
    0.48 * scale,
  );
  shape.bezierCurveTo(
    -0.34 * scale,
    0.78 * scale,
    -0.72 * scale,
    0.66 * scale,
    -0.72 * scale,
    0.34 * scale,
  );
  shape.bezierCurveTo(
    -0.72 * scale,
    -0.06 * scale,
    -0.15 * scale,
    -0.46 * scale,
    0,
    -0.58 * scale,
  );

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth * scale,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.08 * scale,
    bevelThickness: 0.08 * scale,
    curveSegments: 14,
  });
  geo.center();
  return geo;
}

function StudioEnvironment({ isSoftwareGl }: { isSoftwareGl: boolean }) {
  const { gl, scene } = useThree();

  useEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.04;

    if (isSoftwareGl) {
      return;
    }

    const pmrem = new THREE.PMREMGenerator(gl);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    return () => {
      envTex.dispose();
      scene.environment = null;
    };
  }, [gl, scene, isSoftwareGl]);

  return null;
}

function SoftwareGlLoopDriver({ playKey }: { playKey: number }) {
  const { gl, invalidate } = useThree();

  useEffect(() => {
    let cancelled = false;
    let timerId = 0;

    const scheduleNext = () => {
      if (cancelled) return;
      const context = gl.getContext() as WebGL2RenderingContext;
      if (context && typeof context.fenceSync === 'function') {
        const sync = context.fenceSync(context.SYNC_GPU_COMMANDS_COMPLETE, 0);
        context.flush();
        const poll = () => {
          if (cancelled) {
            if (sync) context.deleteSync(sync);
            return;
          }
          const status = sync
            ? context.getSyncParameter(sync, context.SYNC_STATUS)
            : context.SIGNALED;
          if (status === context.UNSIGNALED) {
            timerId = window.setTimeout(poll, 6);
          } else {
            if (sync) context.deleteSync(sync);
            timerId = window.setTimeout(() => {
              if (!cancelled) {
                invalidate();
                scheduleNext();
              }
            }, 14);
          }
        };
        timerId = window.setTimeout(poll, 4);
      } else {
        timerId = window.setTimeout(() => {
          if (!cancelled) {
            invalidate();
            scheduleNext();
          }
        }, 18);
      }
    };

    invalidate();
    scheduleNext();

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [gl, invalidate, playKey]);

  return null;
}

interface GiftMeshProps {
  artworkId: GiftArtworkId;
  animationType: GiftAnimationType;
  themeColor: string;
  accentColor: string;
  payoffProgressRef: React.MutableRefObject<number>;
  animTimeRef: React.MutableRefObject<number>;
}

function GiftProp3D({
  artworkId,
  animationType,
  themeColor,
  accentColor,
  payoffProgressRef,
  animTimeRef,
}: GiftMeshProps) {
  const lidRef = useRef<THREE.Group | null>(null);
  const roseStemRef = useRef<THREE.Mesh | null>(null);
  const petalsRef = useRef<THREE.Group[]>([]);
  const sweepingPetalsRef = useRef<THREE.Group | null>(null);
  const teddyLeftArmRef = useRef<THREE.Group | null>(null);
  const teddyRightArmRef = useRef<THREE.Group | null>(null);
  const teddyHeartRef = useRef<THREE.Mesh | null>(null);
  const heartPulseGroupRef = useRef<THREE.Group | null>(null);
  const orbitHeartsRef = useRef<THREE.Group | null>(null);
  const confettiGroupRef = useRef<THREE.Group | null>(null);

  const miniHeartGeo = useMemo(() => createHeartGeometry(0.48, 0.24), []);
  const tinyHeartGeo = useMemo(() => createHeartGeometry(0.15, 0.09), []);
  const petalGeo = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.23, 14, 10);
    geo.scale(0.85, 1.28, 0.34);
    return geo;
  }, []);

  const confettiSeeds = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        return {
          dirX: Math.cos(angle) * (0.62 + (i % 3) * 0.24),
          dirY: 0.72 + (i % 4) * 0.24,
          dirZ: Math.sin(angle) * (0.48 + (i % 2) * 0.24),
          color:
            i % 4 === 0
              ? '#FF176C'
              : i % 4 === 1
                ? '#A855F7'
                : i % 4 === 2
                  ? '#F59E0B'
                  : '#24C888',
        };
      }),
    [],
  );

  const orbitHeartSeeds = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        angleOffset: (i / 8) * Math.PI * 2,
        radius: 0.78 + (i % 2) * 0.22,
        yOffset: ((i % 4) - 1.5) * 0.16,
      })),
    [],
  );

  useEffect(() => {
    return () => {
      miniHeartGeo.dispose();
      tinyHeartGeo.dispose();
      petalGeo.dispose();
    };
  }, [miniHeartGeo, tinyHeartGeo, petalGeo]);

  useFrame(() => {
    const p = payoffProgressRef.current;
    const t = animTimeRef.current;

    // 1. Gift Box: lid hinges open, ribbon bow bounces, 3D confetti erupts
    if (animationType === 'confetti-open' && lidRef.current) {
      const openAmt = easeOutBack(THREE.MathUtils.clamp(p * 1.45, 0, 1));
      lidRef.current.position.y = 0.26 + openAmt * 0.28 + Math.sin(p * Math.PI * 3) * 0.03 * p;
      lidRef.current.position.z = -openAmt * 0.3;
      lidRef.current.rotation.x = -openAmt * 0.96;

      if (confettiGroupRef.current) {
        confettiGroupRef.current.visible = p > 0.02;
        confettiGroupRef.current.children.forEach((child, idx) => {
          const seed = confettiSeeds[idx];
          if (!seed) return;
          const burst = easeOutCubic(Math.min(1, p * 1.15));
          child.position.set(
            seed.dirX * burst,
            0.28 + seed.dirY * burst - burst * burst * 0.34,
            seed.dirZ * burst,
          );
          child.rotation.set(t * 5.2 + idx, t * 4.1, idx);
          const s = p > 0.02 ? Math.max(0.01, 1 - Math.max(0, p - 0.72) * 2.8) : 0.01;
          child.scale.setScalar(s);
        });
      }
    }

    // 2. Rose: stem grows taller, petals unfurl layer by layer, petals sweep across foreground
    if (animationType === 'bloom') {
      const stemGrow = 0.65 + easeOutCubic(THREE.MathUtils.clamp(p * 1.5, 0, 1)) * 0.42;
      if (roseStemRef.current) {
        roseStemRef.current.scale.set(1, stemGrow, 1);
      }
      petalsRef.current.forEach((petal, idx) => {
        if (!petal) return;
        const stagger = Math.max(0, (p - (idx % 3) * 0.12) * 1.4);
        const bloom = easeOutBack(THREE.MathUtils.clamp(stagger, 0, 1));
        petal.rotation.x = 0.14 + bloom * 0.76;
        petal.position.y = 0.24 + Math.sin(idx + t * 3.2) * 0.015;
      });
      if (sweepingPetalsRef.current) {
        sweepingPetalsRef.current.visible = p > 0.08;
        sweepingPetalsRef.current.children.forEach((petal, idx) => {
          const sweep = easeOutCubic(Math.min(1, Math.max(0, (p - 0.08) * 1.15)));
          const angle = (idx / 8) * Math.PI * 2 + sweep * 1.5;
          petal.position.set(
            Math.cos(angle) * (0.3 + sweep * 0.85),
            0.25 + Math.sin(sweep * Math.PI) * 0.35 - sweep * 0.25,
            Math.sin(angle) * 0.35 + sweep * 0.95,
          );
          petal.rotation.set(sweep * 2.8, angle, sweep * 3.2);
          petal.scale.setScalar(Math.max(0.01, 0.65 * (1 - sweep * 0.45)));
        });
      }
    }

    // 3. Teddy Hug: bounces forward, opens both arms wide, hugs glowing heart + floating hearts
    if (animationType === 'wave') {
      const hugOpen = easeOutBack(THREE.MathUtils.clamp(p * 1.35, 0, 1));
      const sway = Math.sin(t * 5.8) * (p > 0.04 ? 0.12 : 0.03);
      if (teddyLeftArmRef.current) {
        teddyLeftArmRef.current.rotation.z = THREE.MathUtils.lerp(0.28, 1.28, hugOpen) + sway;
        teddyLeftArmRef.current.rotation.x = THREE.MathUtils.lerp(0, -0.45, hugOpen);
      }
      if (teddyRightArmRef.current) {
        teddyRightArmRef.current.rotation.z = THREE.MathUtils.lerp(-0.28, -1.28, hugOpen) - sway;
        teddyRightArmRef.current.rotation.x = THREE.MathUtils.lerp(0, -0.45, hugOpen);
      }
      if (teddyHeartRef.current) {
        const chestPulse = 0.26 + (p > 0.1 ? Math.abs(Math.sin(t * 6.4)) * 0.06 : 0);
        teddyHeartRef.current.scale.setScalar(chestPulse);
      }
      if (orbitHeartsRef.current) {
        orbitHeartsRef.current.visible = p > 0.05;
        orbitHeartsRef.current.children.forEach((child, idx) => {
          const rise = easeOutCubic(Math.min(1, (p + idx * 0.04) * 1.1));
          child.position.set(
            ((idx % 4) - 1.5) * 0.36,
            0.15 + rise * 0.92,
            0.22 + rise * 0.26,
          );
          child.scale.setScalar(Math.max(0.01, 0.95 - rise * 0.55));
        });
      }
    }

    // 4. Little Heart: mini hearts orbit/coalesce -> pulsing glowing hero heart moving toward viewer
    if (animationType === 'pulse' && heartPulseGroupRef.current) {
      const coalesce = easeInOutQuad(THREE.MathUtils.clamp(p * 1.15, 0, 1));
      const pulse = p > 0.02 ? 1 + Math.abs(Math.sin(t * 6.8)) * 0.22 : 1;
      heartPulseGroupRef.current.scale.setScalar(pulse);
      heartPulseGroupRef.current.position.z = coalesce * 0.28;

      if (orbitHeartsRef.current) {
        orbitHeartsRef.current.visible = p > 0.02;
        orbitHeartsRef.current.children.forEach((child, idx) => {
          const seed = orbitHeartSeeds[idx];
          if (!seed) return;
          const swirlAngle = seed.angleOffset + t * 3.1;
          const r = seed.radius * (1 - coalesce * 0.72);
          child.position.set(
            Math.cos(swirlAngle) * r,
            seed.yOffset + Math.sin(t * 4 + idx) * 0.1 + coalesce * 0.18,
            Math.sin(swirlAngle) * r * 0.6 + coalesce * 0.28,
          );
          child.scale.setScalar(Math.max(0.01, 1 - coalesce * 0.65));
        });
      }
    }
  });

  if (artworkId === 'little-heart') {
    return (
      <group>
        <group ref={heartPulseGroupRef}>
          <mesh geometry={miniHeartGeo} castShadow>
            <meshPhysicalMaterial
              color={themeColor || '#FF176C'}
              emissive="#FF176C"
              emissiveIntensity={0.18}
              roughness={0.16}
              metalness={0.05}
              clearcoat={0.98}
              clearcoatRoughness={0.08}
            />
          </mesh>
          <mesh position={[-0.12, 0.06, 0.17]}>
            <sphereGeometry args={[0.036, 12, 12]} />
            <meshStandardMaterial color="#171314" roughness={0.2} />
          </mesh>
          <mesh position={[0.12, 0.06, 0.17]}>
            <sphereGeometry args={[0.036, 12, 12]} />
            <meshStandardMaterial color="#171314" roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.04, 0.17]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.06, 0.016, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#171314" roughness={0.25} />
          </mesh>
        </group>

        <group ref={orbitHeartsRef} visible={false}>
          {orbitHeartSeeds.map((_, i) => (
            <mesh key={i} geometry={tinyHeartGeo}>
              <meshPhysicalMaterial
                color={i % 2 === 0 ? '#FF5F9A' : '#A855F7'}
                emissive={i % 2 === 0 ? '#FF176C' : '#A855F7'}
                emissiveIntensity={0.25}
                roughness={0.18}
                clearcoat={0.9}
              />
            </mesh>
          ))}
        </group>
      </group>
    );
  }

  if (artworkId === 'rose') {
    return (
      <group position={[0, -0.1, 0]}>
        <mesh ref={roseStemRef} position={[0, -0.18, 0]}>
          <cylinderGeometry args={[0.035, 0.042, 0.72, 12]} />
          <meshStandardMaterial color="#2D7A4D" roughness={0.55} />
        </mesh>
        <mesh position={[-0.14, -0.14, 0]} rotation={[0, 0, 0.7]} scale={[1.2, 0.55, 0.35]}>
          <sphereGeometry args={[0.14, 12, 10]} />
          <meshStandardMaterial color="#3B9B63" roughness={0.45} />
        </mesh>
        <mesh position={[0.14, -0.24, 0]} rotation={[0, 0, -0.7]} scale={[1.2, 0.55, 0.35]}>
          <sphereGeometry args={[0.14, 12, 10]} />
          <meshStandardMaterial color="#2D7A4D" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.26, 0]}>
          <sphereGeometry args={[0.17, 16, 16]} />
          <meshPhysicalMaterial
            color={themeColor || '#DF0756'}
            roughness={0.22}
            clearcoat={0.75}
          />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = (i / 6) * Math.PI * 2;
          return (
            <group key={i} rotation={[0, angle, 0]}>
              <group
                ref={(el) => {
                  if (el) petalsRef.current[i] = el;
                }}
                position={[0, 0.22, 0.14]}
              >
                <mesh geometry={petalGeo}>
                  <meshPhysicalMaterial
                    color={i % 2 === 0 ? '#DF0756' : '#FF5F9A'}
                    roughness={0.26}
                    clearcoat={0.65}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              </group>
            </group>
          );
        })}

        <group ref={sweepingPetalsRef} visible={false}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <mesh key={i} geometry={petalGeo}>
              <meshPhysicalMaterial
                color={i % 2 === 0 ? '#FF176C' : '#F472B6'}
                roughness={0.25}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </group>
      </group>
    );
  }

  if (artworkId === 'teddy-hug') {
    return (
      <group position={[0, -0.05, 0]}>
        <mesh position={[0, -0.12, 0]} scale={[1, 1.1, 0.9]}>
          <sphereGeometry args={[0.26, 16, 14]} />
          <meshStandardMaterial color="#B86B43" roughness={0.78} />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <sphereGeometry args={[0.23, 16, 14]} />
          <meshStandardMaterial color="#C87A50" roughness={0.75} />
        </mesh>
        <mesh position={[-0.18, 0.42, 0]}>
          <sphereGeometry args={[0.085, 12, 12]} />
          <meshStandardMaterial color="#9E5530" roughness={0.8} />
        </mesh>
        <mesh position={[0.18, 0.42, 0]}>
          <sphereGeometry args={[0.085, 12, 12]} />
          <meshStandardMaterial color="#9E5530" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.2, 0.19]} scale={[1.1, 0.85, 0.7]}>
          <sphereGeometry args={[0.095, 12, 10]} />
          <meshStandardMaterial color="#FAF7FB" roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.23, 0.26]}>
          <sphereGeometry args={[0.026, 10, 10]} />
          <meshStandardMaterial color="#171314" roughness={0.25} />
        </mesh>
        <mesh position={[-0.08, 0.28, 0.2]}>
          <sphereGeometry args={[0.025, 10, 10]} />
          <meshStandardMaterial color="#171314" roughness={0.2} />
        </mesh>
        <mesh position={[0.08, 0.28, 0.2]}>
          <sphereGeometry args={[0.025, 10, 10]} />
          <meshStandardMaterial color="#171314" roughness={0.2} />
        </mesh>

        <group ref={teddyLeftArmRef} position={[-0.24, 0.02, 0.06]}>
          <mesh position={[-0.07, 0.04, 0.04]} rotation={[0, 0, 0.5]}>
            <capsuleGeometry args={[0.065, 0.16, 8, 12]} />
            <meshStandardMaterial color="#B86B43" roughness={0.78} />
          </mesh>
        </group>
        <group ref={teddyRightArmRef} position={[0.24, 0.02, 0.06]}>
          <mesh position={[0.07, 0.04, 0.04]} rotation={[0, 0, -0.5]}>
            <capsuleGeometry args={[0.065, 0.16, 8, 12]} />
            <meshStandardMaterial color="#B86B43" roughness={0.78} />
          </mesh>
        </group>

        <mesh ref={teddyHeartRef} position={[0, -0.08, 0.24]} scale={0.26} geometry={miniHeartGeo}>
          <meshPhysicalMaterial
            color="#FF176C"
            emissive="#FF176C"
            emissiveIntensity={0.24}
            roughness={0.18}
            clearcoat={0.9}
          />
        </mesh>

        <group ref={orbitHeartsRef} visible={false}>
          {orbitHeartSeeds.map((_, i) => (
            <mesh key={i} geometry={tinyHeartGeo}>
              <meshPhysicalMaterial
                color={i % 2 === 0 ? '#FF176C' : '#A855F7'}
                roughness={0.2}
                clearcoat={0.85}
              />
            </mesh>
          ))}
        </group>
      </group>
    );
  }

  // gift-box (purple / pink signature celebratory box)
  return (
    <group>
      <mesh position={[0, -0.05, 0]} castShadow>
        <boxGeometry args={[0.58, 0.48, 0.58]} />
        <meshPhysicalMaterial
          color={themeColor || '#A855F7'}
          roughness={0.2}
          clearcoat={0.88}
          clearcoatRoughness={0.12}
        />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[0.12, 0.49, 0.6]} />
        <meshStandardMaterial
          color={accentColor || '#FDE68A'}
          roughness={0.26}
          metalness={0.65}
        />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[0.6, 0.49, 0.12]} />
        <meshStandardMaterial
          color={accentColor || '#FDE68A'}
          roughness={0.26}
          metalness={0.65}
        />
      </mesh>

      <group ref={lidRef} position={[0, 0.26, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.64, 0.14, 0.64]} />
          <meshPhysicalMaterial
            color={themeColor || '#8439D5'}
            roughness={0.18}
            clearcoat={0.9}
          />
        </mesh>
        <mesh>
          <boxGeometry args={[0.14, 0.15, 0.66]} />
          <meshStandardMaterial color="#FDE68A" roughness={0.24} metalness={0.7} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.66, 0.15, 0.14]} />
          <meshStandardMaterial color="#FDE68A" roughness={0.24} metalness={0.7} />
        </mesh>
        <mesh position={[-0.1, 0.12, 0]} rotation={[0, 0, 0.35]}>
          <torusGeometry args={[0.09, 0.028, 10, 16]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.24} metalness={0.7} />
        </mesh>
        <mesh position={[0.1, 0.12, 0]} rotation={[0, 0, -0.35]}>
          <torusGeometry args={[0.09, 0.028, 10, 16]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.24} metalness={0.7} />
        </mesh>
      </group>

      <group ref={confettiGroupRef} visible={false}>
        {confettiSeeds.map((seed, i) => (
          <mesh key={i}>
            <boxGeometry args={[0.065, 0.065, 0.015]} />
            <meshStandardMaterial color={seed.color} roughness={0.28} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

interface RevealChoreographyProps {
  artworkId: GiftArtworkId;
  animationType: GiftAnimationType;
  themeColor: string;
  accentColor: string;
  playKey: number;
  skipped: boolean;
  isDark: boolean;
  onPayoffStart: () => void;
  onRevealComplete: () => void;
}

function MascotAndGiftRig({
  artworkId,
  animationType,
  themeColor,
  accentColor,
  playKey,
  skipped,
  isDark,
  onPayoffStart,
  onRevealComplete,
}: RevealChoreographyProps) {
  const mascotGroupRef = useRef<THREE.Group | null>(null);
  const headBodyRef = useRef<THREE.Group | null>(null);
  const leftEyeGroupRef = useRef<THREE.Group | null>(null);
  const rightEyeGroupRef = useRef<THREE.Group | null>(null);
  const leftArmRef = useRef<THREE.Group | null>(null);
  const rightArmRef = useRef<THREE.Group | null>(null);
  const giftCarrierRef = useRef<THREE.Group | null>(null);
  const auraRingRef = useRef<THREE.Mesh | null>(null);
  const smileRef = useRef<THREE.Mesh | null>(null);

  const animTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const payoffFiredRef = useRef(false);
  const completeFiredRef = useRef(false);
  const payoffProgressRef = useRef(0);

  const mascotHeartGeo = useMemo(() => createHeartGeometry(1.18, 0.42), []);

  useEffect(() => {
    animTimeRef.current = 0;
    frameCountRef.current = 0;
    payoffFiredRef.current = false;
    completeFiredRef.current = false;
    payoffProgressRef.current = 0;

    if (mascotGroupRef.current) {
      mascotGroupRef.current.position.set(0, -0.42, -2.2);
      mascotGroupRef.current.scale.setScalar(0.56);
      mascotGroupRef.current.rotation.set(0, 0, 0);
    }
    if (giftCarrierRef.current) {
      giftCarrierRef.current.position.set(0, -0.68, -1.65);
      giftCarrierRef.current.scale.setScalar(0.5);
      giftCarrierRef.current.rotation.set(0, -0.35, 0);
    }
    if (auraRingRef.current) {
      auraRingRef.current.visible = false;
    }
  }, [playKey]);

  useEffect(() => {
    if (skipped && animTimeRef.current < giftRevealTimeline.totalDuration) {
      animTimeRef.current = giftRevealTimeline.totalDuration;
      payoffProgressRef.current = 1;
      payoffFiredRef.current = true;
      completeFiredRef.current = true;
    }
  }, [skipped]);

  useEffect(() => {
    return () => {
      mascotHeartGeo.dispose();
    };
  }, [mascotHeartGeo]);

  useFrame((state, delta) => {
    frameCountRef.current += 1;
    const step = frameCountRef.current <= 1 ? 0.016 : Math.min(delta, 0.12);
    animTimeRef.current += step;
    const elapsed = animTimeRef.current;

    // Shared 2.6s cinematic timeline (kept in sync with the DOM fallback).
    const enterT = THREE.MathUtils.clamp(
      (elapsed - giftRevealTimeline.sealedBox.start) / giftRevealTimeline.sealedBox.duration,
      0,
      1,
    );
    const enterEase = smootherstep(0, 1, enterT);

    // Expressive blink at 0.42s - 0.60s and again at 3.20s - 3.36s
    const blink1 =
      elapsed >= 0.42 && elapsed <= 0.6
        ? Math.sin(((elapsed - 0.42) / 0.18) * Math.PI)
        : 0;
    const blink2 =
      elapsed >= 3.2 && elapsed <= 3.36
        ? Math.sin(((elapsed - 3.2) / 0.16) * Math.PI)
        : 0;
    const eyeScaleY = Math.max(0.08, 1 - Math.max(blink1, blink2) * 0.92);

    const reachT = THREE.MathUtils.clamp(
      (elapsed - giftRevealTimeline.lidOpen.start) / giftRevealTimeline.lidOpen.duration,
      0,
      1,
    );
    const reachEase = easeOutCubic(reachT);

    const releaseT = THREE.MathUtils.clamp(
      (elapsed - giftRevealTimeline.giftRise.start) / giftRevealTimeline.giftRise.duration,
      0,
      1,
    );
    const releaseEase = backOut(releaseT);

    const payoffT = THREE.MathUtils.clamp(
      (elapsed - giftRevealTimeline.lidOpen.start) /
        (giftRevealTimeline.particleBurst.start + giftRevealTimeline.particleBurst.duration - giftRevealTimeline.lidOpen.start),
      0,
      1,
    );
    payoffProgressRef.current = payoffT;

    if (elapsed >= giftRevealTimeline.particleBurst.start && !payoffFiredRef.current) {
      payoffFiredRef.current = true;
      onPayoffStart();
    }

    if (elapsed >= giftRevealTimeline.totalDuration && !completeFiredRef.current) {
      completeFiredRef.current = true;
      onRevealComplete();
    }

    const cam = state.camera as THREE.PerspectiveCamera;
    if (cam && typeof cam.fov === 'number') {
      const fovKick = Math.sin(releaseT * Math.PI) * 4.4;
      const targetFov = 40 - fovKick;
      if (Math.abs(cam.fov - targetFov) > 0.02) {
        cam.fov = targetFov;
        cam.updateProjectionMatrix();
      }
    }

    const idleBob = Math.sin(elapsed * 2.6) * 0.038;

    if (mascotGroupRef.current) {
      mascotGroupRef.current.position.z = THREE.MathUtils.lerp(-2.2, -0.95, enterEase);
      mascotGroupRef.current.position.y =
        THREE.MathUtils.lerp(-0.42, 0.62, enterEase) +
        Math.sin(enterT * Math.PI) * 0.12 +
        idleBob;
      const popScale = THREE.MathUtils.lerp(0.56, 0.96, enterEase);
      mascotGroupRef.current.scale.setScalar(popScale);
      mascotGroupRef.current.rotation.x = THREE.MathUtils.lerp(0, 0.14, reachEase);
    }

    if (headBodyRef.current) {
      headBodyRef.current.rotation.z =
        Math.sin(enterT * Math.PI * 2) * 0.065 + Math.sin(elapsed * 2.0) * 0.03;
      const bounceScale = 1 + Math.sin(payoffT * Math.PI) * 0.08;
      headBodyRef.current.scale.set(bounceScale, bounceScale, bounceScale);
    }

    if (leftEyeGroupRef.current && rightEyeGroupRef.current) {
      leftEyeGroupRef.current.scale.set(1, eyeScaleY, 1);
      rightEyeGroupRef.current.scale.set(1, eyeScaleY, 1);
    }

    if (smileRef.current) {
      const smileStretch = 1 + reachEase * 0.16 + Math.sin(payoffT * Math.PI) * 0.16;
      smileRef.current.scale.set(smileStretch, smileStretch, 1);
    }

    if (leftArmRef.current && rightArmRef.current) {
      const reachAngle =
        THREE.MathUtils.lerp(0.28, 1.2, reachEase) - Math.min(1, releaseT) * 0.25;
      leftArmRef.current.rotation.x = -reachAngle;
      rightArmRef.current.rotation.x = -reachAngle;
      leftArmRef.current.rotation.z = THREE.MathUtils.lerp(0.32, -0.24, reachEase);
      rightArmRef.current.rotation.z = THREE.MathUtils.lerp(-0.32, 0.24, reachEase);
    }

    if (giftCarrierRef.current) {
      const mascotZ = mascotGroupRef.current?.position.z ?? -0.95;
      const mascotY = mascotGroupRef.current?.position.y ?? 0.62;

      const handWorldZ = mascotZ + THREE.MathUtils.lerp(0.55, 1.08, reachEase);
      const handWorldY = mascotY - THREE.MathUtils.lerp(0.32, 0.44, reachEase);

      const finalZ = 1.56;
      const finalY = -0.56 + idleBob * 0.65;

      const giftZ = THREE.MathUtils.lerp(handWorldZ, finalZ, releaseEase);
      const giftY =
        THREE.MathUtils.lerp(handWorldY, finalY, releaseEase) +
        Math.sin(releaseT * Math.PI) * 0.14;

      giftCarrierRef.current.position.set(0, giftY, giftZ);

      const giftScale =
        THREE.MathUtils.lerp(0.5, 0.62, reachEase) + releaseEase * 0.12;
      giftCarrierRef.current.scale.setScalar(giftScale);
      giftCarrierRef.current.rotation.y =
        THREE.MathUtils.lerp(-0.35, 0.14, releaseEase) + Math.sin(elapsed * 1.7) * 0.14;
    }

    if (auraRingRef.current) {
      const ringProgress = THREE.MathUtils.clamp(
        (elapsed - giftRevealTimeline.particleBurst.start) / giftRevealTimeline.particleBurst.duration,
        0,
        1,
      );
      auraRingRef.current.visible = ringProgress > 0 && ringProgress < 1;
      const ringScale = 0.35 + easeOutCubic(ringProgress) * 1.65;
      auraRingRef.current.scale.setScalar(ringScale);
      const mat = auraRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - ringProgress) * 0.62;
    }
  });

  return (
    <group>
      <group ref={mascotGroupRef} position={[0, -0.75, -3.1]} scale={0.38}>
        <group ref={headBodyRef}>
          <mesh geometry={mascotHeartGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              color="#FF176C"
              roughness={0.2}
              metalness={0.04}
              clearcoat={0.86}
              clearcoatRoughness={0.12}
              envMapIntensity={0.75}
            />
          </mesh>

          <group ref={leftEyeGroupRef} position={[-0.27, 0.12, 0.34]}>
            <mesh>
              <sphereGeometry args={[0.074, 14, 14]} />
              <meshStandardMaterial color="#120E0F" roughness={0.55} envMapIntensity={0.2} />
            </mesh>
            <mesh position={[-0.025, 0.025, 0.058]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
          </group>

          <group ref={rightEyeGroupRef} position={[0.27, 0.12, 0.34]}>
            <mesh>
              <sphereGeometry args={[0.074, 14, 14]} />
              <meshStandardMaterial color="#120E0F" roughness={0.55} envMapIntensity={0.2} />
            </mesh>
            <mesh position={[-0.025, 0.025, 0.058]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
          </group>

          <mesh position={[-0.42, -0.04, 0.31]} scale={[1.3, 0.75, 0.4]}>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshStandardMaterial color="#FF92B7" roughness={0.7} envMapIntensity={0.25} />
          </mesh>
          <mesh position={[0.42, -0.04, 0.31]} scale={[1.3, 0.75, 0.4]}>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshStandardMaterial color="#FF92B7" roughness={0.7} envMapIntensity={0.25} />
          </mesh>

          <mesh ref={smileRef} position={[0, -0.07, 0.34]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.14, 0.034, 10, 20, Math.PI]} />
            <meshStandardMaterial color="#120E0F" roughness={0.55} envMapIntensity={0.2} />
          </mesh>
        </group>

        <group ref={leftArmRef} position={[-0.78, -0.18, 0.08]}>
          <mesh position={[-0.12, -0.24, 0.12]} rotation={[0.4, 0, -0.2]}>
            <capsuleGeometry args={[0.056, 0.46, 8, 10]} />
            <meshStandardMaterial color="#120E0F" roughness={0.72} envMapIntensity={0.18} />
          </mesh>
          <mesh position={[-0.14, -0.5, 0.25]}>
            <sphereGeometry args={[0.082, 10, 10]} />
            <meshStandardMaterial color="#120E0F" roughness={0.72} envMapIntensity={0.18} />
          </mesh>
        </group>

        <group ref={rightArmRef} position={[0.78, -0.18, 0.08]}>
          <mesh position={[0.12, -0.24, 0.12]} rotation={[0.4, 0, 0.2]}>
            <capsuleGeometry args={[0.056, 0.46, 8, 10]} />
            <meshStandardMaterial color="#120E0F" roughness={0.72} envMapIntensity={0.18} />
          </mesh>
          <mesh position={[0.14, -0.5, 0.25]}>
            <sphereGeometry args={[0.082, 10, 10]} />
            <meshStandardMaterial color="#120E0F" roughness={0.72} envMapIntensity={0.18} />
          </mesh>
        </group>

        <mesh position={[-0.28, -0.92, 0]}>
          <capsuleGeometry args={[0.055, 0.32, 8, 10]} />
          <meshStandardMaterial color="#120E0F" roughness={0.72} envMapIntensity={0.18} />
        </mesh>
        <mesh position={[0.28, -0.92, 0]}>
          <capsuleGeometry args={[0.055, 0.32, 8, 10]} />
          <meshStandardMaterial color="#120E0F" roughness={0.72} envMapIntensity={0.18} />
        </mesh>
        <mesh position={[-0.31, -1.12, 0.08]} scale={[1.3, 0.6, 1.8]}>
          <sphereGeometry args={[0.08, 10, 10]} />
          <meshStandardMaterial color="#120E0F" roughness={0.72} envMapIntensity={0.18} />
        </mesh>
        <mesh position={[0.31, -1.12, 0.08]} scale={[1.3, 0.6, 1.8]}>
          <sphereGeometry args={[0.08, 10, 10]} />
          <meshStandardMaterial color="#120E0F" roughness={0.72} envMapIntensity={0.18} />
        </mesh>
        <mesh position={[0, -1.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.52, 24]} />
          <meshBasicMaterial
            color={isDark ? '#A855F7' : '#D9C2E9'}
            transparent
            opacity={isDark ? 0.28 : 0.3}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Shockwave burst ring */}
      <mesh ref={auraRingRef} position={[0, -0.52, 1.38]} visible={false}>
        <ringGeometry args={[0.56, 0.72, 32]} />
        <meshBasicMaterial color="#A855F7" transparent opacity={0.55} depthWrite={false} />
      </mesh>

      <group ref={giftCarrierRef} position={[0, -0.68, -1.65]} scale={0.5}>
        <GiftProp3D
          artworkId={artworkId}
          animationType={animationType}
          themeColor={themeColor}
          accentColor={accentColor}
          payoffProgressRef={payoffProgressRef}
          animTimeRef={animTimeRef}
        />
      </group>
    </group>
  );
}

export interface ShowmeloveReveal3DProps {
  artworkId: GiftArtworkId;
  animationType: GiftAnimationType;
  themeColor: string;
  accentColor: string;
  playKey: number;
  skipped?: boolean;
  isDark?: boolean;
  onPayoffStart: () => void;
  onRevealComplete: () => void;
  fallback: ReactNode;
}

export function ShowmeloveReveal3D({
  artworkId,
  animationType,
  themeColor,
  accentColor,
  playKey,
  skipped = false,
  isDark = true,
  onPayoffStart,
  onRevealComplete,
  fallback,
}: ShowmeloveReveal3DProps) {
  const webgl = useMemo(() => detectWebGlSupport(), []);

  if (!webgl.supported) {
    return <>{fallback}</>;
  }

  return (
    <WebGLErrorBoundary fallback={fallback}>
      <div className="w-full h-full relative" data-testid="reveal-3d-canvas">
        <Canvas
          frameloop={webgl.isSoftwareGl ? 'demand' : 'always'}
          dpr={webgl.isSoftwareGl ? 1 : [1, 1.5]}
          shadows={!webgl.isSoftwareGl}
          camera={{ position: [0, 0.15, 5.85], fov: 40, near: 0.1, far: 40 }}
          gl={{
            antialias: !webgl.isSoftwareGl,
            alpha: true,
            powerPreference: 'high-performance',
          }}
        >
          <StudioEnvironment isSoftwareGl={webgl.isSoftwareGl} />
          <hemisphereLight
            args={[
              isDark ? '#FFE6F3' : '#FFF8FC',
              isDark ? '#2D1B3B' : '#E9D8EE',
              webgl.isSoftwareGl ? 1.15 : 0.55,
            ]}
          />
          {webgl.isSoftwareGl && (
            <>
              <ambientLight intensity={0.95} color="#FFF8FC" />
              <directionalLight position={[0, 1.0, 5.2]} intensity={1.15} color="#FFFFFF" />
            </>
          )}
          <directionalLight
            position={[3.5, 5, 4.5]}
            intensity={1.4}
            color="#FFF2F8"
            castShadow={!webgl.isSoftwareGl}
          />
          <directionalLight position={[-3.5, 2, -2]} intensity={0.55} color="#D8B4FE" />
          <MascotAndGiftRig
            artworkId={artworkId}
            animationType={animationType}
            themeColor={themeColor}
            accentColor={accentColor}
            playKey={playKey}
            skipped={skipped}
            isDark={isDark}
            onPayoffStart={onPayoffStart}
            onRevealComplete={onRevealComplete}
          />
          {webgl.isSoftwareGl && <SoftwareGlLoopDriver playKey={playKey} />}
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
}
