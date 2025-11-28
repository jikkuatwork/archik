import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from './store';
import { computeWallCorners } from './geometry';

const WALL_HEIGHT = 2.5;

const Sash = ({ width, sashH, glassThick, frameDepth, glassColor, frameColor }) => (
  <group>
    {/* Glass */}
    <mesh castShadow receiveShadow>
      <boxGeometry args={[width, sashH, glassThick]} />
      <meshStandardMaterial 
        color={glassColor} 
        transparent 
        opacity={0.3} 
        roughness={0.1}
        metalness={0.1}
      />
    </mesh>
    {/* Frame Border */}
    <mesh position={[0, sashH/2 - 0.02, 0]} castShadow receiveShadow>
       <boxGeometry args={[width, 0.04, frameDepth - 0.05]} />
       <meshStandardMaterial color={frameColor} />
    </mesh>
    <mesh position={[0, -sashH/2 + 0.02, 0]} castShadow receiveShadow>
       <boxGeometry args={[width, 0.04, frameDepth - 0.05]} />
       <meshStandardMaterial color={frameColor} />
    </mesh>
    <mesh position={[-width/2 + 0.02, 0, 0]} castShadow receiveShadow>
       <boxGeometry args={[0.04, sashH, frameDepth - 0.05]} />
       <meshStandardMaterial color={frameColor} />
    </mesh>
    <mesh position={[width/2 - 0.02, 0, 0]} castShadow receiveShadow>
       <boxGeometry args={[0.04, sashH, frameDepth - 0.05]} />
       <meshStandardMaterial color={frameColor} />
    </mesh>
  </group>
);

function Opening({ data, isDark }) {
  const { type, size, isOpen, isFlipped } = data;
  const [w, h, d] = size;
  const frameThick = 0.05;
  const frameDepth = d + 0.02;
  const glassThick = 0.02;

  const frameColor = isDark ? "#4b5563" : "#374151";
  const glassColor = "#bae6fd";
  const doorColor = "#92400e"; // Wood

  if (type === 'window') {
    const innerW = w - 2 * frameThick;
    const innerH = h - 2 * frameThick;
    const sashW = innerW / 2;
    const sashH = innerH;

    const angle = Math.PI / 3;
    const leftAngle = isFlipped ? -angle : angle;
    const rightAngle = isFlipped ? angle : -angle;

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

        {/* Left Sash */}
        <group position={[-w/2 + frameThick, 0, 0]} rotation={[0, isOpen ? leftAngle : 0, 0]}>
          <group position={[sashW/2, 0, 0]}>
             <Sash 
               width={sashW} 
               sashH={sashH} 
               glassThick={glassThick} 
               frameDepth={frameDepth} 
               glassColor={glassColor} 
               frameColor={frameColor}
             />
          </group>
        </group>

        {/* Right Sash */}
        <group position={[w/2 - frameThick, 0, 0]} rotation={[0, isOpen ? rightAngle : 0, 0]}>
          <group position={[-sashW/2, 0, 0]}>
             <Sash 
               width={sashW} 
               sashH={sashH} 
               glassThick={glassThick} 
               frameDepth={frameDepth} 
               glassColor={glassColor} 
               frameColor={frameColor}
             />
          </group>
        </group>
      </group>
    );
  } else {
    // Door
    const angle = isFlipped ? -Math.PI / 2 : Math.PI / 2;
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
        <group position={[-w/2 + frameThick, 0, 0]} rotation={[0, isOpen ? angle : 0, 0]}>
           <mesh position={[(w - 2*frameThick)/2, 0, 0]} castShadow receiveShadow>
             <boxGeometry args={[w - 2*frameThick, h - frameThick, 0.05]} />
             <meshStandardMaterial color={doorColor} />
           </mesh>
           {/* Handle */}
           <mesh position={[(w - 2*frameThick) - 0.1, 0, isFlipped ? -0.04 : 0.04]} castShadow receiveShadow>
             <sphereGeometry args={[0.04]} />
             <meshStandardMaterial color="gold" metalness={0.8} roughness={0.2} />
           </mesh>
        </group>
      </group>
    );
  }
}

function ProceduralSlab({ layer, elevation, isDark }) {
  const shape = useMemo(() => {
    if (layer.walls.length === 0) return null;
    
    const shape = new THREE.Shape();
    const edges = [...layer.walls];
    const getNode = (id) => layer.nodes.find(n => n.id === id);
    
    // Start with the first wall
    let current = edges.shift();
    if (!current) return null;

    let nStart = getNode(current.startNodeId);
    let nEnd = getNode(current.endNodeId);
    if (!nStart || !nEnd) return null;

    shape.moveTo(nStart.x, -nStart.y);
    shape.lineTo(nEnd.x, -nEnd.y);
    
    let tailId = current.endNodeId;
    
    // Greedy chain finder
    while(edges.length > 0) {
       const idx = edges.findIndex(w => w.startNodeId === tailId || w.endNodeId === tailId);
       if (idx === -1) break; // Disconnected
       
       const nextWall = edges.splice(idx, 1)[0];
       const isStart = nextWall.startNodeId === tailId;
       const nextNodeId = isStart ? nextWall.endNodeId : nextWall.startNodeId;
       
       tailId = nextNodeId;
       const p = getNode(tailId);
       if (p) shape.lineTo(p.x, -p.y);
    }

    return shape;
  }, [layer]);

  if (!shape) return null;

  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, elevation, 0]} 
      castShadow 
      receiveShadow
    >
      <extrudeGeometry args={[shape, { depth: layer.height, bevelEnabled: false }]} />
      <meshStandardMaterial color={isDark ? "#1f2937" : "#9ca3af"} roughness={0.9} />
    </mesh>
  );
}

function ProceduralWall({ wall, layer, elevation, isDark }) {
  // Read from layer prop, NOT global store for geometry
  const { nodes, walls, openings } = layer; 
  const { selectedWallIds, setSelection, setContextMenuData } = useStore();
  const isSelected = selectedWallIds.includes(wall.id);
  
  const geometry = useMemo(() => {
    const corners = computeWallCorners(wall, nodes, walls);
    if (corners.length < 4) return null;
    
    const p0 = corners[0]; 
    const p1 = corners[1]; 
    const p2 = corners[2]; 
    const p3 = corners[3]; 
    
    const startNode = nodes.find(n => n.id === wall.startNodeId);
    const endNode = nodes.find(n => n.id === wall.endNodeId);
    if (!startNode || !endNode) return null;
    
    // Connection counts
    const startCount = walls.filter(w => w.startNodeId === wall.startNodeId || w.endNodeId === wall.startNodeId).length;
    const endCount = walls.filter(w => w.startNodeId === wall.endNodeId || w.endNodeId === wall.endNodeId).length;
    
    const skipStartCap = startCount > 1;
    const skipEndCap = endCount > 1;
    
    const wallLen = Math.hypot(endNode.x - startNode.x, endNode.y - startNode.y);
    
    // Sort Openings
    const myOpenings = openings
      .filter(o => o.wallId === wall.id && wallLen >= o.width + 0.2)
      .sort((a, b) => a.dist - b.dist);
      
    let t = 0;
    const segments = []; 
    
    myOpenings.forEach(op => {
      const halfW = (op.width / 2) / wallLen;
      const tStart = Math.max(0, op.dist - halfW);
      const tEnd = Math.min(1, op.dist + halfW);
      if (tStart > t) segments.push({ t0: t, t1: tStart, type: 'solid' });
      segments.push({ t0: tStart, t1: tEnd, type: 'hole', opening: op });
      t = tEnd;
    });
    
    if (t < 1) segments.push({ t0: t, t1: 1, type: 'solid' });
    
    const vertices = [];
    const indices = [];
    let vCount = 0;
    
    const pushQuad = (v1, v2, v3, v4) => {
       vertices.push(v1.x, v1.y, v1.z);
       vertices.push(v2.x, v2.y, v2.z);
       vertices.push(v3.x, v3.y, v3.z);
       vertices.push(v4.x, v4.y, v4.z);
       indices.push(vCount, vCount+1, vCount+2);
       indices.push(vCount, vCount+2, vCount+3);
       vCount += 4;
    };
    
    const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x)*t, y: a.y + (b.y - a.y)*t });
    
    const addBlock = (t0, t1, yBottom, yTop) => {
      const r0 = lerp(p0, p1, t0);
      const r1 = lerp(p0, p1, t1);
      const l0 = lerp(p3, p2, t0);
      const l1 = lerp(p3, p2, t1);
      
      const to3D = (p, h) => ({ x: p.x, y: h + elevation, z: -p.y });
      
      const br0 = to3D(r0, yBottom);
      const bl0 = to3D(l0, yBottom);
      const bl1 = to3D(l1, yBottom);
      const br1 = to3D(r1, yBottom);
      
      const tr0 = to3D(r0, yTop);
      const tl0 = to3D(l0, yTop);
      const tl1 = to3D(l1, yTop);
      const tr1 = to3D(r1, yTop);
      
      pushQuad(tl0, tr0, tr1, tl1);
      pushQuad(br0, bl0, bl1, br1);
      pushQuad(br0, br1, tr1, tr0);
      pushQuad(bl1, bl0, tl0, tl1); 
      
      if (t0 > 0.001 || !skipStartCap) pushQuad(bl0, br0, tr0, tl0); 
      if (t1 < 0.999 || !skipEndCap) pushQuad(bl1, br1, tr1, tl1);
    };
    
    segments.forEach(seg => {
      if (seg.type === 'solid') {
        addBlock(seg.t0, seg.t1, 0, layer.height);
      } else {
        const op = seg.opening;
        if (op.y > 0) addBlock(seg.t0, seg.t1, 0, op.y);
        if (op.y + op.height < layer.height) addBlock(seg.t0, seg.t1, op.y + op.height, layer.height);
      }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [wall, nodes, walls, openings, elevation, layer.height]);

  const wallOpenings = useMemo(() => {
     const start = nodes.find(n => n.id === wall.startNodeId);
     const end = nodes.find(n => n.id === wall.endNodeId);
     if (!start || !end) return [];
     
     const wallLen = Math.hypot(end.x - start.x, end.y - start.y);

     return openings
       .filter(o => o.wallId === wall.id && wallLen >= o.width + 0.2)
       .map(op => {
        const dx = end.x - start.x;
        const dy = -(end.y - start.y); 
        const angle = Math.atan2(dx, dy); 
        
        const cx = start.x + (end.x - start.x) * op.dist;
        const cy = -start.y + (-end.y - (-start.y)) * op.dist; 
        
        return {
           id: op.id,
           pos: [cx, op.y + op.height/2 + elevation, cy],
           rot: [0, angle - Math.PI/2, 0],
           size: [op.width, op.height, wall.thickness + 0.04],
           type: op.type,
           isOpen: op.isOpen,
           isFlipped: op.isFlipped
        };
     });
  }, [wall, nodes, openings, elevation]);

  if (!geometry) return null;

  return (
    <group>
      <mesh 
        geometry={geometry} 
        castShadow 
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          setSelection({ nodes: [], walls: [wall.id] });
          setContextMenuData({ x: e.clientX, y: e.clientY });
        }}
      >
        <meshStandardMaterial 
          color={isSelected ? "#60a5fa" : (isDark ? "#e5e7eb" : "#ffffff")} 
          roughness={0.8} 
        />
      </mesh>
      {wallOpenings.map((op) => op && (
         <Opening key={op.id} data={op} isDark={isDark} />
      ))}
    </group>
  );
}

export default function Viewport3D() {
  const { layers, theme, setSelection, setContextMenuData } = useStore();
  const isDark = theme === 'dark';

  const visibleLayers = layers.filter(l => l.visible);
  let cumulativeHeight = 0;
  const layerStack = visibleLayers.map(layer => {
    const elevation = cumulativeHeight;
    cumulativeHeight += layer.height;
    return { layer, elevation };
  });

  return (
    <div className="w-full h-full relative z-0">
      <Canvas 
        shadows 
        dpr={[1, 2]} 
        camera={{ position: [0, 10, 10], fov: 45 }}
        onPointerMissed={(e) => {
          if (e.type === 'click') {
             setSelection({ nodes: [], walls: [] });
             setContextMenuData(null);
          }
        }}
      >
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
        
        {layerStack.map(({ layer, elevation }) => {
          if (layer.type === 'wall') {
            return layer.walls.map(wall => (
              <ProceduralWall 
                key={wall.id} 
                wall={wall} 
                layer={layer} 
                elevation={elevation} 
                isDark={isDark} 
              />
            ));
          } else if (layer.type === 'floor') {
            return (
              <ProceduralSlab 
                key={layer.id} 
                layer={layer} 
                elevation={elevation} 
                isDark={isDark} 
              />
            );
          }
          return null;
        })}
        
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
