import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";

// NOTE: R3F primitives (<mesh>, <boxGeometry>, etc.) are lowercase JSX tags.
// The visual-edits babel plugin injects `x-line-number` on lowercase JSX which
// breaks R3F's reconciler. We build the scene with React.createElement which
// the JSX plugin does not touch.
const h = React.createElement;

function ShipModel({ type = "kapal" }) {
  const group = useRef();
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.15;
  });

  if (type === "pangkalan") {
    return h(
      "group",
      { ref: group },
      // Pier
      h(
        "mesh",
        { position: [0, -0.3, 0] },
        h("boxGeometry", { args: [8, 0.2, 3] }),
        h("meshStandardMaterial", { color: "#101216", wireframe: true, emissive: "#00E5FF", emissiveIntensity: 0.15 })
      ),
      // Buildings
      ...[-2, 0, 2].map((x, i) =>
        h(
          "mesh",
          { key: `b${i}`, position: [x, 0.6, -0.5] },
          h("boxGeometry", { args: [1, 1.2, 1] }),
          h("meshStandardMaterial", { color: "#0A0C10", wireframe: true, emissive: "#00E5FF", emissiveIntensity: 0.25 })
        )
      ),
      // Tower
      h(
        "mesh",
        { position: [3, 1.2, 0.5] },
        h("cylinderGeometry", { args: [0.15, 0.2, 2.4, 6] }),
        h("meshStandardMaterial", { color: "#0A0C10", wireframe: true, emissive: "#00E5FF", emissiveIntensity: 0.4 })
      ),
      // Ocean
      h(
        "mesh",
        { position: [0, -0.45, 3], rotation: [-Math.PI / 2, 0, 0] },
        h("planeGeometry", { args: [12, 6] }),
        h("meshStandardMaterial", { color: "#001820", transparent: true, opacity: 0.4, emissive: "#002030", emissiveIntensity: 0.3 })
      )
    );
  }

  // Ship
  return h(
    "group",
    { ref: group },
    // Hull
    h(
      "mesh",
      { position: [0, -0.2, 0] },
      h("boxGeometry", { args: [5, 0.4, 1.2] }),
      h("meshStandardMaterial", { color: "#0A0C10", wireframe: true, emissive: "#00E5FF", emissiveIntensity: 0.4 })
    ),
    // Bow
    h(
      "mesh",
      { position: [2.8, -0.15, 0] },
      h("coneGeometry", { args: [0.6, 1.2, 4] }),
      h("meshStandardMaterial", { color: "#0A0C10", wireframe: true, emissive: "#00E5FF", emissiveIntensity: 0.5 })
    ),
    // Superstructure
    h(
      "mesh",
      { position: [0, 0.4, 0] },
      h("boxGeometry", { args: [2.4, 0.8, 0.9] }),
      h("meshStandardMaterial", { color: "#0A0C10", wireframe: true, emissive: "#5CFFFF", emissiveIntensity: 0.3 })
    ),
    // Bridge
    h(
      "mesh",
      { position: [-0.5, 0.95, 0] },
      h("boxGeometry", { args: [1.2, 0.4, 0.7] }),
      h("meshStandardMaterial", { color: "#0A0C10", wireframe: true, emissive: "#00E5FF", emissiveIntensity: 0.5 })
    ),
    // Mast
    h(
      "mesh",
      { position: [0, 1.6, 0] },
      h("cylinderGeometry", { args: [0.04, 0.04, 1.4, 6] }),
      h("meshStandardMaterial", { color: "#00E5FF", emissive: "#00E5FF", emissiveIntensity: 1 })
    ),
    // Radar disc
    h(
      "mesh",
      { position: [0, 1.9, 0], rotation: [0, 0, Math.PI / 2] },
      h("torusGeometry", { args: [0.25, 0.03, 8, 20] }),
      h("meshStandardMaterial", { color: "#00E5FF", emissive: "#00E5FF", emissiveIntensity: 1.2 })
    ),
    // Main gun turret
    h(
      "mesh",
      { position: [1.6, 0.1, 0] },
      h("cylinderGeometry", { args: [0.25, 0.25, 0.3, 8] }),
      h("meshStandardMaterial", { color: "#0A0C10", wireframe: true, emissive: "#5CFFFF", emissiveIntensity: 0.3 })
    ),
    // Barrel
    h(
      "mesh",
      { position: [2.0, 0.1, 0], rotation: [0, 0, Math.PI / 2] },
      h("cylinderGeometry", { args: [0.04, 0.04, 0.7, 6] }),
      h("meshStandardMaterial", { color: "#F1F5F9" })
    ),
    // Stern
    h(
      "mesh",
      { position: [-2.6, -0.1, 0] },
      h("boxGeometry", { args: [0.4, 0.4, 1.1] }),
      h("meshStandardMaterial", { color: "#0A0C10", wireframe: true, emissive: "#00E5FF", emissiveIntensity: 0.4 })
    ),
    // Helipad
    h(
      "mesh",
      { position: [-1.8, 0.05, 0], rotation: [-Math.PI / 2, 0, 0] },
      h("circleGeometry", { args: [0.5, 16] }),
      h("meshStandardMaterial", { color: "#00E5FF", emissive: "#00E5FF", emissiveIntensity: 0.25, transparent: true, opacity: 0.4 })
    )
  );
}

function Scene({ type }) {
  return h(
    React.Fragment,
    null,
    h("ambientLight", { intensity: 0.1 }),
    h("directionalLight", { position: [5, 5, 5], intensity: 0.8, color: "#00E5FF" }),
    h("directionalLight", { position: [-5, 3, -5], intensity: 0.4, color: "#5CFFFF" }),
    h("pointLight", { position: [0, 3, 0], intensity: 0.5, color: "#00E5FF" }),
    h(ShipModel, { type }),
    h(Grid, {
      args: [20, 20],
      cellSize: 0.5,
      cellThickness: 0.5,
      cellColor: "#00E5FF",
      sectionSize: 2,
      sectionThickness: 1,
      sectionColor: "#00E5FF",
      fadeDistance: 15,
      fadeStrength: 1,
      position: [0, -0.5, 0],
    }),
    h(OrbitControls, { enablePan: false, minDistance: 3, maxDistance: 12 })
  );
}

class ThreeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() { /* swallow */ }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#050608]">
          <div className="text-center">
            <div className="label-mono text-[#00E5FF] mb-2">3D MODEL OFFLINE</div>
            <div className="text-xs text-[#8A94A6]">Rendering paused</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ShipViewer3D({ type = "kapal" }) {
  return (
    <div className="w-full h-full relative" data-testid="ship-viewer-3d">
      <ThreeErrorBoundary>
        <Canvas camera={{ position: [5, 3, 5], fov: 50 }} dpr={[1, 2]}>
          <Suspense fallback={null}>
            <Scene type={type} />
          </Suspense>
        </Canvas>
      </ThreeErrorBoundary>
      <div className="absolute top-3 left-3 label-mono text-[#00E5FF] pointer-events-none">
        3D TACTICAL VIEW // {type === "kapal" ? "HULL-SCHEMATIC" : "BASE-LAYOUT"}
      </div>
      <div className="absolute bottom-3 right-3 label-mono text-[#8A94A6] pointer-events-none">
        DRAG TO ROTATE · SCROLL TO ZOOM
      </div>
    </div>
  );
}
