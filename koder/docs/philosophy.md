# Engineering Philosophy

## 1. The "Single Source of Truth"
The state in `store.js` is the absolute master. 
- The 2D Editor is a **Setter**.
- The 3D Viewport is a **Getter** (Reactive Projection).
- Geometry logic (`geometry.js`) is pure, stateless, and deterministic.

## 2. The "Edge Primitive" Paradigm
We treat walls not just as physical barriers, but as **Coordinate Systems** 
(Hosts) for other architectural elements. 

### Concept
A Wall is a 1D vector space (t: 0->1) existing in 3D space.
- **Position:** Defined by `t` (normalized distance from start node).
- **Orientation:** Defined by `Normal` (Left/Right side).
- **Context:** Defined by the `Layer` (Elevation).

### The "Smart Attachment" Pattern
Instead of placing objects in global XYZ coordinates, we attach them to Walls.
This allows for **Context-Aware Generation**:

1.  **Parametric Anchoring:**
    *   Objects (Stairs, Counters, Windows) are defined relative to the wall.
    *   *Example:* `offset: 0.5` means "Center of Wall", regardless of length.

2.  **Auto-Validation (The "Fit" Check):**
    *   Since the Wall knows its neighbors (via `geometry.js` intersection 
        logic), attachments can self-validate.
    *   *Rule:* "If this Stair intersects a neighbor wall, do not render."
    *   *Rule:* "If Wall Length < Window Width, do not render."

3.  **Inherited Properties:**
    *   A "Bookshelf" attached to a wall automatically inherits the wall's 
        rotation.
    *   If the Wall moves, the Bookshelf moves.
    *   If the Wall rotates, the Bookshelf rotates.

### Extensibility
This creates a powerful modifier system without a physics engine:
- **Linear Modifiers:** Baseboards, LED strips (extrude along `t`).
- **Volume Modifiers:** Balconies, Desks (extrude along `Normal`).
- **Vertical Modifiers:** Stairs (calculate risers based on `Layer.height`).

## 3. Minimalist 2D, Procedural 3D
- **User Input:** Simple lines and nodes (SVG).
- **System Output:** Rich 3D meshes (Three.js).
- We do not ask the user to model 3D. We ask them to define constraints; 
  we generate the model.