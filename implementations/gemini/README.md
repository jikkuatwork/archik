# Gemini Implementation

**Date:** 2025-11-28

## Features

**2D Editor**
SVG-based plan editor.
Walls, Nodes, Openings (Windows, Doors).
Smart Wall Splitting (Click on wall to insert node).

**3D Viewport**
Real-time procedural generation.
**Attachments:** Parametric Stairs (U-Shape with landings and glass railings) and Counters.
**Edge Primitives:** Objects attach to walls and follow their transform.

**Navigation**
*Orbit:* Left-click / 1-finger drag.
*Pan:* Shift + Drag / 3-finger drag.
*First Person:* WASD + Mouse Look.
(Toggle via top-right menu).

**State**
Zustand store.
Undo/Redo (Versions).

**I/O**
JSON Import/Export.
URL Sharing.

**Theme**
Dark/Light mode.

## Tech Stack

React, Vite, Tailwind.
@react-three/fiber.
@react-three/drei.
Zustand, Lucide React.