import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from './store';
import { computeWallCorners } from './geometry';

const WALL_HEIGHT = 2.5;

function ProceduralWall({ wall }) {
  const { nodes, walls, openings } = useStore();
  
  const geometry = useMemo(() => {
    const corners = computeWallCorners(wall, nodes, walls);
    if (corners.length < 4) return null;

    // Convert 2D (x,y) to 3D (x, 0, -y)
    // corners order: StartRight, EndRight, EndLeft, StartLeft (After fix: StartRight, EndLeft, EndRight, StartLeft - Wait, checking fix again)
    // The fix in geometry.js was: Start+Right, End+Left, End+Right, Start+Left.
    // Let's assume standard quad:
    // 0: Start Right
    // 1: End Left (which is "Right" side of wall physically? No, End.Left is physically on the same side as Start.Right? No.)
    
    // Let's re-verify the "Fix" logic mentally.
    // Start Node. Direction Out is D1. Right is R1 (D1 rotated -90).
    // End Node. Direction Out is D2 (approx -D1). Left is L2 (D2 rotated +90).
    // If D2 = -D1, then L2 = (-D1 rot +90) = -(D1 rot +90) = - (Left) = Right.
    // So End.Left is indeed on the same side as Start.Right.
    // So the quad should be 0->1->2->3?
    // 0: Start+Right
    // 1: End+Left
    // 2: End+Right
    // 3: Start+Left
    // This forms a loop: StartRight -> EndLeft (Same side) -> EndRight (Other side) -> StartLeft (Other side) -> Close.
    // Yes, this is correct for a loop.
    
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
    
    // Top Face (CCW)
    pushQuad(7, 6, 5, 4); 
    
    // Side 1: 0->1 (Bottom Right Side). Top is 4->5.
    pushQuad(0, 1, 5, 4);
    
    // Side 2: 1->2 (End Face). Top is 5->6.
    pushQuad(1, 2, 6, 5);
    
    // Side 3: 2->3 (Bottom Left Side). Top is 6->7.
    pushQuad(2, 3, 7, 6);
    
    // Side 4: 3->0 (Start Face). Top is 7->4.
    pushQuad(3, 0, 4, 7);
    
    // Bottom Face (CW)
    pushQuad(3, 2, 1, 0); 

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
        
        // Position
        const dx = end.x - start.x;
        const dy = -(end.y - start.y); // In 3D Z
        // atan2(x, z) gives angle from Z+ axis.
        // Wall along X+ (dx=1, dy=0) gives PI/2. We want 0 (align box with X).
        // Wall along Z+ (dx=0, dy=1) gives 0. We want PI/2 (align box with Z).
        // So we need: angle - PI/2.
        const angle = Math.atan2(dx, dy); 
        
        const cx = start.x + (end.x - start.x) * op.dist;
        const cy = -start.y + (-end.y - (-start.y)) * op.dist; // Z coord
        
        return {
           id: op.id,
           pos: [cx, op.y + op.height/2, cy],
           rot: [0, angle - Math.PI/2, 0],
           size: [op.width, op.height, wall.thickness + 0.04], // Thicker than wall
           type: op.type
        };
     });
  }, [wall, nodes, openings]);

  if (!geometry) return null;

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </mesh>
      {wallOpenings.map((op, i) => op && (
         <mesh key={op.id} position={op.pos} rotation={op.rot} castShadow receiveShadow>
            <boxGeometry args={op.size} />
            <meshStandardMaterial color={op.type === 'window' ? "#a3e635" : "#78350f"} transparent opacity={0.8} />
         </mesh>
      ))}
    </group>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#f5f5f7" />
    </mesh>
  );
}

export default function Viewport3D() {
  const walls = useStore(state => state.walls);

  return (
    <div className="w-full h-full relative z-0 bg-gray-100">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 10, 10], fov: 45 }}>
        <SoftShadows />
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />
        
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        >
          <orthographicCamera attach="shadow-camera" args={[-20, 20, 20, -20]} />
        </directionalLight>

        <Environment preset="city" />

        <Floor />
        
        {walls.map(wall => (
          <ProceduralWall key={wall.id} wall={wall} />
        ))}
        
      </Canvas>
    </div>
  );
}
