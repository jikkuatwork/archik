import { create } from 'zustand'

const DEFAULT_LAYER_ID = 'layer-1';

export const useStore = create((set) => ({
  // Global State
  mode: 'IDLE', // IDLE, DRAWING, DRAGGING, SELECTING_RECT
  drawingStartNode: null,
  hoveredNodeId: null,
  hoveredWallId: null,
  selectedNodeIds: [],
  selectedWallIds: [],
  contextMenuData: null,
  theme: typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  
  // 2D View State
  viewState: { x: 0, y: 0, zoom: 1 },
  setViewState: (updates) => set((state) => ({ viewState: { ...state.viewState, ...updates } })),

  viewMode: 'ORBIT', // 'ORBIT' | 'FIRST_PERSON'
  setViewMode: (mode) => set({ viewMode: mode }),

  // Project Metadata
  projectMeta: {
    title: 'Untitled Project',
    description: '',
    author: 'Anonymous',
    created: Date.now(),
    modified: Date.now()
  },
  setProjectMeta: (updates) => set((state) => ({ projectMeta: { ...state.projectMeta, ...updates, modified: Date.now() } })),

  // Version History
  history: [],
  createSnapshot: (label) => set((state) => {
    const snapshot = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      label: label || `Version ${state.history.length + 1}`,
      data: {
        layers: state.layers,
        activeLayerId: state.activeLayerId,
        projectMeta: state.projectMeta
      }
    };
    return { history: [snapshot, ...state.history] };
  }),
  restoreSnapshot: (id) => set((state) => {
    const snapshot = state.history.find(h => h.id === id);
    if (!snapshot) return state;
    return {
      layers: snapshot.data.layers,
      activeLayerId: snapshot.data.activeLayerId,
      projectMeta: snapshot.data.projectMeta,
      selectedNodeIds: [],
      selectedWallIds: []
    };
  }),
  deleteSnapshot: (id) => set((state) => ({
    history: state.history.filter(h => h.id !== id)
  })),

  // Layers System
  activeLayerId: DEFAULT_LAYER_ID,
  layers: [
    {
      id: DEFAULT_LAYER_ID,
      name: 'Ground Floor',
      type: 'wall', // 'wall' | 'floor'
      visible: true,
      height: 2.5, // Height of walls or thickness of floor
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
      openings: []
    }
  ],

  // --- Layer Actions ---
  
  setActiveLayer: (id) => set({ activeLayerId: id, selectedNodeIds: [], selectedWallIds: [] }),
  
  addLayer: (type = 'wall') => set((state) => {
    const id = crypto.randomUUID();
    const newLayer = {
      id,
      name: type === 'wall' ? 'New Level' : 'New Floor',
      type,
      visible: true,
      height: type === 'wall' ? 2.5 : 0.2,
      nodes: [],
      walls: [],
      openings: []
    };
    return { 
      layers: [...state.layers, newLayer],
      activeLayerId: id,
      selectedNodeIds: [],
      selectedWallIds: []
    };
  }),

  removeLayer: (id) => set((state) => {
    if (state.layers.length <= 1) return state; // Don't delete last layer
    const newLayers = state.layers.filter(l => l.id !== id);
    const newActiveId = state.activeLayerId === id ? newLayers[newLayers.length - 1].id : state.activeLayerId;
    return { layers: newLayers, activeLayerId: newActiveId };
  }),

  toggleLayerVisibility: (id) => set((state) => ({
    layers: state.layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l)
  })),

  reorderLayers: (fromIndex, toIndex) => set((state) => {
    const newLayers = [...state.layers];
    const [moved] = newLayers.splice(fromIndex, 1);
    newLayers.splice(toIndex, 0, moved);
    return { layers: newLayers };
  }),
  
  updateLayer: (id, updates) => set((state) => ({
    layers: state.layers.map(l => l.id === id ? { ...l, ...updates } : l)
  })),

  duplicateLayer: (id) => set((state) => {
    const source = state.layers.find(l => l.id === id);
    if (!source) return state;
    
    // Deep clone nodes/walls/openings with new IDs
    const idMap = new Map();
    const newNodes = source.nodes.map(n => {
      const nid = crypto.randomUUID();
      idMap.set(n.id, nid);
      return { ...n, id: nid };
    });
    
    const newWalls = source.walls.map(w => {
      const wid = crypto.randomUUID();
      idMap.set(w.id, wid);
      return { 
        ...w, 
        id: wid,
        startNodeId: idMap.get(w.startNodeId),
        endNodeId: idMap.get(w.endNodeId)
      };
    });
    
    const newOpenings = source.openings.map(o => ({
       ...o,
       id: crypto.randomUUID(),
       wallId: idMap.get(o.wallId)
    }));

    const newLayer = {
      ...source,
      id: crypto.randomUUID(),
      name: source.name + ' (Copy)',
      nodes: newNodes,
      walls: newWalls,
      openings: newOpenings
    };

    return { 
      layers: [...state.layers, newLayer],
      activeLayerId: newLayer.id 
    };
  }),

  // --- Editor Actions (Operating on Active Layer) ---

  setMode: (mode) => set((state) => ({ 
    mode,
    drawingStartNode: mode === 'DRAWING' ? null : state.drawingStartNode 
  })),
  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),
  setHoveredWallId: (id) => set({ hoveredWallId: id }),
  setSelection: ({ nodes, walls }) => set({ selectedNodeIds: nodes, selectedWallIds: walls }),
  setContextMenuData: (data) => set({ contextMenuData: data }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

  deleteSelection: () => set((state) => {
    const nodesToDelete = new Set(state.selectedNodeIds);
    const wallsToDelete = new Set(state.selectedWallIds);
    
    const newLayers = state.layers.map(layer => {
        // Find implicit wall deletions for this layer
        const layerWallsToDelete = new Set();
        // Add globally selected walls that are in this layer
        layer.walls.forEach(w => {
            if (wallsToDelete.has(w.id)) layerWallsToDelete.add(w.id);
        });
        
        // Add walls connected to deleted nodes
        layer.walls.forEach(w => {
            if (nodesToDelete.has(w.startNodeId) || nodesToDelete.has(w.endNodeId)) {
                layerWallsToDelete.add(w.id);
            }
        });

        // Filter
        const newNodes = layer.nodes.filter(n => !nodesToDelete.has(n.id));
        const newWalls = layer.walls.filter(w => !layerWallsToDelete.has(w.id));
        const newOpenings = layer.openings.filter(o => !layerWallsToDelete.has(o.wallId));
        
        return { ...layer, nodes: newNodes, walls: newWalls, openings: newOpenings };
    });

    return {
      layers: newLayers,
      selectedNodeIds: [],
      selectedWallIds: [],
      hoveredNodeId: null,
      hoveredWallId: null,
      contextMenuData: null
    };
  }),

  addNode: (x, y) => {
    const id = crypto.randomUUID();
    set((state) => {
      let targetId = state.activeLayerId;
      let activeLayer = state.layers.find(l => l.id === targetId);
      
      if (!activeLayer) {
         if (state.layers.length > 0) {
            activeLayer = state.layers[0];
            targetId = activeLayer.id;
         } else {
            return state; 
         }
      }

      return {
        activeLayerId: targetId,
        layers: state.layers.map(l => l.id === targetId ? { ...l, nodes: [...l.nodes, { id, x, y }] } : l)
      };
    });
    return id;
  },

  addWall: (startNodeId, endNodeId) => {
    const id = crypto.randomUUID();
    set((state) => {
      let targetId = state.activeLayerId;
      let activeLayer = state.layers.find(l => l.id === targetId);
      
      if (!activeLayer) {
         if (state.layers.length > 0) {
            activeLayer = state.layers[0];
            targetId = activeLayer.id;
         } else {
            return state; 
         }
      }

      return {
        activeLayerId: targetId,
        layers: state.layers.map(l => l.id === targetId ? { ...l, walls: [...l.walls, { id, startNodeId, endNodeId, thickness: 0.2 }] } : l)
      };
    });
    return id;
  },
  
  addOpening: (wallId, type) => {
    const id = crypto.randomUUID();
    set((state) => {
      let targetId = state.activeLayerId;
      let activeLayer = state.layers.find(l => l.id === targetId);
      
      if (!activeLayer) {
         if (state.layers.length > 0) {
            activeLayer = state.layers[0];
            targetId = activeLayer.id;
         } else {
            return state; 
         }
      }

      return {
        activeLayerId: targetId,
        layers: state.layers.map(l => l.id === targetId ? { 
          ...l, 
          openings: [...l.openings, { 
            id, 
            wallId, 
            type, 
            dist: 0.5, 
            width: type === 'door' ? 1.0 : 1.5,
            height: type === 'door' ? 2.2 : 1.2,
            y: type === 'door' ? 0 : 0.9,
            isOpen: false,
            isFlipped: false,
            assetId: 'standard'
          }] 
        } : l)
      };
    });
    return id;
  },

  setWallOpening: (wallId, type) => {
    set((state) => {
      const targetLayer = state.layers.find(l => l.walls.some(w => w.id === wallId));
      if (!targetLayer) return state;

      const cleanOpenings = targetLayer.openings.filter(o => o.wallId !== wallId);
      
      let newOpenings = cleanOpenings;
      if (type) {
        const id = crypto.randomUUID();
        const newOpening = {
          id,
          wallId,
          type,
          dist: 0.5,
          width: type === 'door' ? 1.0 : 1.5,
          height: type === 'door' ? 2.2 : 1.2,
          y: type === 'door' ? 0 : 0.9,
          isOpen: false,
          isFlipped: false,
          assetId: 'standard'
        };
        newOpenings = [...cleanOpenings, newOpening];
      }
      
      return { 
         layers: state.layers.map(l => l.id === targetLayer.id ? { ...l, openings: newOpenings } : l) 
      };
    });
  },

  toggleOpeningStatus: (wallId) => set((state) => {
    const targetLayer = state.layers.find(l => l.walls.some(w => w.id === wallId));
    if (!targetLayer) return state;
    return {
      layers: state.layers.map(l => l.id === targetLayer.id ? {
        ...l,
        openings: l.openings.map(o => o.wallId === wallId ? { ...o, isOpen: !o.isOpen } : o)
      } : l)
    };
  }),

  flipOpening: (wallId) => set((state) => {
    const targetLayer = state.layers.find(l => l.walls.some(w => w.id === wallId));
    if (!targetLayer) return state;
    return {
      layers: state.layers.map(l => l.id === targetLayer.id ? {
        ...l,
        openings: l.openings.map(o => o.wallId === wallId ? { ...o, isFlipped: !o.isFlipped } : o)
      } : l)
    };
  }),

  // --- Railing Actions (For Floor Edges) ---

  setWallRailing: (wallId, hasRailing) => set((state) => {
    const targetLayer = state.layers.find(l => l.walls.some(w => w.id === wallId));
    if (!targetLayer || targetLayer.type !== 'floor') return state;
    
    return {
      layers: state.layers.map(l => l.id === targetLayer.id ? {
        ...l,
        walls: l.walls.map(w => w.id === wallId ? { 
            ...w, 
            hasRailing, 
            hasGate: hasRailing ? w.hasGate : false, // Reset gate if railing removed
            gateOpen: false 
        } : w)
      } : l)
    };
  }),

  setRailingGate: (wallId, hasGate) => set((state) => {
    const targetLayer = state.layers.find(l => l.walls.some(w => w.id === wallId));
    if (!targetLayer || targetLayer.type !== 'floor') return state;
    
    return {
      layers: state.layers.map(l => l.id === targetLayer.id ? {
        ...l,
        walls: l.walls.map(w => w.id === wallId ? { ...w, hasGate, gateOpen: false } : w)
      } : l)
    };
  }),

  toggleRailingGate: (wallId) => set((state) => {
    const targetLayer = state.layers.find(l => l.walls.some(w => w.id === wallId));
    if (!targetLayer || targetLayer.type !== 'floor') return state;

    return {
      layers: state.layers.map(l => l.id === targetLayer.id ? {
        ...l,
        walls: l.walls.map(w => w.id === wallId ? { ...w, gateOpen: !w.gateOpen } : w)
      } : l)
    };
  }),

  updateNode: (id, x, y) => set((state) => {
    const targetLayer = state.layers.find(l => l.nodes.some(n => n.id === id));
    if (!targetLayer) return state;
    return {
      layers: state.layers.map(l => l.id === targetLayer.id ? {
        ...l,
        nodes: l.nodes.map(n => n.id === id ? { ...n, x, y } : n)
      } : l)
    };
  }),

  setDrawingStartNode: (nodeId) => set({ drawingStartNode: nodeId }),

  setAll: (data) => set({
    layers: data.layers || [{ 
      id: DEFAULT_LAYER_ID, 
      name: 'Ground Floor', 
      type: 'wall', 
      visible: true, 
      height: 2.5, 
      nodes: data.nodes || [], 
      walls: data.walls || [], 
      openings: data.openings || [] 
    }],
    activeLayerId: data.activeLayerId || DEFAULT_LAYER_ID,
    viewState: data.viewState || { x: 0, y: 0, zoom: 1 },
    projectMeta: data.projectMeta || {
      title: 'Untitled Project',
      description: '',
      author: 'Anonymous',
      created: Date.now(),
      modified: Date.now()
    },
    history: data.history || [],
    mode: 'IDLE',
    selectedNodeIds: [],
    selectedWallIds: [],
    hoveredNodeId: null,
    hoveredWallId: null,
    drawingStartNode: null,
    contextMenuData: null
  }),

  reset: () => set({
    layers: [{
      id: DEFAULT_LAYER_ID,
      name: 'Ground Floor',
      type: 'wall',
      visible: true,
      height: 2.5,
      nodes: [],
      walls: [],
      openings: []
    }],
    activeLayerId: DEFAULT_LAYER_ID,
    viewState: { x: 0, y: 0, zoom: 1 },
    projectMeta: {
      title: 'Untitled Project',
      description: '',
      author: 'Anonymous',
      created: Date.now(),
      modified: Date.now()
    },
    history: [],
    mode: 'IDLE',
    drawingStartNode: null,
    hoveredNodeId: null,
    hoveredWallId: null,
    selectedNodeIds: [],
    selectedWallIds: [],
    contextMenuData: null
  }),
}))
