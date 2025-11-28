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
    selectedNodeIds, selectedWallIds, setSelection,
    setMode, drawingStartNode, setDrawingStartNode,
    setContextMenuData, theme
  } = useStore();
  
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [dragId, setDragId] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // World coords
  const [selectionStart, setSelectionStart] = useState(null); // World coords
  const [pan, setPan] = useState({ x: 0, y: 0 }); // Screen pixels
  
  // Theme Colors
  const isDark = theme === 'dark';
  const gridColor = isDark ? "#334155" : "#e5e5e5"; // Slate-700 vs Gray-200
  const wallColorDefault = isDark ? "#94a3b8" : "#94a3b8"; // Keep same?
  const wallColorHover = isDark ? "#cbd5e1" : "#64748b";
  const nodeColorDefault = isDark ? "#e2e8f0" : "#1e293b";
  const nodeStroke = isDark ? "#0f172a" : "white";

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
    x: dimensions.w / 2 + x * SCALE + pan.x,
    y: dimensions.h / 2 - y * SCALE + pan.y
  });
  
  const toWorld = (clientX, clientY) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const sx = clientX - rect.left - pan.x;
    const sy = clientY - rect.top - pan.y;
    return {
      x: (sx - dimensions.w / 2) / SCALE,
      y: -(sy - dimensions.h / 2) / SCALE
    };
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
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
         setContextMenuData(null); // Clear menu when interacting
         if (!selectedNodeIds.includes(hoveredNodeId)) {
            setSelection({ nodes: [hoveredNodeId], walls: [] });
         }
      } else if (hoveredWallId) {
         setSelection({ nodes: [], walls: [hoveredWallId] });
         setContextMenuData({ x: e.clientX, y: e.clientY, worldX: x, worldY: y });
      } else {
         // Start Selection Box
         setSelectionStart({ x, y });
         setMode('SELECTING_RECT');
         setSelection({ nodes: [], walls: [] });
         setContextMenuData(null);
      }
    }
  };

  const handlePointerMove = (e) => {
    const { x, y } = toWorld(e.clientX, e.clientY);
    setMousePos({ x, y });

    if (dragId) {
      updateNode(dragId, x, y);
      if (hoveredNodeId !== dragId) setHoveredNodeId(dragId);
      // Ensure menu is gone
      setContextMenuData(null);
      return;
    }

    if (mode === 'SELECTING_RECT') {
      // Just updating mousePos is enough for render
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

    // Hover check Wall
    if (!foundNode) {
      let foundWall = null;
      let minDst = Infinity;
      for (const w of walls) {
        const start = nodes.find(n => n.id === w.startNodeId);
        const end = nodes.find(n => n.id === w.endNodeId);
        if (!start || !end) continue;
        
        const d = distToSegment({x, y}, start, end); 
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

  const handlePointerUp = (e) => {
    if (mode === 'DRAGGING') {
      setDragId(null);
      setMode('IDLE');
    } else if (mode === 'SELECTING_RECT' && selectionStart) {
      // Calculate Selection
      const minX = Math.min(selectionStart.x, mousePos.x);
      const maxX = Math.max(selectionStart.x, mousePos.x);
      const minY = Math.min(selectionStart.y, mousePos.y);
      const maxY = Math.max(selectionStart.y, mousePos.y);

      const selNodes = nodes.filter(n => 
        n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY
      ).map(n => n.id);

      // Select walls if both points are inside OR if it intersects?
      // Let's do: If BOTH points inside, strictly enclosed.
      const selWalls = walls.filter(w => {
        const s = nodes.find(n => n.id === w.startNodeId);
        const e = nodes.find(n => n.id === w.endNodeId);
        if (!s || !e) return false;
        return (
          s.x >= minX && s.x <= maxX && s.y >= minY && s.y <= maxY &&
          e.x >= minX && e.x <= maxX && e.y >= minY && e.y <= maxY
        );
      }).map(w => w.id);

      setSelection({ nodes: selNodes, walls: selWalls });
      if (selWalls.length > 0) {
        setContextMenuData({ x: e.clientX, y: e.clientY, worldX: mousePos.x, worldY: mousePos.y });
      } else {
        setContextMenuData(null);
      }
      setMode('IDLE');
      setSelectionStart(null);
    }
  };
  
  const handleContextMenu = (e) => {
    e.preventDefault();
    if (mode === 'DRAWING') {
      setDrawingStartNode(null);
      setMode('IDLE');
    }
  };

  // Render Selection Rect
  let selectionRect = null;
  if (mode === 'SELECTING_RECT' && selectionStart) {
    const s = toScreen(selectionStart.x, selectionStart.y);
    const e = toScreen(mousePos.x, mousePos.y);
    const x = Math.min(s.x, e.x);
    const y = Math.min(s.y, e.y);
    const w = Math.abs(s.x - e.x);
    const h = Math.abs(s.y - e.y);
    
    selectionRect = (
      <rect 
        x={x} y={y} width={w} height={h} 
        fill="rgba(59, 130, 246, 0.1)" 
        stroke="#3b82f6" 
        strokeWidth="1" 
        strokeDasharray="4 4" 
      />
    );
  }

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
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-white dark:bg-gray-950 select-none">
      <svg 
        className="w-full h-full pointer-events-auto block"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
      >
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x},${pan.y})`}>
             <path d="M 50 0 L 0 0 0 50" fill="none" stroke={gridColor} strokeWidth="1"/>
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
          const isSelected = selectedWallIds.includes(wall.id);
          
          const strokeColor = isSelected ? "#3b82f6" : (isHovered ? wallColorHover : wallColorDefault);
          const opacity = isSelected || isHovered ? 1.0 : 0.5;

          // Openings
          const wallOpenings = openings.filter(o => o.wallId === wall.id).map(op => {
             const dx = endNode.x - startNode.x;
             const dy = endNode.y - startNode.y;
             const len = Math.hypot(dx, dy);
             const cx = startNode.x + dx * op.dist;
             const cy = startNode.y + dy * op.dist;
             
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
                 stroke={isDark ? "#0f172a" : "white"}
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
        {selectionRect}

        {/* Nodes */}
        {nodes.map(node => {
           const s = toScreen(node.x, node.y);
           const isStart = node.id === drawingStartNode;
           const isSelected = selectedNodeIds.includes(node.id);
           
           return (
             <circle 
               key={node.id} 
               cx={s.x} 
               cy={s.y} 
               r={isStart ? 8 : 6} 
               fill={hoveredNodeId === node.id || dragId === node.id || isStart || isSelected ? "#3b82f6" : nodeColorDefault}
               stroke={nodeStroke}
               strokeWidth="2"
               className="cursor-pointer transition-colors"
             />
           );
        })}
      </svg>
    </div>
  );
}