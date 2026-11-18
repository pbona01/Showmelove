import { Component, type ReactNode, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { GiftAnimationType, GiftArtworkId } from '../../types/showmelove';

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
    gl.toneMappingExposure = 0.96;

    // Skip heavy CPU PMREM baking on software WebGL so first frame appears immediately
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

/**
 * Used ONLY on headless software-WebGL (SwiftShader) so screenshots/clicks never hang.
 * Real GPUs use frameloop="always" natively at 60/120Hz with zero extra scheduling overhead.
 */
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
            }, 12);
          }
        };
        timerId = window.setTimeout(poll, 4);
      } else {
        timerId = window.setTimeout(() => {
          if (!cancelled) {
            invalidate();
            scheduleNext();
          }
        }, 16);
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
  const petalsRef = useRef<THREE.Group[]>([]);
  const driftingPetalsRef = useRef<THREE.Group | null>(null);
  const teddyLeftArmRef = useRef<THREE.Group | null>(null);
  const teddyRightArmRef = useRef<THREE.Group | null>(null);
  const heartPulseGroupRef = useRef<THREE.Group | null>(null);
  const floatingHeartsRef = useRef<THREE.Group | null>(null);
  const confettiGroupRef = useRef<THREE.Group | null>(null);

  const miniHeartGeo = useMemo(() => createHeartGeometry(0.46, 0.22), []);
  const tinyHeartGeo = useMemo(() => createHeartGeometry(0.14, 0.09), []);
  const petalGeo = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.22, 14, 10);
    geo.scale(0.85, 1.25, 0.35);
    return geo;
  }, []);

  const confettiSeeds = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        return {
          dirX: Math.cos(angle) * (0.55 + (i % 3) * 0.24),
          dirY: 0.68 + (i % 4) * 0.22,
          dirZ: Math.sin(angle) * (0.42 + (i % 2) * 0.22),
          color: i % 3 === 0 ? '#E62E45' : i % 3 === 1 ? '#F59E0B' : '#FF8FA3',
        };
      }),
    [],
  );

  const floatingHeartSeeds = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        x: (i - 2.5) * 0.22,
        z: (i % 2 === 0 ? 1 : -1) * 0.14,
        speed: 0.9 + (i % 3) * 0.25,
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

    if (animationType === 'confetti-open' && lidRef.current) {
      const openAmt = easeOutBack(THREE.MathUtils.clamp(p * 1.4, 0, 1));
      lidRef.current.position.y = 0.26 + openAmt * 0.24;
      lidRef.current.position.z = -openAmt * 0.26;
      lidRef.current.rotation.x = -openAmt * 0.9;
      if (confettiGroupRef.current) {
        confettiGroupRef.current.visible = p > 0.03;
        confettiGroupRef.current.children.forEach((child, idx) => {
          const seed = confettiSeeds[idx];
          if (!seed) return;
          const burst = easeOutCubic(Math.min(1, p * 1.35));
          child.position.set(
            seed.dirX * burst,
            0.25 + seed.dirY * burst - burst * burst * 0.25,
            seed.dirZ * burst,
          );
          child.rotation.set(t * 4.5 + idx, t * 3.8, idx);
          const s = p > 0.03 ? Math.max(0.01, 1 - Math.max(0, p - 0.72) * 3.2) : 0.01;
          child.scale.setScalar(s);
        });
      }
    }

    if (animationType === 'bloom') {
      const bloom = easeOutBack(THREE.MathUtils.clamp(p * 1.25, 0, 1));
      petalsRef.current.forEach((petal, idx) => {
        if (!petal) return;
        const baseTilt = 0.22 + bloom * 0.64;
        petal.rotation.x = baseTilt;
        petal.position.y = 0.24 + Math.sin(idx + t * 3.5) * 0.014;
      });
      if (driftingPetalsRef.current) {
        driftingPetalsRef.current.visible = p > 0.06;
        driftingPetalsRef.current.children.forEach((petal, idx) => {
          const angle = (idx / 6) * Math.PI * 2 + p * 0.9;
          const drift = easeOutCubic(Math.min(1, Math.max(0, (p - 0.06) * 1.25)));
          petal.position.set(
            Math.cos(angle) * (0.28 + drift * 0.5),
            0.3 + drift * 0.24 - drift * drift * 0.35,
            Math.sin(angle) * (0.25 + drift * 0.32),
          );
          petal.rotation.set(drift * 2.2, angle, drift * 2.8);
          petal.scale.setScalar(Math.max(0.01, 0.58 * (1 - drift * 0.55)));
        });
      }
    }

    // Teddy Hug flings BOTH arms wide open with energetic TikTok Live bounce
    if (animationType === 'wave') {
      const hugOpen = easeOutBack(THREE.MathUtils.clamp(p * 1.35, 0, 1));
      const sway = Math.sin(t * 6.5) * (p > 0.04 ? 0.14 : 0.03);
      if (teddyLeftArmRef.current) {
        teddyLeftArmRef.current.rotation.z = THREE.MathUtils.lerp(0.28, 1.24, hugOpen) + sway;
        teddyLeftArmRef.current.rotation.x = THREE.MathUtils.lerp(0, -0.4, hugOpen);
      }
      if (teddyRightArmRef.current) {
        teddyRightArmRef.current.rotation.z = THREE.MathUtils.lerp(-0.28, -1.24, hugOpen) - sway;
        teddyRightArmRef.current.rotation.x = THREE.MathUtils.lerp(0, -0.4, hugOpen);
      }
    }

    // Little Heart double-beat pulse + rising mini hearts
    if (animationType === 'pulse' && heartPulseGroupRef.current) {
      const pulse = p > 0.02 ? 1 + Math.abs(Math.sin(t * 7.2)) * 0.2 : 1;
      heartPulseGroupRef.current.scale.setScalar(pulse);
      if (floatingHeartsRef.current) {
        floatingHeartsRef.current.visible = p > 0.04;
        floatingHeartsRef.current.children.forEach((child, idx) => {
          const seed = floatingHeartSeeds[idx];
          if (!seed) return;
          const rise = easeOutCubic(Math.min(1, p * seed.speed));
          child.position.set(
            seed.x * (0.5 + rise * 0.85),
            0.18 + rise * 0.78,
            seed.z + rise * 0.14,
          );
          const s = p > 0.04 ? Math.max(0.01, 1 - Math.max(0, rise - 0.6) * 2.1) : 0.01;
          child.scale.setScalar(s);
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
              color={themeColor || '#E62E45'}
              roughness={0.18}
              metalness={0.05}
              clearcoat={0.95}
              clearcoatRoughness={0.1}
            />
          </mesh>
          <mesh position={[-0.12, 0.06, 0.16]}>
            <sphereGeometry args={[0.036, 12, 12]} />
            <meshStandardMaterial color="#171314" roughness={0.2} />
          </mesh>
          <mesh position={[0.12, 0.06, 0.16]}>
            <sphereGeometry args={[0.036, 12, 12]} />
            <meshStandardMaterial color="#171314" roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.04, 0.16]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.06, 0.016, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#171314" roughness={0.25} />
          </mesh>
        </group>

        <group ref={floatingHeartsRef} visible={false}>
          {floatingHeartSeeds.map((_, i) => (
            <mesh key={i} geometry={tinyHeartGeo}>
              <meshPhysicalMaterial
                color={i % 2 === 0 ? '#FF5F78' : '#E62E45'}
                roughness={0.2}
                clearcoat={0.85}
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
        <mesh position={[0, -0.18, 0]}>
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
            color={themeColor || '#D9264E'}
            roughness={0.25}
            clearcoat={0.65}
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
                    color={i % 2 === 0 ? '#E62E45' : '#FF5F78'}
                    roughness={0.28}
                    clearcoat={0.55}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              </group>
            </group>
          );
        })}

        <group ref={driftingPetalsRef} visible={false}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={i} geometry={petalGeo}>
              <meshPhysicalMaterial
                color={i % 2 === 0 ? '#E62E45' : '#FF8FA3'}
                roughness={0.3}
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
          <meshStandardMaterial color="#FDF8F3" roughness={0.65} />
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

        <mesh position={[0, -0.08, 0.23]} scale={0.26} geometry={miniHeartGeo}>
          <meshPhysicalMaterial color="#E62E45" roughness={0.2} clearcoat={0.85} />
        </mesh>
      </group>
    );
  }

  // gift-box
  return (
    <group>
      <mesh position={[0, -0.05, 0]} castShadow>
        <boxGeometry args={[0.58, 0.48, 0.58]} />
        <meshPhysicalMaterial
          color={themeColor || '#E62E45'}
          roughness={0.22}
          clearcoat={0.8}
          clearcoatRoughness={0.14}
        />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[0.12, 0.49, 0.6]} />
        <meshStandardMaterial
          color={accentColor || '#FDE68A'}
          roughness={0.28}
          metalness={0.65}
        />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[0.6, 0.49, 0.12]} />
        <meshStandardMaterial
          color={accentColor || '#FDE68A'}
          roughness={0.28}
          metalness={0.65}
        />
      </mesh>

      <group ref={lidRef} position={[0, 0.26, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.64, 0.14, 0.64]} />
          <meshPhysicalMaterial color="#CC2238" roughness={0.2} clearcoat={0.85} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.14, 0.15, 0.66]} />
          <meshStandardMaterial color="#FDE68A" roughness={0.25} metalness={0.7} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.66, 0.15, 0.14]} />
          <meshStandardMaterial color="#FDE68A" roughness={0.25} metalness={0.7} />
        </mesh>
        <mesh position={[-0.1, 0.12, 0]} rotation={[0, 0, 0.35]}>
          <torusGeometry args={[0.09, 0.028, 10, 16]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.25} metalness={0.7} />
        </mesh>
        <mesh position={[0.1, 0.12, 0]} rotation={[0, 0, -0.35]}>
          <torusGeometry args={[0.09, 0.028, 10, 16]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.25} metalness={0.7} />
        </mesh>
      </group>

      <group ref={confettiGroupRef} visible={false}>
        {confettiSeeds.map((seed, i) => (
          <mesh key={i}>
            <boxGeometry args={[0.06, 0.06, 0.015]} />
            <meshStandardMaterial color={seed.color} roughness={0.3} />
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
  onPayoffStart: () => void;
  onRevealComplete: () => void;
}

function MascotAndGiftRig({
  artworkId,
  animationType,
  themeColor,
  accentColor,
  playKey,
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
      mascotGroupRef.current.position.set(0, -0.7, -3.2);
      mascotGroupRef.current.scale.setScalar(0.38);
      mascotGroupRef.current.rotation.set(0, 0, 0);
    }
    if (giftCarrierRef.current) {
      giftCarrierRef.current.position.set(0, -0.95, -2.5);
      giftCarrierRef.current.scale.setScalar(0.45);
      giftCarrierRef.current.rotation.set(0, -0.4, 0);
    }
    if (auraRingRef.current) {
      auraRingRef.current.visible = false;
    }
  }, [playKey]);

  useEffect(() => {
    return () => {
      mascotHeartGeo.dispose();
    };
  }, [mascotHeartGeo]);

  useFrame((state, delta) => {
    // Ignore frame-1 shader-compile spike, then track real-time delta cleanly at 60/120Hz
    frameCountRef.current += 1;
    const step = frameCountRef.current <= 1 ? 0.016 : Math.min(delta, 0.16);
    animTimeRef.current += step;
    const elapsed = animTimeRef.current;

    // High-Velocity TikTok Live Gifting Choreography (0.0s -> 1.65s peak, alive settle through 5.0s+):
    // 0.00 - 0.34s: Fast elastic mascot pop-in + blink
    const enterT = THREE.MathUtils.clamp(elapsed / 0.34, 0, 1);
    const enterEase = easeOutBack(enterT);

    // Quick expressive blink at 0.20s - 0.32s
    const blinkWindow =
      elapsed >= 0.2 && elapsed <= 0.32
        ? Math.sin(((elapsed - 0.2) / 0.12) * Math.PI)
        : 0;
    const eyeScaleY = Math.max(0.08, 1 - blinkWindow * 0.92);

    // 0.26 - 0.90s: Continuous kinetic handoff overlapped with arrival (no mid-air pause)
    const reachT = THREE.MathUtils.clamp((elapsed - 0.26) / 0.28, 0, 1);
    const reachEase = easeOutCubic(reachT);
    const releaseT = THREE.MathUtils.clamp((elapsed - 0.54) / 0.36, 0, 1);
    const releaseEase = easeOutBack(releaseT);

    // 0.90 - 1.65s: Punchy gift-specific payoff + Lottie + micro confetti pop
    const payoffT = THREE.MathUtils.clamp((elapsed - 0.9) / 0.72, 0, 1);
    payoffProgressRef.current = payoffT;

    if (elapsed >= 0.9 && !payoffFiredRef.current) {
      payoffFiredRef.current = true;
      onPayoffStart();
    }

    if (elapsed >= 1.65 && !completeFiredRef.current) {
      completeFiredRef.current = true;
      onRevealComplete();
    }

    // Dynamic TikTok Live camera FOV punch during gift release
    const cam = state.camera as THREE.PerspectiveCamera;
    if (cam && typeof cam.fov === 'number') {
      const fovKick = Math.sin(releaseT * Math.PI) * 4.2;
      const targetFov = 40 - fovKick;
      if (Math.abs(cam.fov - targetFov) > 0.02) {
        cam.fov = targetFov;
        cam.updateProjectionMatrix();
      }
    }

    const idleBob = Math.sin(elapsed * 3.2) * 0.036;

    if (mascotGroupRef.current) {
      mascotGroupRef.current.position.z = THREE.MathUtils.lerp(-3.2, -1.05, enterEase);
      mascotGroupRef.current.position.y =
        THREE.MathUtils.lerp(-0.7, 0.78, enterEase) +
        Math.sin(enterT * Math.PI) * 0.16 +
        idleBob;
      const popScale = THREE.MathUtils.lerp(0.38, 1.0, enterEase);
      mascotGroupRef.current.scale.setScalar(popScale);
      mascotGroupRef.current.rotation.x = THREE.MathUtils.lerp(0, 0.1, reachEase);
    }

    if (headBodyRef.current) {
      headBodyRef.current.rotation.z =
        Math.sin(enterT * Math.PI * 2) * 0.075 + Math.sin(elapsed * 2.2) * 0.032;
      const bounceScale = 1 + Math.sin(payoffT * Math.PI) * 0.08;
      headBodyRef.current.scale.set(bounceScale, bounceScale, bounceScale);
    }

    if (leftEyeGroupRef.current && rightEyeGroupRef.current) {
      leftEyeGroupRef.current.scale.set(1, eyeScaleY, 1);
      rightEyeGroupRef.current.scale.set(1, eyeScaleY, 1);
    }

    if (smileRef.current) {
      const smileStretch = 1 + reachEase * 0.18 + Math.sin(payoffT * Math.PI) * 0.16;
      smileRef.current.scale.set(smileStretch, smileStretch, 1);
    }

    if (leftArmRef.current && rightArmRef.current) {
      const reachAngle =
        THREE.MathUtils.lerp(0.25, 1.15, reachEase) - Math.min(1, releaseT) * 0.28;
      leftArmRef.current.rotation.x = -reachAngle;
      rightArmRef.current.rotation.x = -reachAngle;
      leftArmRef.current.rotation.z = THREE.MathUtils.lerp(0.35, -0.24, reachEase);
      rightArmRef.current.rotation.z = THREE.MathUtils.lerp(-0.35, 0.24, reachEase);
    }

    // Gift stays attached to hands until 0.54s, then rockets smoothly forward clear of mascot
    if (giftCarrierRef.current) {
      const mascotZ = mascotGroupRef.current?.position.z ?? -1.05;
      const mascotY = mascotGroupRef.current?.position.y ?? 0.78;

      const handWorldZ = mascotZ + THREE.MathUtils.lerp(0.54, 1.04, reachEase);
      const handWorldY = mascotY - THREE.MathUtils.lerp(0.3, 0.42, reachEase);

      const finalZ = 1.62;
      const finalY = -0.84 + idleBob * 0.65;

      const giftZ = THREE.MathUtils.lerp(handWorldZ, finalZ, releaseEase);
      const giftY =
        THREE.MathUtils.lerp(handWorldY, finalY, releaseEase) +
        Math.sin(releaseT * Math.PI) * 0.14;

      giftCarrierRef.current.position.set(0, giftY, giftZ);

      const giftScale =
        THREE.MathUtils.lerp(0.45, 0.58, reachEase) + releaseEase * 0.12;
      giftCarrierRef.current.scale.setScalar(giftScale);
      giftCarrierRef.current.rotation.y =
        THREE.MathUtils.lerp(-0.4, 0.14, releaseEase) + Math.sin(elapsed * 1.9) * 0.15;
    }

    // Radiant TikTok Live shockwave ring expanding behind the gift at payoff
    if (auraRingRef.current) {
      const ringProgress = THREE.MathUtils.clamp((elapsed - 0.88) / 0.54, 0, 1);
      auraRingRef.current.visible = ringProgress > 0 && ringProgress < 1;
      const ringScale = 0.35 + easeOutCubic(ringProgress) * 1.5;
      auraRingRef.current.scale.setScalar(ringScale);
      const mat = auraRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - ringProgress) * 0.58;
    }
  });

  return (
    <group>
      <group ref={mascotGroupRef} position={[0, -0.7, -3.2]} scale={0.38}>
        <group ref={headBodyRef}>
          <mesh geometry={mascotHeartGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              color="#D91E36"
              roughness={0.26}
              metalness={0.02}
              clearcoat={0.78}
              clearcoatRoughness={0.14}
              envMapIntensity={0.65}
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
            <meshStandardMaterial color="#FF8FA0" roughness={0.7} envMapIntensity={0.25} />
          </mesh>
          <mesh position={[0.42, -0.04, 0.31]} scale={[1.3, 0.75, 0.4]}>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshStandardMaterial color="#FF8FA0" roughness={0.7} envMapIntensity={0.25} />
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
          <circleGeometry args={[0.48, 24]} />
          <meshBasicMaterial color="#E6D2CF" transparent opacity={0.24} depthWrite={false} />
        </mesh>
      </group>

      {/* Shockwave burst ring */}
      <mesh ref={auraRingRef} position={[0, -0.74, 1.42]} visible={false}>
        <ringGeometry args={[0.54, 0.68, 32]} />
        <meshBasicMaterial color="#FF5F78" transparent opacity={0.5} depthWrite={false} />
      </mesh>

      <group ref={giftCarrierRef} position={[0, -0.95, -2.5]} scale={0.45}>
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
          dpr={webgl.isSoftwareGl ? 1 : [1, 2]}
          shadows={!webgl.isSoftwareGl}
          camera={{ position: [0, 0.2, 5.45], fov: 40, near: 0.1, far: 40 }}
          gl={{
            antialias: !webgl.isSoftwareGl,
            alpha: true,
            powerPreference: 'high-performance',
          }}
        >
          <color attach="background" args={['#FDF8F3']} />
          <fog attach="fog" args={['#FDF8F3', 7, 15]} />
          <StudioEnvironment isSoftwareGl={webgl.isSoftwareGl} />
          <hemisphereLight args={['#FFF7F8', '#E9D5C9', webgl.isSoftwareGl ? 1.1 : 0.45]} />
          {webgl.isSoftwareGl && (
            <>
              <ambientLight intensity={0.95} color="#FFF8F8" />
              <directionalLight position={[0, 1.0, 5.2]} intensity={1.15} color="#FFFFFF" />
            </>
          )}
          <directionalLight
            position={[3.5, 5, 4.5]}
            intensity={1.35}
            color="#FFF4EC"
            castShadow={!webgl.isSoftwareGl}
          />
          <directionalLight position={[-3.5, 2, -2]} intensity={0.45} color="#FFD6DF" />
          <MascotAndGiftRig
            artworkId={artworkId}
            animationType={animationType}
            themeColor={themeColor}
            accentColor={accentColor}
            playKey={playKey}
            onPayoffStart={onPayoffStart}
            onRevealComplete={onRevealComplete}
          />
          {webgl.isSoftwareGl && <SoftwareGlLoopDriver playKey={playKey} />}
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
}
