import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useStore } from './store';

export default function Editor2D() {
  const { 
    layers, activeLayerId, mode, 
    addNode, addWall, updateNode, 
    hoveredNodeId, hoveredWallId, setHoveredNodeId,
    selectedNodeIds, selectedWallIds, setSelection, setContextMenuData,
    drawingStartNode, setDrawingStartNode,
    viewState, setViewState
  } = useStore();

  const svgRef = useRef(null);
  const [dragStart, setDragStart] = useState(null); // For node dragging
  const [panStart, setPanStart] = useState(null); // For canvas panning
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // World coordinates
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (svgRef.current) {
        setDimensions({ w: svgRef.current.clientWidth, h: svgRef.current.clientHeight });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize(); // Initial
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const activeLayer = layers.find(l => l.id === activeLayerId);
  const nodes = activeLayer?.nodes || [];
  const walls = activeLayer?.walls || [];
  const openings = activeLayer?.openings || [];

  // Onion Skin Layers (Visible but not active)
  const backgroundLayers = layers.filter(l => l.visible && l.id !== activeLayerId);

  // --- Coordinate Transforms ---
  const toWorld = useCallback((clientX, clientY) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = clientX - rect.left - rect.width / 2;
    const rawY = clientY - rect.top - rect.height / 2;
    return {
      x: (rawX - viewState.x) / (50 * viewState.zoom),
      y: (rawY - viewState.y) / (50 * viewState.zoom)
    };
  }, [viewState]);

  // --- Navigation Handlers ---
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomSensitivity = 0.001;
      const newZoom = Math.max(0.1, Math.min(5, viewState.zoom - e.deltaY * zoomSensitivity));
      setViewState({ zoom: newZoom });
    } else {
      // Pan (Trackpad or Mouse Wheel)
      setViewState({ 
        x: viewState.x - e.deltaX,
        y: viewState.y - e.deltaY 
      });
    }
  }, [viewState, setViewState]);
  
  // Attach non-passive wheel listener
  useEffect(() => {
     const el = svgRef.current;
     if (el) {
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
     }
  }, [handleWheel]);

  const handlePointerDown = (e) => {
    const worldPos = toWorld(e.clientX, e.clientY);
    
    // Middle Mouse or Space+Click -> Pan
    if (e.button === 1 || (e.button === 0 && e.getModifierState("Space"))) {
       setPanStart({ x: e.clientX, y: e.clientY, viewX: viewState.x, viewY: viewState.y });
       return;
    }
    
    if (e.button !== 0) return; // Only Left Click for tools

    // ... (rest of tool logic)
    
    // Check Node Hit
    const hitNode = nodes.find(n => Math.hypot(n.x - worldPos.x, n.y - worldPos.y) < 0.2 / viewState.zoom); // Dynamic hit radius
    
    if (mode === 'IDLE') {
       if (hitNode) {
         setSelection({ nodes: [hitNode.id], walls: [] });
         setContextMenuData({ x: e.clientX, y: e.clientY });
         setDragStart({ id: hitNode.id, startX: hitNode.x, startY: hitNode.y });
         e.stopPropagation();
       } else {
          // Check Wall Hit
          // Simple distance check to line segments
          let bestWall = null;
          let minDst = 0.2 / viewState.zoom;
          
          walls.forEach(w => {
             const start = nodes.find(n => n.id === w.startNodeId);
             const end = nodes.find(n => n.id === w.endNodeId);
             if (!start || !end) return;
             
             // Point to segment distance
             const A = worldPos.x - start.x;
             const B = worldPos.y - start.y;
             const C = end.x - start.x;
             const D = end.y - start.y;
             
             const dot = A * C + B * D;
             const lenSq = C * C + D * D;
             let param = -1;
             if (lenSq !== 0) param = dot / lenSq;
             
             let xx, yy;
             if (param < 0) { xx = start.x; yy = start.y; }
             else if (param > 1) { xx = end.x; yy = end.y; }
             else { xx = start.x + param * C; yy = start.y + param * D; }
             
             const dx = worldPos.x - xx;
             const dy = worldPos.y - yy;
             const dst = Math.sqrt(dx * dx + dy * dy);
             
             if (dst < minDst) {
                minDst = dst;
                bestWall = w;
             }
          });
          
          if (bestWall) {
             setSelection({ nodes: [], walls: [bestWall.id] });
             setContextMenuData({ x: e.clientX, y: e.clientY });
          } else {
             setSelection({ nodes: [], walls: [] });
             setContextMenuData(null);
          }
       }
    } else if (mode === 'DRAWING') {
       // ... Drawing logic
       let targetId = hitNode ? hitNode.id : null;
       
       if (!targetId) {
          // Snap to grid/axis?
          // For now just add node
          targetId = addNode(worldPos.x, worldPos.y);
       }
       
       if (!drawingStartNode) {
          setDrawingStartNode(targetId);
       } else {
          addWall(drawingStartNode, targetId);
          setDrawingStartNode(targetId); // Continue chain
       }
    }
  };

  const handlePointerMove = (e) => {
    // Panning
    if (panStart) {
       const dx = e.clientX - panStart.x;
       const dy = e.clientY - panStart.y;
       setViewState({ x: panStart.viewX + dx, y: panStart.viewY + dy });
       return;
    }

    const worldPos = toWorld(e.clientX, e.clientY);
    setMousePos(worldPos);

    if (dragStart) {
       updateNode(dragStart.id, worldPos.x, worldPos.y);
    }
    
    // Hover logic
    const hitNode = nodes.find(n => Math.hypot(n.x - worldPos.x, n.y - worldPos.y) < 0.2 / viewState.zoom);
    setHoveredNodeId(hitNode ? hitNode.id : null);
  };

  const handlePointerUp = () => {
    setDragStart(null);
    setPanStart(null);
  };
  
  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenuData({ x: e.clientX, y: e.clientY });
  };

  // Grid Rendering
  const gridSize = 100;
  const gridLines = [];
  for (let i = -gridSize; i <= gridSize; i++) {
     gridLines.push(<line key={`v${i}`} x1={i} y1={-gridSize} x2={i} y2={gridSize} stroke="#ddd" strokeWidth={0.02} />);
     gridLines.push(<line key={`h${i}`} x1={-gridSize} y1={i} x2={gridSize} y2={i} stroke="#ddd" strokeWidth={0.02} />);
  }

  return (
    <div className="w-full h-full bg-[#f9fafb] dark:bg-[#111827] overflow-hidden relative cursor-crosshair">
      <svg 
        ref={svgRef}
        className="w-full h-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={handleContextMenu}
      >
        <g transform={`translate(${viewState.x + dimensions.w/2}, ${viewState.y + dimensions.h/2}) scale(${50 * viewState.zoom})`}>
          {/* Background Layers (Onion Skin) */}
          {backgroundLayers.map(layer => (
            <g key={layer.id} opacity={0.3} pointerEvents="none" className="grayscale">
              {layer.walls.map(wall => {
                const start = layer.nodes.find(n => n.id === wall.startNodeId);
                const end = layer.nodes.find(n => n.id === wall.endNodeId);
                if (!start || !end) return null;
                return (
                   <line 
                     key={wall.id}
                     x1={start.x} y1={start.y}
                     x2={end.x} y2={end.y}
                     stroke="black"
                     strokeWidth={wall.thickness}
                     strokeLinecap="round"
                     className="dark:stroke-gray-400"
                   />
                );
              })}
              {layer.nodes.map(node => (
                 <circle 
                   key={node.id}
                   cx={node.x} cy={node.y}
                   r={0.15}
                   fill="white"
                   stroke="gray"
                   strokeWidth={0.05}
                 />
              ))}
            </g>
          ))}

          {/* Grid */}
          <g className="dark:opacity-10">{gridLines}</g>
          
          {/* Walls */}
          {walls.map(wall => {
            const start = nodes.find(n => n.id === wall.startNodeId);
            const end = nodes.find(n => n.id === wall.endNodeId);
            if (!start || !end) return null;
            
            const isSelected = selectedWallIds.includes(wall.id);
            const isHovered = hoveredWallId === wall.id;
            
            return (
               <line 
                 key={wall.id}
                 x1={start.x} y1={start.y}
                 x2={end.x} y2={end.y}
                 stroke={isSelected ? "#3b82f6" : (isHovered ? "#6b7280" : "black")}
                 strokeWidth={wall.thickness}
                 strokeLinecap="round"
                 className="dark:stroke-gray-300 transition-colors"
               />
            );
          })}

          {/* Openings */}
          {openings.map(opening => {
            const wall = walls.find(w => w.id === opening.wallId);
            if (!wall) return null;
            
            const start = nodes.find(n => n.id === wall.startNodeId);
            const end = nodes.find(n => n.id === wall.endNodeId);
            if (!start || !end) return null;

            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
            
            const cx = start.x + dx * opening.dist;
            const cy = start.y + dy * opening.dist;

            return (
              <g key={opening.id} transform={`translate(${cx}, ${cy}) rotate(${angleDeg})`}>
                {/* Hole background (clears the wall line) */}
                <rect 
                  x={-opening.width / 2} 
                  y={-wall.thickness / 2 - 0.02} 
                  width={opening.width} 
                  height={wall.thickness + 0.04} 
                  fill="#f9fafb" 
                  className="dark:fill-[#111827]"
                />
                
                {/* Frame (Thinner than wall) */}
                <rect 
                  x={-opening.width / 2} 
                  y={-(wall.thickness * 0.7) / 2} 
                  width={opening.width} 
                  height={wall.thickness * 0.7} 
                  fill="white"
                  stroke={opening.type === 'window' ? '#3b82f6' : '#854d0e'} 
                  strokeWidth={0.03}
                  className={opening.type === 'window' ? 'dark:fill-gray-700' : 'dark:fill-orange-900'}
                />
                
                {/* Window Glass Line or Door Swing indicator could go here */}
                {opening.type === 'window' && (
                  <line x1={-opening.width/2} y1={0} x2={opening.width/2} y2={0} stroke="#3b82f6" strokeWidth={0.02} />
                )}
              </g>
            );
          })}
          
          {/* Nodes */}
          {nodes.map(node => {
             const isSelected = selectedNodeIds.includes(node.id);
             const isHovered = hoveredNodeId === node.id;
             const isStart = drawingStartNode === node.id;
             
             return (
               <circle 
                 key={node.id}
                 cx={node.x} cy={node.y}
                 r={isSelected ? 0.2 : 0.15}
                 fill={isSelected || isStart ? "#3b82f6" : (isHovered ? "#ef4444" : "white")}
                 stroke="black"
                 strokeWidth={0.05}
                 className="transition-colors"
               />
             );
          })}
          
          {/* Drawing Preview */}
          {mode === 'DRAWING' && drawingStartNode && (
             <line 
               x1={nodes.find(n => n.id === drawingStartNode)?.x} 
               y1={nodes.find(n => n.id === drawingStartNode)?.y} 
               x2={mousePos.x} 
               y2={mousePos.y}
               stroke="#3b82f6"
               strokeWidth={0.1}
               strokeDasharray="0.2"
               opacity={0.6}
             />
          )}
        </g>
      </svg>
    </div>
  );
}
