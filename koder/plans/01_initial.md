Here is a comprehensive, strictly formatted prompt designed to be pasted directly into an LLM coding agent (like Cursor, GPT-4, or Claude 3.5 Sonnet).

It is formatted to ~80 characters width for readability and creates a unified architecture plan.

***

# SYSTEM DIRECTIVE: ARCHITECTURAL EDITOR (REACT + R3F)

**ROLE**: Senior Creative Technologist / Graphics Engineer
**STACK**: React, Zustand, React Three Fiber (R3F), Drei, Tailwind CSS
**GOAL**: Build a wall-drawing editor (2D SVG + 3D View) in a single pass.

## 1. CORE ARCHITECTURE & STATE (Zustand)

Create a central store (`useStore`) to hold the "Source of Truth."
Do not rely on the DOM for state.

### Data Structure
- **Nodes**: Points in space.
  `{ id: string, x: number, y: number }`
- **Walls**: Connections between nodes.
  `{ id: string, startNodeId: string, endNodeId: string, thickness: 0.2 }`
- **Openings** (Future-proof):
  `{ id: string, wallId: string, type: 'window'|'door', dist: number, w: number }`

### Actions
- `addNode(x, y)`: Returns ID.
- `addWall(startId, endId)`: Creates logical connection.
- `updateNode(id, x, y)`: For dragging.
- `splitWall(wallId, dist)`: For inserting windows (conceptually).

---

## 2. MATH UTILITIES (Geometry Engine)

Create a utility file `geometry.js` to handle the "Miter" logic.
Do not use simple BoxGeometry. We need `BufferGeometry` for clean corners.

**The Miter Algorithm:**
1. For a Node connected to multiple Walls:
2. Sort connections by angle.
3. Find the angle bisector between adjacent walls.
4. Calculate the intersection point of the *thick* wall edges.
   `Point = Node + (BisectorVector * (Thickness / sin(Angle/2)))`
5. Return the 4 vertices for every wall segment (InnerStart, OuterStart, etc).

---

## 3. COMPONENT: 2D EDITOR (SVG Layer)

**File**: `Editor2D.jsx`
- Use an SVG canvas overlaying the screen (z-index: 10).
- **Grid**: Render a light background pattern.
- **Rendering**:
  - Map `state.walls` -> `<path>` elements (visualize thickness).
  - Map `state.nodes` -> `<circle>` elements (handles).
- **Interaction**:
  - **Snap System**: If mouse is within 20px of a node, snap coordinate.
  - **Draw Mode**: Click to place Start Node, move to preview, Click to End.
  - **Drag Mode**: Click & Drag existing nodes to reshape room.

---

## 4. COMPONENT: 3D VIEWPORT (R3F Layer)

**File**: `Viewport3D.jsx`
- **Scene**: `Canvas` with `shadows`, `dpr={[1, 2]}`.
- **Camera**: `OrbitControls` with `makeDefault`.
- **Environment**:
  - `Environment` (preset="city" or "apartment").
  - `DirectionalLight` (Sun) with castShadow.
  - `AmbientLight` (intensity 0.5).

**Procedural Wall Generation**:
- Create a component `<ProceduralWall wall={wallData} />`.
- **Mesh Logic**:
  - Do NOT use CSG (Boolean operations).
  - Instead, generate the mesh dynamically based on vertices from `geometry.js`.
  - Extrude shape upwards (Height: 2.5m).
- **Material**: `MeshStandardMaterial` (White Plaster, Roughness 0.8).
- **Floor**: Use `Earcut` to triangulate the floor polygon created by walls.

---

## 5. UI & LAYOUT (Overlay)

**File**: `UI.jsx`
- Floating Toolbar (Tailwind: `absolute top-4 left-4`).
- **Buttons**:
  - "Draw Wall" (Toggle Mode).
  - "Add Window" (Drag to wall).
  - "Reset".
- **Styling**: Minimalist, monochromatic, architectural font.

---

## 6. IMPLEMENTATION STEPS (Execute in Order)

1. **Scaffold**: Setup Vite + React + R3F + Zustand + Tailwind.
2. **State**: Implement `useStore` with dummy data (1 square room).
3. **Math**: Implement the 2D offset/miter math function.
4. **3D**: Build the `<ProceduralWall>` component using custom geometry.
   *Ensure walls connect seamlessly at corners.*
5. **2D**: Build the SVG editor with mouse event handlers.
   *Ensure 2D updates sync instantly to 3D.*
6. **Openings**: (If time permits) Split wall mesh into 3 parts (Left, Right,
   Header) and 1 part (Sill) to create the window "hole".
7. **Polish**: Add Shadows, Soft Lighting, and Floor triangulation.

---

## CONSTRAINT CHECKLIST
- [ ] No `useEffect` loops for animation (use `useFrame`).
- [ ] No heavy CSG libraries (use vertex manipulation).
- [ ] Clean variable naming (`startNode`, `endNode`).
- [ ] Code formatted for standard ES6+ modules.
- [ ] Aesthetic: "Apple" clean white UI.

**Action**: Generate the complete project code structure.