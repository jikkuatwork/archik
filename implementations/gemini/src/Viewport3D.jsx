import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, SoftShadows, PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from './store';
import { computeWallCorners } from './geometry';
import { Video, Footprints } from 'lucide-react';
import clsx from 'clsx';

const WALL_HEIGHT = 2.5;

function ViewModeSelector() {
  const { viewMode, setViewMode } = useStore();
  
  return (
    <div className="flex bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-1 rounded-xl shadow-lg border border-white/20 dark:border-white/10 gap-1">
       <button
         onClick={() => setViewMode('ORBIT')}
         className={clsx(
           "p-2 rounded-lg flex items-center justify-center transition-all",
           viewMode === 'ORBIT' 
             ? "bg-blue-500 text-white shadow" 
             : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
         )}
         title="Orbit View"
       >
         <Video size={20} />
       </button>
       <button
         onClick={() => setViewMode('FIRST_PERSON')}
         className={clsx(
           "p-2 rounded-lg flex items-center justify-center transition-all",
           viewMode === 'FIRST_PERSON' 
             ? "bg-blue-500 text-white shadow" 
             : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
         )}
         title="First Person (Walk)"
       >
         <Footprints size={20} />
       </button>
    </div>
  );
}

// --- First Person Controller ---

function FirstPersonController() {
  const { camera } = useThree();
  const [moveForward, setMoveForward] = useState(false);
  const [moveBackward, setMoveBackward] = useState(false);
  const [moveLeft, setMoveLeft] = useState(false);
  const [moveRight, setMoveRight] = useState(false);
  const [canJump, setCanJump] = useState(false);
  
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 2));

  useEffect(() => {
    const onKeyDown = (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          setMoveForward(true);
          break;
        case 'ArrowLeft':
        case 'KeyA':
          setMoveLeft(true);
          break;
        case 'ArrowDown':
        case 'KeyS':
          setMoveBackward(true);
          break;
        case 'ArrowRight':
        case 'KeyD':
          setMoveRight(true);
          break;
        case 'Space':
          if (canJump) velocity.current.y += 5; // Jump force
          setCanJump(false);
          break;
      }
    };

    const onKeyUp = (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          setMoveForward(false);
          break;
        case 'ArrowLeft':
        case 'KeyA':
          setMoveLeft(false);
          break;
        case 'ArrowDown':
        case 'KeyS':
          setMoveBackward(false);
          break;
        case 'ArrowRight':
        case 'KeyD':
          setMoveRight(false);
          break;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [canJump]);

  useFrame((state, delta) => {
    // Physics Logic
    velocity.current.x -= velocity.current.x * 10.0 * delta;
    velocity.current.z -= velocity.current.z * 10.0 * delta;
    velocity.current.y -= 9.8 * 2.0 * delta; // Gravity

    direction.current.z = Number(moveForward) - Number(moveBackward);
    direction.current.x = Number(moveRight) - Number(moveLeft);
    direction.current.normalize();

    if (moveForward || moveBackward) velocity.current.z -= direction.current.z * 50.0 * delta;
    if (moveLeft || moveRight) velocity.current.x -= direction.current.x * 50.0 * delta;

    camera.translateX(-velocity.current.x * delta);
    camera.translateZ(velocity.current.z * delta);
    camera.position.y += velocity.current.y * delta;

    // Floor Collision (Simple Plane at y=0)
    // Eye height = 1.6 units
    if (camera.position.y < 1.6) {
      velocity.current.y = 0;
      camera.position.y = 1.6;
      setCanJump(true);
    }
  });

  return <PointerLockControls />;
}

function SmartOrbitControls(props) {
  const { gl } = useThree();
  const controlsRef = useRef();

  useEffect(() => {
    if (!gl.domElement) return;

    // Intercept pointer events to dynamically configure controls based on modifiers
    const handlePointerDown = (e) => {
      if (!controlsRef.current) return;
      
      const controls = controlsRef.current;
      // Check for Shift key (robust check)
      const isShift = e.shiftKey || (e.getModifierState && e.getModifierState('Shift'));

      // Update Mouse mapping: Shift + Left -> Pan, Left -> Rotate
      controls.mouseButtons.LEFT = isShift ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
      
      // Update Touch mapping: Shift + 1-finger -> Pan, 1-finger -> Rotate
      controls.touches.ONE = isShift ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    };

    // Capture phase is critical: run this BEFORE OrbitControls' own listener
    gl.domElement.addEventListener('pointerdown', handlePointerDown, { capture: true });
    
    const handleKeyChange = (e) => {
        if (!controlsRef.current) return;
        if (e.key === 'Shift') {
            const isShift = e.type === 'keydown';
            const controls = controlsRef.current;
            controls.mouseButtons.LEFT = isShift ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
            controls.touches.ONE = isShift ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
        }
    };
    
    window.addEventListener('keydown', handleKeyChange);
    window.addEventListener('keyup', handleKeyChange);

    return () => {
      gl.domElement.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('keydown', handleKeyChange);
      window.removeEventListener('keyup', handleKeyChange);
    };
  }, [gl.domElement]);

  return (
    <OrbitControls 
      ref={controlsRef}
      makeDefault 
      minPolarAngle={0} 
      maxPolarAngle={Math.PI / 2.1}
      screenSpacePanning={true}
      {...props} 
    />
  );
}

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

// --- Asset Registry ---
const WINDOW_ASSETS = {
  'standard': (props) => <StandardWindow {...props} />,
  // 'victorian': (props) => <VictorianWindow {...props} />, // Future
};

const DOOR_ASSETS = {
  'standard': (props) => <StandardDoor {...props} />,
};

function StandardWindow({ w, h, frameDepth, frameThick, glassThick, glassColor, frameColor, isFlipped, isOpen, sashW, sashH }) {
    const angle = Math.PI / 3;
    const leftAngle = isFlipped ? -angle : angle;
    const rightAngle = isFlipped ? angle : -angle;

    return (
      <>
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
      </>
    );
}

function StandardDoor({ w, h, frameDepth, frameThick, frameColor, doorColor, isFlipped, isOpen }) {
    const angle = isFlipped ? -Math.PI / 2 : Math.PI / 2;
    return (
      <>
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
      </>
    );
}

function Opening({ data, isDark }) {
  const { type, size, isOpen, isFlipped, assetId = 'standard' } = data;
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

    const AssetComponent = WINDOW_ASSETS[assetId] || WINDOW_ASSETS['standard'];

    return (
      <group position={data.pos} rotation={data.rot}>
         <AssetComponent 
            w={w} h={h} 
            frameDepth={frameDepth} 
            frameThick={frameThick} 
            glassThick={glassThick}
            glassColor={glassColor}
            frameColor={frameColor}
            isFlipped={isFlipped}
            isOpen={isOpen}
            sashW={sashW}
            sashH={sashH}
         />
      </group>
    );
  } else {
    // Door
    const AssetComponent = DOOR_ASSETS[assetId] || DOOR_ASSETS['standard'];

    return (
      <group position={data.pos} rotation={data.rot}>
         <AssetComponent 
            w={w} h={h} 
            frameDepth={frameDepth}
            frameThick={frameThick}
            frameColor={frameColor}
            doorColor={doorColor}
            isFlipped={isFlipped}
            isOpen={isOpen}
         />
      </group>
    );
  }
}

function ProceduralSlab({ layer, elevation, isDark }) {
  const { setActiveLayer, setSelection, setContextMenuData } = useStore();
  const EPS = 0.001; // Tiny offset to prevent Z-fighting with edge walls

  const shapes = useMemo(() => {
    if (layer.walls.length === 0) return [];
    
    const shapesList = [];
    const remaining = [...layer.walls];
    const getNode = (id) => layer.nodes.find(n => n.id === id);

    while (remaining.length > 0) {
      const shape = new THREE.Shape();
      
      let current = remaining.shift();
      let nStart = getNode(current.startNodeId);
      let nEnd = getNode(current.endNodeId);
      if (!nStart || !nEnd) continue;

      const chainStartId = current.startNodeId;

      shape.moveTo(nStart.x, nStart.y);
      shape.lineTo(nEnd.x, nEnd.y);
      
      let tailId = current.endNodeId;
      
      // Trace chain
      while (true) {
         const idx = remaining.findIndex(w => w.startNodeId === tailId || w.endNodeId === tailId);
         if (idx === -1) break; 
         
         const nextWall = remaining.splice(idx, 1)[0];
         const isStart = nextWall.startNodeId === tailId;
         const nextNodeId = isStart ? nextWall.endNodeId : nextWall.startNodeId;
         
         tailId = nextNodeId;
         const p = getNode(tailId);
         if (p) shape.lineTo(p.x, p.y);
      }

      // Only add if it's a closed loop
      if (tailId === chainStartId) {
        shapesList.push(shape);
      }
    }
    return shapesList;
  }, [layer]);

  if (shapes.length === 0) return null;

  return (
    <group>
      {/* Top Face */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, elevation + layer.height + EPS, 0]} 
        castShadow 
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          setActiveLayer(layer.id);
          setSelection({ nodes: [], walls: [] });
          setContextMenuData(null);
        }}
      >
        <shapeGeometry args={[shapes]} />
        <meshStandardMaterial 
          color={isDark ? "#1f2937" : "#9ca3af"} 
          roughness={0.9} 
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Bottom Face */}
      <mesh 
        rotation={[Math.PI / 2, 0, 0]} 
        position={[0, elevation - EPS, 0]} 
        scale={[1, -1, 1]}
        receiveShadow
      >
        <shapeGeometry args={[shapes]} />
        <meshStandardMaterial 
          color={isDark ? "#1f2937" : "#9ca3af"} 
          roughness={0.9} 
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function ProceduralWall({ wall, layer, elevation, isDark, height = 2.5, overrideColor }) {
  // Read from layer prop, NOT global store for geometry
  const { nodes, walls, openings } = layer; 
  const { selectedWallIds, setSelection, setContextMenuData, setActiveLayer } = useStore();
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
        addBlock(seg.t0, seg.t1, 0, height);
      } else {
        const op = seg.opening;
        if (op.y > 0) addBlock(seg.t0, seg.t1, 0, op.y);
        if (op.y + op.height < height) addBlock(seg.t0, seg.t1, op.y + op.height, height);
      }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [wall, nodes, walls, openings, elevation, height]);

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
          setActiveLayer(layer.id);
          setSelection({ nodes: [], walls: [wall.id] });
          setContextMenuData({ x: e.clientX, y: e.clientY });
        }}
      >
        <meshStandardMaterial 
          color={isSelected ? "#60a5fa" : (overrideColor || (isDark ? "#e5e7eb" : "#ffffff"))} 
          roughness={0.8} 
        />
      </mesh>
      {wallOpenings.map((op) => op && (
         <Opening key={op.id} data={op} isDark={isDark} />
      ))}
    </group>
  );
}

function RailingSection({ length, isDark }) {
  const postRadius = 0.03;
  const railRadius = 0.02;
  const height = 1.0;
  const balusterCount = Math.floor(length / 0.15);
  
  const color = isDark ? "#4b5563" : "#d1d5db"; // Metal gray
  
  return (
    <group>
      {/* End Posts */}
      <mesh position={[-length/2 + postRadius, height/2, 0]} castShadow receiveShadow>
         <cylinderGeometry args={[postRadius, postRadius, height]} />
         <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[length/2 - postRadius, height/2, 0]} castShadow receiveShadow>
         <cylinderGeometry args={[postRadius, postRadius, height]} />
         <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Top Rail */}
      <mesh position={[0, height - 0.05, 0]} rotation={[0, 0, Math.PI/2]} castShadow receiveShadow>
         <cylinderGeometry args={[railRadius, railRadius, length]} />
         <meshStandardMaterial color={color} />
      </mesh>
      {/* Bottom Rail */}
      <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI/2]} castShadow receiveShadow>
         <cylinderGeometry args={[railRadius, railRadius, length]} />
         <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Balusters */}
      {Array.from({ length: balusterCount }).map((_, i) => {
         const x = -length/2 + (i + 1) * (length / (balusterCount + 1));
         return (
            <mesh key={i} position={[x, height/2, 0]} castShadow receiveShadow>
               <cylinderGeometry args={[0.01, 0.01, height]} />
               <meshStandardMaterial color={color} />
            </mesh>
         );
      })}
    </group>
  );
}

function Gate({ width, isOpen, isDark }) {
  const height = 1.0;
  const frameColor = isDark ? "#374151" : "#6b7280"; 
  const panelColor = isDark ? "#4b5563" : "#9ca3af";
  const metalColor = "#1f2937"; // Dark metal for handle/hinges
  
  // Dimensions
  const frameThick = 0.05;
  const barRadius = 0.008;
  const barCount = 6;
  
  return (
    <group rotation={[0, isOpen ? Math.PI / 2 : 0, 0]} position={[-width/2, 0, 0]}>
       <group position={[width/2, 0, 0]}>
         
         {/* -- Hinges (Pivot Side) -- */}
         <group position={[-width/2 + frameThick/2, 0, 0]}>
            <mesh position={[-0.02, height - 0.2, 0]} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.1]} />
                <meshStandardMaterial color={metalColor} />
            </mesh>
            <mesh position={[-0.02, 0.2, 0]} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.1]} />
                <meshStandardMaterial color={metalColor} />
            </mesh>
         </group>

         {/* -- Main Frame -- */}
         {/* Vertical Left */}
         <mesh position={[-width/2 + frameThick/2, height/2, 0]} castShadow receiveShadow>
            <boxGeometry args={[frameThick, height, frameThick]} />
            <meshStandardMaterial color={frameColor} />
         </mesh>
         {/* Vertical Right */}
         <mesh position={[width/2 - frameThick/2, height/2, 0]} castShadow receiveShadow>
            <boxGeometry args={[frameThick, height, frameThick]} />
            <meshStandardMaterial color={frameColor} />
         </mesh>
         {/* Horizontal Top */}
         <mesh position={[0, height - frameThick/2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, frameThick, frameThick]} />
            <meshStandardMaterial color={frameColor} />
         </mesh>
         {/* Horizontal Bottom */}
         <mesh position={[0, frameThick/2, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, frameThick, frameThick]} />
            <meshStandardMaterial color={frameColor} />
         </mesh>
         {/* Horizontal Middle (Divider) */}
         <mesh position={[0, height * 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[width - 2*frameThick, 0.04, 0.03]} />
            <meshStandardMaterial color={frameColor} />
         </mesh>

         {/* -- Infill: Vertical Bars (Top Section) -- */}
         {Array.from({ length: barCount }).map((_, i) => {
             const sectionWidth = width - 2 * frameThick;
             const spacing = sectionWidth / (barCount + 1);
             const x = -sectionWidth/2 + (i + 1) * spacing;
             const topSectionH = height * 0.6 - frameThick - 0.02; // Approx height
             const barCenterY = height * 0.4 + 0.02 + topSectionH/2;
             
             return (
                <mesh key={i} position={[x, barCenterY, 0]} castShadow>
                    <cylinderGeometry args={[barRadius, barRadius, topSectionH]} />
                    <meshStandardMaterial color={panelColor} />
                </mesh>
             );
         })}
         
         {/* -- Infill: Solid Panel (Bottom Section) -- */}
         <mesh position={[0, (height * 0.4)/2 + frameThick/2, 0]} castShadow receiveShadow>
             <boxGeometry args={[width - 2*frameThick, height * 0.4 - frameThick, 0.015]} />
             <meshStandardMaterial color={panelColor} />
         </mesh>

         {/* -- Handle -- */}
         <group position={[width/2 - frameThick - 0.06, height * 0.55, 0]}>
             {/* Handle Base */}
             <mesh rotation={[Math.PI/2, 0, 0]} castShadow>
                 <cylinderGeometry args={[0.03, 0.03, 0.04]} />
                 <meshStandardMaterial color={metalColor} roughness={0.4} metalness={0.6} />
             </mesh>
             {/* Lever Front */}
             <mesh position={[-0.06, 0, 0.03]} castShadow>
                 <boxGeometry args={[0.12, 0.015, 0.015]} />
                 <meshStandardMaterial color={metalColor} roughness={0.4} metalness={0.6} />
             </mesh>
             {/* Lever Back */}
             <mesh position={[-0.06, 0, -0.03]} castShadow>
                 <boxGeometry args={[0.12, 0.015, 0.015]} />
                 <meshStandardMaterial color={metalColor} roughness={0.4} metalness={0.6} />
             </mesh>
         </group>

       </group>
    </group>
  );
}

function Railing({ wall, layer, elevation, isDark }) {
  const { nodes } = layer;
  const { hasGate, gateOpen } = wall;
  const startNode = nodes.find(n => n.id === wall.startNodeId);
  const endNode = nodes.find(n => n.id === wall.endNodeId);
  
  if (!startNode || !endNode) return null;

  const dx = endNode.x - startNode.x;
  const dy = -(endNode.y - startNode.y); // R3F Z is negative Y
  const len = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx); 
  
  const midX = (startNode.x + endNode.x) / 2;
  const midZ = -(startNode.y + endNode.y) / 2;

  const gateWidth = 1.0;
  const canHaveGate = len > gateWidth + 0.2;
  const effectiveGate = hasGate && canHaveGate;

  return (
    <group position={[midX, elevation, midZ]} rotation={[0, -angle, 0]}>
       {effectiveGate ? (
         <>
           {/* Left Section */}
           <group position={[-(len - gateWidth)/4 - gateWidth/2, 0, 0]}>
              <RailingSection length={(len - gateWidth)/2} isDark={isDark} />
           </group>
           
           {/* Gate Section */}
           <group position={[0, 0, 0]}>
              <Gate width={gateWidth} isOpen={gateOpen} isDark={isDark} />
           </group>
           
           {/* Right Section */}
           <group position={[(len - gateWidth)/4 + gateWidth/2, 0, 0]}>
              <RailingSection length={(len - gateWidth)/2} isDark={isDark} />
           </group>
         </>
       ) : (
         <RailingSection length={len} isDark={isDark} />
       )}
    </group>
  );
}

export default function Viewport3D() {
  const { layers, theme, setSelection, setContextMenuData, viewMode } = useStore();
  const isDark = theme === 'dark';

  const visibleLayers = layers.filter(l => l.visible);
  
  const layerStack = useMemo(() => {
    return visibleLayers.reduce((acc, layer) => {
      const last = acc[acc.length - 1];
      const elevation = last ? last.elevation + last.layer.height : 0;
      acc.push({ layer, elevation });
      return acc;
    }, []);
  }, [visibleLayers]);

  return (
    <div className="w-full h-full relative z-0 select-none">
      {/* Overlay UI */}
      <div className="absolute top-4 right-4 z-50">
         <ViewModeSelector />
      </div>

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
        
        {viewMode === 'FIRST_PERSON' ? <FirstPersonController /> : <SmartOrbitControls />}
        
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
                height={layer.height}
                isDark={isDark} 
              />
            ));
          } else if (layer.type === 'floor') {
            return (
              <group key={layer.id}>
                {/* The Slab Fill */}
                <ProceduralSlab 
                  layer={layer} 
                  elevation={elevation} 
                  isDark={isDark} 
                />
                {/* The Slab Edges (Interactable) */}
                {layer.walls.map(wall => (
                  <React.Fragment key={wall.id}>
                    <ProceduralWall 
                      wall={wall} 
                      layer={layer} 
                      elevation={elevation} 
                      height={layer.height}
                      isDark={isDark}
                      overrideColor={isDark ? "#1f2937" : "#9ca3af"}
                    />
                    {wall.hasRailing && (
                      <Railing 
                        wall={wall}
                        layer={layer}
                        elevation={elevation + layer.height}
                        isDark={isDark}
                      />
                    )}
                  </React.Fragment>
                ))}
              </group>
            );
          }
          return null;
        })}
        
      </Canvas>
    </div>
  );
}

function Floor({ isDark }) {
  // Major = 1m, Minor = 0.2m
  // Colors adapted to match 2D editor feel
  const majorColor = isDark ? "#4b5563" : "#9ca3af"; // Gray-600 / Gray-400
  const minorColor = isDark ? "#1f2937" : "#e5e7eb"; // Gray-800 / Gray-200

  return (
    <group position={[0, -0.01, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={isDark ? "#111827" : "#f9fafb"} />
      </mesh>
      {/* Major Grid (1m) */}
      <gridHelper args={[200, 200, majorColor, majorColor]} position={[0, 0.01, 0]} />
      {/* Minor Grid (0.2m) */}
      <gridHelper args={[200, 1000, minorColor, minorColor]} position={[0, 0.01, 0]} />
    </group>
  );
}
