import { create } from 'zustand'

export const useStore = create((set) => ({
  nodes: [
    { id: 'n1', x: -2, y: -2 },
    { id: 'n2', x: 2, y: -2 },
    { id: 'n3', x: 2, y: 2 },
    { id: 'n4', x: -2, y: 2 },
  ],
  walls: [
    { id: 'w1', startNodeId: 'n1', endNodeId: 'n2', thickness: 0.2 },
    { id: 'w2', startNodeId: 'n2', endNodeId: 'n3', thickness: 0.2 },
    { id: 'w3', startNodeId: 'n3', endNodeId: 'n4', thickness: 0.2 },
    { id: 'w4', startNodeId: 'n4', endNodeId: 'n1', thickness: 0.2 },
  ],
  openings: [], // { id, wallId, type: 'window'|'door', dist: 0.5 (normalized 0-1), width: 1.0, height: 1.5 }
  mode: 'IDLE', // IDLE, DRAWING, DRAGGING
  drawingStartNode: null,
  hoveredNodeId: null,
  hoveredWallId: null,
  selectedNodeIds: [],
  selectedWallIds: [],
  contextMenuData: null, // { x, y, worldX, worldY }

  setMode: (mode) => set({ mode }),
  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),
  setHoveredWallId: (id) => set({ hoveredWallId: id }),
  setSelection: ({ nodes, walls }) => set({ selectedNodeIds: nodes, selectedWallIds: walls }),
  setContextMenuData: (data) => set({ contextMenuData: data }),
  
  deleteSelection: () => set((state) => {
    const nodesToDelete = new Set(state.selectedNodeIds);
    const wallsToDelete = new Set(state.selectedWallIds);
    
    // Also delete walls connected to deleted nodes
    state.walls.forEach(w => {
      if (nodesToDelete.has(w.startNodeId) || nodesToDelete.has(w.endNodeId)) {
        wallsToDelete.add(w.id);
      }
    });

    const newNodes = state.nodes.filter(n => !nodesToDelete.has(n.id));
    const newWalls = state.walls.filter(w => !wallsToDelete.has(w.id));
    const newOpenings = state.openings.filter(o => !wallsToDelete.has(o.wallId));

    return {
      nodes: newNodes,
      walls: newWalls,
      openings: newOpenings,
      selectedNodeIds: [],
      selectedWallIds: [],
      hoveredNodeId: null,
      hoveredWallId: null,
      contextMenuData: null
    };
  }),
  
  addNode: (x, y) => {
    const id = crypto.randomUUID()
    set((state) => ({ nodes: [...state.nodes, { id, x, y }] }))
    return id
  },

  addWall: (startNodeId, endNodeId) => {
    const id = crypto.randomUUID()
    set((state) => ({ walls: [...state.walls, { id, startNodeId, endNodeId, thickness: 0.2 }] }))
    return id
  },
  
  addOpening: (wallId, type) => {
    const id = crypto.randomUUID()
    set((state) => ({ 
      openings: [...state.openings, { 
        id, 
        wallId, 
        type, 
        dist: 0.5, // Center by default
        width: type === 'door' ? 1.0 : 1.5,
        height: type === 'door' ? 2.2 : 1.2,
        y: type === 'door' ? 0 : 0.9 // Sill height
      }] 
    }))
    return id
  },

  setWallOpening: (wallId, type) => {
    set((state) => {
      // Remove existing openings for this wall
      const cleanOpenings = state.openings.filter(o => o.wallId !== wallId);
      
      if (!type) {
        return { openings: cleanOpenings };
      }
      
      // Add new one
      const id = crypto.randomUUID();
      const newOpening = {
        id,
        wallId,
        type,
        dist: 0.5,
        width: type === 'door' ? 1.0 : 1.5,
        height: type === 'door' ? 2.2 : 1.2,
        y: type === 'door' ? 0 : 0.9
      };
      
      return { openings: [...cleanOpenings, newOpening] };
    });
  },

  updateNode: (id, x, y) => set((state) => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, x, y } : n)
  })),

  setDrawingStartNode: (nodeId) => set({ drawingStartNode: nodeId }),

  setAll: (data) => set({
    nodes: data.nodes || [],
    walls: data.walls || [],
    openings: data.openings || [],
    mode: 'IDLE',
    selectedNodeIds: [],
    selectedWallIds: [],
    hoveredNodeId: null,
    hoveredWallId: null,
    drawingStartNode: null,
    contextMenuData: null
  }),

  reset: () => set({
    nodes: [],
    walls: [],
    openings: [],
    mode: 'IDLE',
    drawingStartNode: null,
    hoveredNodeId: null,
    hoveredWallId: null,
    selectedNodeIds: [],
    selectedWallIds: [],
    contextMenuData: null
  }),
}))
