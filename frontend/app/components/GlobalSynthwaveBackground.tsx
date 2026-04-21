"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function Starfield() {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 1400;
    const array = new Float32Array(count * 3);
    const pseudo = (seed: number) => {
      const value = Math.sin(seed * 12.9898) * 43758.5453;
      return value - Math.floor(value);
    };

    for (let i = 0; i < count; i += 1) {
      const stride = i * 3;
      array[stride] = (pseudo(i + 1) - 0.5) * 140;
      array[stride + 1] = pseudo(i + 2) * 60 - 8;
      array[stride + 2] = -pseudo(i + 3) * 130 - 6;
    }

    return array;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) {
      return;
    }

    pointsRef.current.rotation.y = clock.elapsedTime * 0.01;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#82d8ff" size={0.11} sizeAttenuation transparent opacity={0.65} />
    </points>
  );
}

function NeonGrid() {
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const basePositions = useMemo(() => {
    const plane = new THREE.PlaneGeometry(85, 110, 120, 120);
    return Float32Array.from(plane.attributes.position.array);
  }, []);

  useFrame(({ clock }) => {
    if (!geometryRef.current || !meshRef.current) {
      return;
    }

    const elapsed = clock.elapsedTime;
    const positions = geometryRef.current.attributes.position.array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = basePositions[i];
      const y = basePositions[i + 1];
      positions[i + 2] =
        Math.sin(x * 0.18 + elapsed * 1.35) * 0.52 +
        Math.cos(y * 0.15 - elapsed * 0.9) * 0.38;
    }

    geometryRef.current.attributes.position.needsUpdate = true;
    meshRef.current.position.z = -13 + (elapsed % 10) * 0.15;
  });

  return (
    <mesh ref={meshRef} rotation={[-1.07, 0, 0]} position={[0, -8, -13]}>
      <planeGeometry ref={geometryRef} args={[85, 110, 120, 120]} />
      <meshStandardMaterial
        color="#5fcdff"
        emissive="#2e7dff"
        emissiveIntensity={0.8}
        wireframe
      />
    </mesh>
  );
}

function SunDisc() {
  return (
    <mesh position={[0, 10, -42]}>
      <circleGeometry args={[8.8, 56]} />
      <meshBasicMaterial color="#ff66cc" transparent opacity={0.82} />
    </mesh>
  );
}

export default function GlobalSynthwaveBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 4, 15], fov: 58 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[0, 10, 10]} intensity={24} color="#56c4ff" />
        <pointLight position={[0, 6, -20]} intensity={20} color="#e563ff" />
        <SunDisc />
        <NeonGrid />
        <Starfield />
      </Canvas>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(130,48,220,0.32),transparent_34%),radial-gradient(circle_at_80%_82%,rgba(45,130,255,0.3),transparent_36%),linear-gradient(180deg,rgba(2,3,8,0.55),rgba(2,3,8,0.86))]" />
    </div>
  );
}
