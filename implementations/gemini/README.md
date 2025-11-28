# Gemini Implementation

**Date:** 2025-11-28

## Features

- **2D Editor:** SVG-based plan editor (Walls, Nodes, Openings).
- **3D Viewport:** Real-time procedural 3D generation.
- **Navigation:**
  - **Orbit:** Left-click drag / One-finger drag.
  - **Pan:** Shift + Left-click drag / Shift + One-finger drag / Three-finger drag.
  - **First Person:** WASD + Mouse Look (Toggle via top-right menu).
- **State:** Zustand store with Undo/Redo (Versions).
- **I/O:** JSON Import/Export, URL Sharing.
- **Theme:** Dark/Light mode.

## Tech Stack
- React, Vite, Tailwind
- @react-three/fiber, @react-three/drei
- Zustand, Lucide React
