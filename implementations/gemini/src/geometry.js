export const vec2 = (x, y) => ({ x, y });
export const sub = (v1, v2) => ({ x: v1.x - v2.x, y: v1.y - v2.y });
export const add = (v1, v2) => ({ x: v1.x + v2.x, y: v1.y + v2.y });
export const scale = (v, s) => ({ x: v.x * s, y: v.y * s });
export const len = (v) => Math.sqrt(v.x * v.x + v.y * v.y);
export const norm = (v) => { const l = len(v); return l === 0 ? vec2(0,0) : scale(v, 1/l); };
export const rot90 = (v) => ({ x: -v.y, y: v.x }); // Counter-clockwise (Left)
export const cross = (v1, v2) => v1.x * v2.y - v1.y * v2.x;

export function computeWallCorners(wall, nodes, walls) {
  const startNode = nodes.find(n => n.id === wall.startNodeId);
  const endNode = nodes.find(n => n.id === wall.endNodeId);
  
  if (!startNode || !endNode) return [];

  const startOffset = getCornerOffset(startNode, wall, walls, nodes);
  const endOffset = getCornerOffset(endNode, wall, walls, nodes);
  
  // Return polygon vertices in order (StartLeft, EndLeft, EndRight, StartRight) - or similar winding
  // Let's do: StartRight, EndRight, EndLeft, StartLeft (CCW for positive area typically)
  // Actually, let's strictly follow the visual logic:
  // 1. Start Node + Right Offset
  // 2. End Node + Right Offset
  // 3. End Node + Left Offset
  // 4. Start Node + Left Offset
  
  return [
    add(startNode, startOffset.right),
    add(endNode, endOffset.left),
    add(endNode, endOffset.right),
    add(startNode, startOffset.left)
  ];
}

function getCornerOffset(node, currentWall, allWalls, allNodes) {
  const connectedWalls = allWalls.filter(w => w.startNodeId === node.id || w.endNodeId === node.id);
  
  if (connectedWalls.length === 1) {
    // Dead end
    const isStart = currentWall.startNodeId === node.id;
    const otherNodeId = isStart ? currentWall.endNodeId : currentWall.startNodeId;
    const otherNode = allNodes.find(n => n.id === otherNodeId);
    const dir = norm(sub(otherNode, node)); // Direction OUT of node
    const perp = rot90(dir);
    const halfThick = currentWall.thickness / 2;
    return {
      left: scale(perp, halfThick),
      right: scale(perp, -halfThick)
    };
  }

  // Sort walls by angle
  const sorted = connectedWalls.map(w => {
    const isStart = w.startNodeId === node.id;
    const otherId = isStart ? w.endNodeId : w.startNodeId;
    const other = allNodes.find(n => n.id === otherId);
    const v = sub(other, node);
    const angle = Math.atan2(v.y, v.x);
    return { w, angle, isStart };
  }).sort((a, b) => a.angle - b.angle);

  const idx = sorted.findIndex(item => item.w.id === currentWall.id);
  
  // Current wall direction out of node
  const v_curr = getDir(sorted[idx], node, allNodes);
  const t_curr = currentWall.thickness;

  // Next wall (CCW neighbor) -> Forms the LEFT corner
  const nextItem = sorted[(idx + 1) % sorted.length];
  const v_next = getDir(nextItem, node, allNodes);
  const t_next = nextItem.w.thickness;

  // Prev wall (CW neighbor) -> Forms the RIGHT corner
  const prevItem = sorted[(idx - 1 + sorted.length) % sorted.length];
  const v_prev = getDir(prevItem, node, allNodes);
  const t_prev = prevItem.w.thickness;

  // Left Intersection: Current Left edge meets Next Right edge
  // (Note: Next wall's "Right" is the side closer to Current wall)
  const leftInt = intersectLines(
    node, v_curr, t_curr / 2,     // Current Left
    node, v_next, -t_next / 2     // Next Right
  );

  // Right Intersection: Current Right edge meets Prev Left edge
  const rightInt = intersectLines(
    node, v_curr, -t_curr / 2,    // Current Right
    node, v_prev, t_prev / 2      // Prev Left
  );
  
  // Fallback for parallel lines (shouldn't happen in valid room geometry unless 180 deg)
  const perp = rot90(v_curr);
  const fallbackLeft = scale(perp, t_curr/2);
  const fallbackRight = scale(perp, -t_curr/2);

  return {
    left: leftInt ? sub(leftInt, node) : fallbackLeft,
    right: rightInt ? sub(rightInt, node) : fallbackRight
  };
}

function getDir(item, node, allNodes) {
  const otherId = item.isStart ? item.w.endNodeId : item.w.startNodeId;
  const other = allNodes.find(n => n.id === otherId);
  return norm(sub(other, node));
}

function intersectLines(p1, dir1, offset1, p2, dir2, offset2) {
  const perp1 = rot90(dir1);
  const perp2 = rot90(dir2);
  
  const start1 = add(p1, scale(perp1, offset1));
  const start2 = add(p2, scale(perp2, offset2));
  
  const b = sub(start2, start1);
  const det = cross(dir1, dir2);
  
  if (Math.abs(det) < 1e-4) return null; // Parallel or nearly parallel
  
  const t = cross(b, dir2) / det;
  return add(start1, scale(dir1, t));
}

export function distToSegmentSquared(p, v, w) {
  const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
  if (l2 === 0) return (p.x - v.x)**2 + (p.y - v.y)**2;
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return (p.x - (v.x + t * (w.x - v.x)))**2 + (p.y - (v.y + t * (w.y - v.y)))**2;
}

export function distToSegment(p, v, w) {
  return Math.sqrt(distToSegmentSquared(p, v, w));
}
