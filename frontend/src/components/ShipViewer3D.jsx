import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";

function ShipModel({ type = "kapal" }) {
  const group = useRef();
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.15;
  });

  if (type === "pangkalan") {
    // Base: layout with buildings + pier
    return (
      <group ref={group}>
        {/* Pier */}
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[8, 0.2, 3]} />
          <meshStandardMaterial color="#101216" wireframe opacity={0.9} transparent emissive="#00E5FF" emissiveIntensity={0.15} />
        </mesh>
        {/* Buildings */}
        {[-2, 0, 2].map((x, i) => (
          <mesh key={i} position={[x, 0.6, -0.5]}>
            <boxGeometry args={[1, 1.2, 1]} />
            <meshStandardMaterial color="#0A0C10" wireframe emissive="#00E5FF" emissiveIntensity={0.25} />
          </mesh>
        ))}
        {/* Tower */}
        <mesh position={[3, 1.2, 0.5]}>
          <cylinderGeometry args={[0.15, 0.2, 2.4, 6]} />
          <meshStandardMaterial color="#0A0C10" wireframe emissive="#00E5FF" emissiveIntensity={0.4} />
        </mesh>
        {/* Ocean plane */}
        <mesh position={[0, -0.45, 3]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[12, 6]} />
          <meshStandardMaterial color="#001820" opacity={0.4} transparent emissive="#002030" emissiveIntensity={0.3} />
        </mesh>
      </group>
    );
  }

  // Ship shape
  return (
    <group ref={group}>
      {/* Hull (bottom) */}
      <mesh position={[0, -0.2, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[5, 0.4, 1.2]} />
        <meshStandardMaterial color="#0A0C10" wireframe emissive="#00E5FF" emissiveIntensity={0.4} />
      </mesh>
      {/* Bow pointer */}
      <mesh position={[2.8, -0.15, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.6, 1.2, 4]} />
        <meshStandardMaterial color="#0A0C10" wireframe emissive="#00E5FF" emissiveIntensity={0.5} />
      </mesh>
      {/* Superstructure */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[2.4, 0.8, 0.9]} />
        <meshStandardMaterial color="#0A0C10" wireframe emissive="#5CFFFF" emissiveIntensity={0.3} />
      </mesh>
      {/* Bridge */}
      <mesh position={[-0.5, 0.95, 0]}>
        <boxGeometry args={[1.2, 0.4, 0.7]} />
        <meshStandardMaterial color="#0A0C10" wireframe emissive="#00E5FF" emissiveIntensity={0.5} />
      </mesh>
      {/* Mast */}
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.4, 6]} />
        <meshStandardMaterial color="#00E5FF" emissive="#00E5FF" emissiveIntensity={1} />
      </mesh>
      {/* Radar disc */}
      <mesh position={[0, 1.9, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.25, 0.03, 8, 20]} />
        <meshStandardMaterial color="#00E5FF" emissive="#00E5FF" emissiveIntensity={1.2} />
      </mesh>
      {/* Main gun turret front */}
      <mesh position={[1.6, 0.1, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.3, 8]} />
        <meshStandardMaterial color="#0A0C10" wireframe emissive="#5CFFFF" emissiveIntensity={0.3} />
      </mesh>
      {/* Barrel */}
      <mesh position={[2.0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.7, 6]} />
        <meshStandardMaterial color="#F1F5F9" />
      </mesh>
      {/* Stern */}
      <mesh position={[-2.6, -0.1, 0]}>
        <boxGeometry args={[0.4, 0.4, 1.1]} />
        <meshStandardMaterial color="#0A0C10" wireframe emissive="#00E5FF" emissiveIntensity={0.4} />
      </mesh>
      {/* Helipad */}
      <mesh position={[-1.8, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 16]} />
        <meshStandardMaterial color="#00E5FF" emissive="#00E5FF" emissiveIntensity={0.25} opacity={0.4} transparent />
      </mesh>
    </group>
  );
}

function Scene({ type }) {
  return (
    <>
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#00E5FF" />
      <directionalLight position={[-5, 3, -5]} intensity={0.4} color="#5CFFFF" />
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#00E5FF" />

      <ShipModel type={type} />

      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#00E5FF"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#00E5FF"
        fadeDistance={15}
        fadeStrength={1}
        position={[0, -0.5, 0]}
      />

      <OrbitControls enablePan={false} minDistance={3} maxDistance={12} />
    </>
  );
}

export default function ShipViewer3D({ type = "kapal" }) {
  return (
    <div className="w-full h-full relative" data-testid="ship-viewer-3d">
      <Canvas camera={{ position: [5, 3, 5], fov: 50 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <Scene type={type} />
        </Suspense>
      </Canvas>
      <div className="absolute top-3 left-3 label-mono text-[#00E5FF] pointer-events-none">
        3D TACTICAL VIEW // {type === "kapal" ? "HULL-SCHEMATIC" : "BASE-LAYOUT"}
      </div>
      <div className="absolute bottom-3 right-3 label-mono text-[#8A94A6] pointer-events-none">
        DRAG TO ROTATE · SCROLL TO ZOOM
      </div>
    </div>
  );
}
