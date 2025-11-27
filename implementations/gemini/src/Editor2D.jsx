import React, { useState, useEffect, useRef } from 'react';
import { useStore } from './store';
import { distToSegment } from './geometry';

const SCALE = 50;

export default function Editor2D() {
  const { 
    nodes, walls, openings, mode, 
    addNode, addWall, updateNode, 
    hoveredNodeId, setHoveredNodeId, 
    hoveredWallId, setHoveredWallId,
    selectedWallId, setSelectedWallId,
    setMode, drawingStartNode, setDrawingStartNode
  } = useStore();
  
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [dragId, setDragId] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // World coords
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({ 
          w: entry.contentRect.width, 
          h: entry.contentRect.height 
        });
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const toScreen = (x, y) => ({
    x: dimensions.w / 2 + x * SCALE,
    y: dimensions.h / 2 - y * SCALE
  });
  
  const toWorld = (clientX, clientY) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      x: (sx - dimensions.w / 2) / SCALE,
      y: -(sy - dimensions.h / 2) / SCALE
    };
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    const { x, y } = toWorld(e.clientX, e.clientY);

    if (mode === 'DRAWING') {
      if (hoveredNodeId) {
        if (drawingStartNode) {
          if (drawingStartNode !== hoveredNodeId) {
            addWall(drawingStartNode, hoveredNodeId);
            setDrawingStartNode(hoveredNodeId); 
          }
        } else {
          setDrawingStartNode(hoveredNodeId);
        }
      } else {
        const snapX = Math.round(x * 10) / 10;
        const snapY = Math.round(y * 10) / 10;
        
        const newNodeId = addNode(snapX, snapY);
        
        if (drawingStartNode) {
          addWall(drawingStartNode, newNodeId);
        }
        setDrawingStartNode(newNodeId);
      }
    } else {
      // IDLE mode
      if (hoveredNodeId) {
         setDragId(hoveredNodeId);
         setMode('DRAGGING');
         setSelectedWallId(null);
      } else if (hoveredWallId) {
         setSelectedWallId(hoveredWallId);
      } else {
         setSelectedWallId(null);
      }
    }
  };

  const handlePointerMove = (e) => {
    const { x, y } = toWorld(e.clientX, e.clientY);
    setMousePos({ x, y });

    if (dragId) {
      updateNode(dragId, x, y);
      if (hoveredNodeId !== dragId) setHoveredNodeId(dragId);
      return;
    }

    // Hover check Node
    let foundNode = null;
    for (const n of nodes) {
      const s = toScreen(n.x, n.y);
      if (!containerRef.current) break;
      const rect = containerRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      
      const dist = Math.hypot(mx - s.x, my - s.y);
      if (dist < 15) { 
        foundNode = n.id;
        break;
      }
    }
    setHoveredNodeId(foundNode);

    // Hover check Wall (only if no node hovered)
    if (!foundNode) {
      let foundWall = null;
      let minDst = Infinity;
      for (const w of walls) {
        const start = nodes.find(n => n.id === w.startNodeId);
        const end = nodes.find(n => n.id === w.endNodeId);
        if (!start || !end) continue;
        
        const d = distToSegment({x, y}, start, end); // World units
        // Threshold: 10px / SCALE
        if (d < 10 / SCALE) {
          if (d < minDst) {
            minDst = d;
            foundWall = w.id;
          }
        }
      }
      setHoveredWallId(foundWall);
    } else {
      setHoveredWallId(null);
    }
  };

  const handlePointerUp = () => {
    if (mode === 'DRAGGING') {
      setDragId(null);
      setMode('IDLE');
    }
  };
  
  const handleContextMenu = (e) => {
    e.preventDefault();
    if (mode === 'DRAWING') {
      setDrawingStartNode(null);
      setMode('IDLE');
    }
  };

  let previewLine = null;
  if (mode === 'DRAWING' && drawingStartNode) {
    const startNode = nodes.find(n => n.id === drawingStartNode);
    if (startNode) {
      const s = toScreen(startNode.x, startNode.y);
      let endX = mousePos.x;
      let endY = mousePos.y;
      
      if (hoveredNodeId) {
        const hNode = nodes.find(n => n.id === hoveredNodeId);
        if (hNode) {
          endX = hNode.x;
          endY = hNode.y;
        }
      } else {
          endX = Math.round(endX * 10) / 10;
          endY = Math.round(endY * 10) / 10;
      }
      
      const ePos = toScreen(endX, endY);
      
      previewLine = (
        <line 
          x1={s.x} y1={s.y} 
          x2={ePos.x} y2={ePos.y} 
          stroke="#3b82f6" 
          strokeWidth="2" 
          strokeDasharray="4 4" 
        />
      );
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-white select-none">
      <svg 
        className="w-full h-full pointer-events-auto block"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
      >
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
             <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e5e5" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Walls */}
        {walls.map(wall => {
          const startNode = nodes.find(n => n.id === wall.startNodeId);
          const endNode = nodes.find(n => n.id === wall.endNodeId);
          if (!startNode || !endNode) return null;

          const s = toScreen(startNode.x, startNode.y);
          const e = toScreen(endNode.x, endNode.y);

          const isHovered = hoveredWallId === wall.id;
          const isSelected = selectedWallId === wall.id;
          
          const strokeColor = isSelected ? "#2563eb" : (isHovered ? "#64748b" : "#94a3b8");
          const opacity = isSelected || isHovered ? 1.0 : 0.5;

          // Openings
          const wallOpenings = openings.filter(o => o.wallId === wall.id).map(op => {
             // Linear interp
             const dx = endNode.x - startNode.x;
             const dy = endNode.y - startNode.y;
             const len = Math.hypot(dx, dy);
             const cx = startNode.x + dx * op.dist;
             const cy = startNode.y + dy * op.dist;
             
             // Half width vector
             const ux = dx / len;
             const uy = dy / len;
             
             const w2 = op.width / 2;
             const x1 = cx - ux * w2;
             const y1 = cy - uy * w2;
             const x2 = cx + ux * w2;
             const y2 = cy + uy * w2;
             
             const p1 = toScreen(x1, y1);
             const p2 = toScreen(x2, y2);
             
             return (
               <line 
                 key={op.id}
                 x1={p1.x} y1={p1.y}
                 x2={p2.x} y2={p2.y}
                 stroke="white"
                 strokeWidth={(wall.thickness * SCALE) - 2}
                 strokeLinecap="butt"
               />
             );
          });

          return (
            <g key={wall.id}>
              <line 
                x1={s.x} y1={s.y} x2={e.x} y2={e.y}
                stroke={strokeColor}
                strokeWidth={wall.thickness * SCALE}
                strokeLinecap="round"
                className="transition-colors duration-150"
                style={{ opacity }}
              />
              {wallOpenings}
            </g>
          );
        })}
        
        {previewLine}

        {/* Nodes */}
        {nodes.map(node => {
           const s = toScreen(node.x, node.y);
           const isStart = node.id === drawingStartNode;
           return (
             <circle 
               key={node.id} 
               cx={s.x} 
               cy={s.y} 
               r={isStart ? 8 : 6} 
               fill={hoveredNodeId === node.id || dragId === node.id || isStart ? "#3b82f6" : "#1e293b"}
               stroke="white"
               strokeWidth="2"
               className="cursor-pointer transition-colors"
             />
           );
        })}
      </svg>
    </div>
  );
}