import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from './store';
import { computeWallCorners } from './geometry';

const WALL_HEIGHT = 2.5;

function Opening({ data, isDark }) {
  const { type, size, isOpen } = data;
  const [w, h, d] = size;
  const frameThick = 0.05;
  const frameDepth = d + 0.02;
  const glassThick = 0.02;

  const frameColor = isDark ? "#4b5563" : "#374151";
  const glassColor = "#bae6fd";
  const doorColor = "#92400e"; // Wood

  if (type === 'window') {
    return (
      <group position={data.pos} rotation={data.rot}>
        {/* Frame Top/Bottom */}
        <mesh position={[0, h/2 - frameThick/2, 0]} castShadow receiveShadow>
           <boxGeometry args={[w, frameThick, frameDepth]} />
           <meshStandardMaterial color={frameColor} />
        </mesh>
        <mesh position={[0, -h/2 + frameThick/2, 0]} castShadow receiveShadow>
           <boxGeometry args={[w, frameThick, frameDepth]} />
           <meshStandardMaterial color={frameColor} />
        </mesh>
        {/* Frame Left/Right */}
        <mesh position={[-w/2 + frameThick/2, 0, 0]} castShadow receiveShadow>
           <boxGeometry args={[frameThick, h - 2*frameThick, frameDepth]} />
           <meshStandardMaterial color={frameColor} />
        </mesh>
        <mesh position={[w/2 - frameThick/2, 0, 0]} castShadow receiveShadow>
           <boxGeometry args={[frameThick, h - 2*frameThick, frameDepth]} />
           <meshStandardMaterial color={frameColor} />
        </mesh>

        {/* Sash (Rotating Part) */}
        {/* Pivot at left side: x = -w/2 + frameThick */}
        <group position={[-w/2 + frameThick, 0, 0]} rotation={[0, isOpen ? Math.PI / 3 : 0, 0]}>
          <group position={[w/2 - frameThick, 0, 0]}> {/* Center sash back to local origin */}
             {/* Sash Frame and Glass */}
             <mesh castShadow receiveShadow>
               <boxGeometry args={[w - 2*frameThick, h - 2*frameThick, glassThick]} />
               <meshStandardMaterial 
                 color={glassColor} 
                 transparent 
                 opacity={0.3} 
                 roughness={0.1}
                 metalness={0.1}
               />
             </mesh>
             {/* Sash Border */}
             <mesh position={[0, (h - 2*frameThick)/2 - 0.02, 0]} castShadow receiveShadow>
                <boxGeometry args={[w - 2*frameThick, 0.04, frameDepth - 0.05]} />
                <meshStandardMaterial color={frameColor} />
             </mesh>
             <mesh position={[0, -(h - 2*frameThick)/2 + 0.02, 0]} castShadow receiveShadow>
                <boxGeometry args={[w - 2*frameThick, 0.04, frameDepth - 0.05]} />
                <meshStandardMaterial color={frameColor} />
             </mesh>
             <mesh position={[-(w - 2*frameThick)/2 + 0.02, 0, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.04, h - 2*frameThick, frameDepth - 0.05]} />
                <meshStandardMaterial color={frameColor} />
             </mesh>
             <mesh position={[(w - 2*frameThick)/2 - 0.02, 0, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.04, h - 2*frameThick, frameDepth - 0.05]} />
                <meshStandardMaterial color={frameColor} />
             </mesh>
          </group>
        </group>
      </group>
    );
  } else {
    // Door
    return (
      <group position={data.pos} rotation={data.rot}>
         {/* Frame Top */}
        <mesh position={[0, h/2 - frameThick/2, 0]} castShadow receiveShadow>
           <boxGeometry args={[w, frameThick, frameDepth]} />
           <meshStandardMaterial color={frameColor} />
        </mesh>
        {/* Frame Left/Right */}
        <mesh position={[-w/2 + frameThick/2, 0, 0]} castShadow receiveShadow>
           <boxGeometry args={[frameThick, h, frameDepth]} />
           <meshStandardMaterial color={frameColor} />
        </mesh>
        <mesh position={[w/2 - frameThick/2, 0, 0]} castShadow receiveShadow>
           <boxGeometry args={[frameThick, h, frameDepth]} />
           <meshStandardMaterial color={frameColor} />
        </mesh>

        {/* Door Panel */}
        {/* Pivot at left: -w/2 + frameThick */}
        <group position={[-w/2 + frameThick, 0, 0]} rotation={[0, isOpen ? Math.PI / 2 : 0, 0]}>
           <mesh position={[(w - 2*frameThick)/2, 0, 0]} castShadow receiveShadow>
             <boxGeometry args={[w - 2*frameThick, h - frameThick, 0.05]} />
             <meshStandardMaterial color={doorColor} />
           </mesh>
           {/* Handle */}
           <mesh position={[(w - 2*frameThick) - 0.1, 0, 0.04]} castShadow receiveShadow>
             <sphereGeometry args={[0.04]} />
             <meshStandardMaterial color="gold" metalness={0.8} roughness={0.2} />
           </mesh>
        </group>
      </group>
    );
  }
}

function ProceduralWall({ wall, isDark }) {
  const { nodes, walls, openings } = useStore();
  
  const geometry = useMemo(() => {
    const corners = computeWallCorners(wall, nodes, walls);
    if (corners.length < 4) return null;

    const vertices = [];
    const indices = [];
    
    // Bottom loop 0-3
    corners.forEach(p => vertices.push(p.x, 0, -p.y)); 
    // Top loop 4-7
    corners.forEach(p => vertices.push(p.x, WALL_HEIGHT, -p.y)); 
    
    const pushFace = (a, b, c) => indices.push(a, b, c);
    const pushQuad = (a, b, c, d) => {
        pushFace(a, b, d);
        pushFace(b, c, d);
    };
    
    pushQuad(7, 6, 5, 4); // Top
    pushQuad(0, 1, 5, 4); // Right
    pushQuad(1, 2, 6, 5); // End
    pushQuad(2, 3, 7, 6); // Left
    pushQuad(3, 0, 4, 7); // Start
    pushQuad(3, 2, 1, 0); // Bottom

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [wall, nodes, walls]);

  const wallOpenings = useMemo(() => {
     return openings.filter(o => o.wallId === wall.id).map(op => {
        const start = nodes.find(n => n.id === wall.startNodeId);
        const end = nodes.find(n => n.id === wall.endNodeId);
        if (!start || !end) return null;
        
        const dx = end.x - start.x;
        const dy = -(end.y - start.y); 
        const angle = Math.atan2(dx, dy); 
        
        const cx = start.x + (end.x - start.x) * op.dist;
        const cy = -start.y + (-end.y - (-start.y)) * op.dist; 
        
        return {
           id: op.id,
           pos: [cx, op.y + op.height/2, cy],
           rot: [0, angle - Math.PI/2, 0],
           size: [op.width, op.height, wall.thickness + 0.04],
           type: op.type,
           isOpen: op.isOpen
        };
     });
  }, [wall, nodes, openings]);

  if (!geometry) return null;

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={isDark ? "#e5e7eb" : "#ffffff"} roughness={0.8} />
      </mesh>
      {wallOpenings.map((op) => op && (
         <Opening key={op.id} data={op} isDark={isDark} />
      ))}
    </group>
  );
}

export default function Viewport3D() {
  const walls = useStore(state => state.walls);
  const theme = useStore(state => state.theme);
  const isDark = theme === 'dark';

  return (
    <div className="w-full h-full relative z-0">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 10, 10], fov: 45 }}>
        <SoftShadows />
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />
        
        <ambientLight intensity={isDark ? 0.4 : 0.6} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        >
          <orthographicCamera attach="shadow-camera" args={[-20, 20, 20, -20]} />
        </directionalLight>

        <Environment preset={isDark ? "apartment" : "city"} />

        <Floor isDark={isDark} />
        
        {walls.map(wall => (
          <ProceduralWall key={wall.id} wall={wall} isDark={isDark} />
        ))}
        
      </Canvas>
    </div>
  );
}

function Floor({ isDark }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color={isDark ? "#111827" : "#f5f5f7"} />
    </mesh>
  );
}
