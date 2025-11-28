# Mixed Bag of Ideas & Roadmap

## 1. 2D Navigation (Zoom & Pan)
- [ ] Implement `viewState` (x, y, zoom) in `Editor2D`.
- [ ] Add interaction handlers (Wheel to zoom, Middle-click/Space+Drag to pan).
- [ ] Update `toWorld` and `toScreen` coordinate transforms to respect zoom/pan.
- [ ] Add UI controls (+/- buttons or "Fit to Screen").

## 2. Full State Persistence
- [ ] Update `exportToJSON` to include:
    - [ ] `theme` (dark/light)
    - [ ] `viewState` (2D zoom/pan)
    - [ ] `camera` (3D camera position/target)
- [ ] Update `importFromJSON` to apply these settings if present.

## 3. Project Metadata
- [ ] Add `projectMeta` slice to store:
    - [ ] `title`
    - [ ] `description`
    - [ ] `author`
    - [ ] `created`, `modified` timestamps
- [ ] Add UI modal/panel to edit metadata.
- [ ] Display Project Title in the header/UI.

## 4. Version History (Snapshots)
- [ ] Add `history` slice to store.
- [ ] Implement `createSnapshot(label)` action.
- [ ] Implement `restoreSnapshot(id)` action.
- [ ] Add UI tab/panel to view and manage versions.

## 5. Asset ID System (Multiple Styles)
- [ ] Update `Opening` data model to include `assetId` (default: 'standard').
- [ ] Create a registry/map of Asset ID -> Component.
- [ ] Refactor `Viewport3D` to render based on `assetId`.
- [ ] (Future) Add UI to select style for selected opening.

## 6. Rails & Gates (Refinement)
- [x] Implement Basic Railings for Floor layers.
- [x] Implement Gates.
- [x] Detail the Gate model (Frame, Bars, Handle).