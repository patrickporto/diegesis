# Tasks: Enhance Battlemap UX

## 1. Setup & Dependencies
- [ ] 1.1 Install `react-resizable-panels` via `bun add react-resizable-panels`
- [ ] 1.2 Create base panel layout components

## 2. Color Picker Component
- [ ] 2.1 Create `ColorPicker.tsx` with preset palette
- [ ] 2.2 Add custom color addition via HEX input
- [ ] 2.3 Implement recent colors tracking
- [ ] 2.4 Add portal-based popup with click-outside close
- [ ] 2.5 Integrate ColorPicker in PropertyEditor

## 3. Drawing Tools Enhancements
- [ ] 3.1 Add `fillColor` and `strokeColor` controls to DrawingPropertiesPanel
- [ ] 3.2 Add brush properties: thickness, blur, opacity to DrawingBrush type
- [ ] 3.3 Create pre-draw properties panel (shows before first stroke)
- [ ] 3.4 Update `useDrawingRenderer` to handle blur/opacity
- [ ] 3.5 Convert TextInputOverlay to inline WYSIWYG (contentEditable)

## 4. Panel System Implementation
- [ ] 4.1 Create `PanelLayout.tsx` wrapper with react-resizable-panels
- [ ] 4.2 Migrate `TokenManagerSidebar` to resizable panel
- [ ] 4.3 Migrate `BattlemapSettingsPanel` to resizable panel
- [ ] 4.4 Migrate `PropertyEditor` to resizable panel
- [ ] 4.5 Implement panel corner positioning (drag to corners)
- [ ] 4.6 Implement panel grouping (tab system)
- [ ] 4.7 Add mobile-responsive panel behavior (collapsed by default)

## 5. Map Settings Improvements
- [ ] 5.1 Add `gridOffsetX` and `gridOffsetY` to BattlemapSettings type
- [ ] 5.2 Update GridRenderer to apply offset
- [ ] 5.3 Create collapsible settings sections UI
- [ ] 5.4 Reorganize settings into logical groups

## 6. Fog of War Rooms
- [ ] 6.1 Create `FogPropertiesPanel.tsx` with hide/reveal/brush controls
- [ ] 6.2 Move fog toolbar controls to FogPropertiesPanel
- [ ] 6.3 Implement wall-bounded fill algorithm
- [ ] 6.4 Add hotkey (Alt) for unbounded fill
- [ ] 6.5 Create FogRoom type in types.ts
- [ ] 6.6 Add room detection on fill operation
- [ ] 6.7 Prompt for room name after detection
- [ ] 6.8 Create `RoomListPanel.tsx` with room management
- [ ] 6.9 Add room hide/reveal controls in list
- [ ] 6.10 Add room hide/reveal via context menu on map

## 7. Context Menu Rewrite
- [ ] 7.1 Create reusable `ContextMenuPortal.tsx`
- [ ] 7.2 Add touch detection (long-press) for mobile
- [ ] 7.3 Create bottom drawer variant for small screens
- [ ] 7.4 Implement action sheet style for tablets/TVs
- [ ] 7.5 Create `Placeable` abstraction interface
- [ ] 7.6 Apply new context menu to tokens
- [ ] 7.7 Apply new context menu to drawings
- [ ] 7.8 Apply new context menu to walls
- [ ] 7.9 Apply new context menu to fog rooms

## 8. Testing & Verification
- [ ] 8.1 Manual test: Panel resizing on desktop
- [ ] 8.2 Manual test: Panel behavior on mobile viewport
- [ ] 8.3 Manual test: Color picker UX
- [ ] 8.4 Manual test: Drawing with fill color
- [ ] 8.5 Manual test: WYSIWYG text editing
- [ ] 8.6 Manual test: Fog room creation and management
- [ ] 8.7 Manual test: Context menu on touch devices
