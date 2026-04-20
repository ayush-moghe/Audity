"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

function WaveMesh() {
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const basePositions = useMemo(() => {
    const plane = new THREE.PlaneGeometry(14, 14, 120, 120);
    return Float32Array.from(plane.attributes.position.array);
  }, []);

  useFrame(({ clock, pointer }) => {
    if (!geometryRef.current) {
      return;
    }

    const t = clock.elapsedTime;
    const positions = geometryRef.current.attributes.position.array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = basePositions[i];
      const y = basePositions[i + 1];
      const rippleA = Math.sin(x * 1.25 + t * 1.9);
      const rippleB = Math.cos(y * 1.45 - t * 1.1);
      positions[i + 2] = rippleA * 0.35 + rippleB * 0.22;
    }

    geometryRef.current.attributes.position.needsUpdate = true;
    geometryRef.current.computeVertexNormals();

    if (meshRef.current) {
      meshRef.current.rotation.z = pointer.x * 0.18;
      meshRef.current.rotation.x = -1.1 + pointer.y * 0.12;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-1.1, 0, 0]} position={[0, 0.6, 0]}>
      <planeGeometry ref={geometryRef} args={[14, 14, 120, 120]} />
      <meshStandardMaterial
        color="#4ab4ff"
        emissive="#1f4bff"
        emissiveIntensity={1}
        wireframe
      />
    </mesh>
  );
}

export default function SynthwaveWave() {
  return (
    <div className="h-90 w-full overflow-hidden rounded-2xl border border-cyan-400/35 bg-[radial-gradient(circle_at_20%_10%,rgba(82,24,147,0.4),transparent_45%),radial-gradient(circle_at_80%_75%,rgba(17,94,226,0.45),transparent_40%),#05050a] shadow-[0_20px_60px_rgba(7,132,255,0.2)] sm:h-115">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 2.8, 5.8]} fov={55} />
        <ambientLight intensity={0.22} />
        <pointLight position={[0, 6, 3]} intensity={26} color="#5dc7ff" />
        <pointLight position={[3, 2, -4]} intensity={16} color="#b249ff" />
        <WaveMesh />
        <OrbitControls
          enablePan={false}
          minDistance={3.2}
          maxDistance={8.2}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
          autoRotate
          autoRotateSpeed={0.28}
        />
      </Canvas>
    </div>
  );
}