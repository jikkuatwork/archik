import LZString from 'lz-string';

const DEFAULT_LAYER_ID = 'layer-1';

// Helper to minify IDs within a layer
function minifyLayer(layer) {
  const nodeMap = new Map();
  const wallMap = new Map();
  
  const minNodes = layer.nodes.map((n, i) => {
    const id = `n${i}`;
    nodeMap.set(n.id, id);
    return { ...n, id };
  });

  const minWalls = layer.walls.map((w, i) => {
    const id = `w${i}`;
    wallMap.set(w.id, id);
    return {
      ...w,
      id,
      startNodeId: nodeMap.get(w.startNodeId),
      endNodeId: nodeMap.get(w.endNodeId)
    };
  });

  const minOpenings = layer.openings.map((o, i) => ({
    ...o,
    id: `o${i}`,
    wallId: wallMap.get(o.wallId)
  }));

  return { 
    ...layer,
    nodes: minNodes, 
    walls: minWalls, 
    openings: minOpenings 
  };
}

function restoreLayer(minLayer) {
  const nodeMap = new Map();
  const wallMap = new Map();

  const nodes = minLayer.nodes.map(n => {
    const id = crypto.randomUUID();
    nodeMap.set(n.id, id);
    return { ...n, id };
  });

  const walls = minLayer.walls.map(w => {
    const id = crypto.randomUUID();
    wallMap.set(w.id, id);
    return {
      ...w,
      id,
      startNodeId: nodeMap.get(w.startNodeId),
      endNodeId: nodeMap.get(w.endNodeId)
    };
  });

  const openings = minLayer.openings.map(o => ({
    ...o,
    id: crypto.randomUUID(),
    wallId: wallMap.get(o.wallId)
  }));

  return { 
    ...minLayer,
    // Ensure we have an ID
    id: minLayer.id || crypto.randomUUID(),
    nodes, 
    walls, 
    openings 
  };
}

export function generateShareURL(state) {
  const minifiedLayers = state.layers.map(minifyLayer);
  const minifiedState = {
     layers: minifiedLayers,
     activeLayerId: state.activeLayerId,
     theme: state.theme,
     viewState: state.viewState,
     projectMeta: state.projectMeta
  };
  
  const json = JSON.stringify(minifiedState);
  const compressed = LZString.compressToEncodedURIComponent(json);
  
  const url = new URL(window.location.href);
  url.hash = compressed;
  
  const fullUrl = url.toString();
  if (fullUrl.length > 5000) return null; // Increased limit
  
  return fullUrl;
}

export function loadFromURL() {
  try {
    const hash = window.location.hash.slice(1); 
    if (!hash) return null;

    const json = LZString.decompressFromEncodedURIComponent(hash);
    if (!json) return null;

    const parsed = JSON.parse(json);
    
    // Migration Logic (Legacy v1 URL)
    if (parsed.nodes && parsed.walls) {
       // Old format
       const layer = restoreLayer({
         ...parsed,
         id: DEFAULT_LAYER_ID,
         name: 'Imported',
         type: 'wall',
         visible: true,
         height: 2.5
       });
       return { layers: [layer], activeLayerId: DEFAULT_LAYER_ID };
    }

    // New format
    if (parsed.layers) {
      const restoredLayers = parsed.layers.map(restoreLayer);
      return {
         layers: restoredLayers,
         activeLayerId: parsed.activeLayerId || restoredLayers[0].id,
         theme: parsed.theme,
         viewState: parsed.viewState,
         projectMeta: parsed.projectMeta
      };
    }
    
    return null;
  } catch (e) {
    console.error("Failed to load from URL", e);
    return null;
  }
}

export function exportToJSON(state) {
  const data = JSON.stringify({
    layers: state.layers,
    activeLayerId: state.activeLayerId,
    theme: state.theme,
    viewState: state.viewState,
    projectMeta: state.projectMeta,
    history: state.history,
    version: 3
  }, null, 2);
  
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  
  const title = state.projectMeta?.title || 'archik-plan';
  const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  a.download = `${safeTitle}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        
        // v3/v2
        if (json.layers && Array.isArray(json.layers)) {
           resolve({
              layers: json.layers,
              activeLayerId: json.activeLayerId || json.layers[0]?.id,
              theme: json.theme,
              viewState: json.viewState,
              projectMeta: json.projectMeta,
              history: json.history || []
           });
           return;
        }

        // v1 (Legacy)
        if (Array.isArray(json.nodes) && Array.isArray(json.walls)) {
           const layer = {
             id: DEFAULT_LAYER_ID,
             name: 'Imported Layer',
             type: 'wall',
             visible: true,
             height: 2.5,
             nodes: json.nodes,
             walls: json.walls,
             openings: json.openings || []
           };
           resolve({
             layers: [layer],
             activeLayerId: DEFAULT_LAYER_ID
           });
           return;
        }

        reject(new Error("Invalid file format"));
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}