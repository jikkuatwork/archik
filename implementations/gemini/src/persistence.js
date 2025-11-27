import LZString from 'lz-string';

// Helper to minify IDs for URL sharing
// Maps UUIDs to n1, n2, w1, w2...
function minifyState(state) {
  const nodeMap = new Map();
  const wallMap = new Map();
  
  const minNodes = state.nodes.map((n, i) => {
    const id = `n${i}`;
    nodeMap.set(n.id, id);
    return { ...n, id };
  });

  const minWalls = state.walls.map((w, i) => {
    const id = `w${i}`;
    wallMap.set(w.id, id);
    return {
      ...w,
      id,
      startNodeId: nodeMap.get(w.startNodeId),
      endNodeId: nodeMap.get(w.endNodeId)
    };
  });

  const minOpenings = state.openings.map((o, i) => ({
    ...o,
    id: `o${i}`,
    wallId: wallMap.get(o.wallId)
  }));

  return { nodes: minNodes, walls: minWalls, openings: minOpenings };
}

// Helper to restore IDs (new UUIDs) on import
function restoreState(minState) {
  const nodeMap = new Map();
  const wallMap = new Map();

  const nodes = minState.nodes.map(n => {
    const id = crypto.randomUUID();
    nodeMap.set(n.id, id);
    return { ...n, id };
  });

  const walls = minState.walls.map(w => {
    const id = crypto.randomUUID();
    wallMap.set(w.id, id);
    return {
      ...w,
      id,
      startNodeId: nodeMap.get(w.startNodeId),
      endNodeId: nodeMap.get(w.endNodeId)
    };
  });

  const openings = minState.openings.map(o => ({
    ...o,
    id: crypto.randomUUID(),
    wallId: wallMap.get(o.wallId)
  }));

  return { nodes, walls, openings };
}

export function generateShareURL(state) {
  const minified = minifyState(state);
  const json = JSON.stringify(minified);
  const compressed = LZString.compressToEncodedURIComponent(json);
  
  const url = new URL(window.location.href);
  url.hash = compressed;
  
  const fullUrl = url.toString();
  // Check limit (conservative 2000 chars)
  if (fullUrl.length > 2000) return null;
  
  return fullUrl;
}

export function loadFromURL() {
  try {
    const hash = window.location.hash.slice(1); // remove #
    if (!hash) return null;

    const json = LZString.decompressFromEncodedURIComponent(hash);
    if (!json) return null;

    const minified = JSON.parse(json);
    return restoreState(minified);
  } catch (e) {
    console.error("Failed to load from URL", e);
    return null;
  }
}

export function exportToJSON(state) {
  const data = JSON.stringify({
    nodes: state.nodes,
    walls: state.walls,
    openings: state.openings,
    version: 1
  }, null, 2);
  
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'archik-plan.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        // Basic validation
        if (!Array.isArray(json.nodes) || !Array.isArray(json.walls)) {
          reject(new Error("Invalid file format"));
          return;
        }
        // Use restoreState logic if we want to regenerate IDs, 
        // OR just keep them if they are valid UUIDs.
        // Let's keep them as is for File Import (assuming they are valid).
        // But we should regenerate IDs to avoid collisions if merging (though here we replace).
        // Let's just return raw json.
        resolve({ 
           nodes: json.nodes || [], 
           walls: json.walls || [], 
           openings: json.openings || [] 
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}
