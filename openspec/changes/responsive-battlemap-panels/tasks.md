# Tasks: Responsive Battlemap Panels

## 1. Token Library: Unified Action Menu
- [ ] Create `TokenActionMenu` component with FAB-style dropdown
- [ ] Implement inline folder name input (no `prompt()`)
- [ ] Add smooth animations for folder creation
- [ ] Add long-press context menu for tokens (mobile)
- [ ] Test folder creation on iOS/Android

## 2. Layer Manager: Drag-and-Drop Reordering
- [ ] Use native HTML5 drag-and-drop (existing `DraggablePanel.tsx` pattern)
- [ ] Update `LayerManagerPanel` to support drag reordering
- [ ] Add visual drag handles and drop indicators
- [ ] Preserve layer `sortOrder` after reordering
- [ ] Keep arrow buttons for accessibility

## 3. Panel Deduplication & Icons
- [ ] Remove `"settings"`, `"tokens"`, `"layers"`, `"properties"` from `panelLocations`
- [ ] Add **Properties** icon to SideDock actions (sliders/adjustments icon)
- [ ] All 4 panels use SideDock action icons only
- [ ] Remove vertical panel labels section from SideDock
- [ ] Update initial state in `BattlemapEditor.tsx`

## 4. Tab UX Improvements
- [ ] Increase touch targets to 44px minimum
- [ ] Add swipe-to-close gesture for tabs on mobile
- [ ] Improve close button visibility and contrast
- [ ] Add active tab indicator animation

## 5. Responsive Panel Layout
- [ ] Make panels full-width on screens < 768px
- [ ] Add slide-in/out animation for mobile panels
- [ ] Ensure panels don't overlap toolbar on mobile
- [ ] Test on various viewport sizes

## 6. Verification
- [ ] Manual testing on iOS Safari
- [ ] Manual testing on Android Chrome
- [ ] Verify no duplicate panel entries
- [ ] Verify drag-drop layer reorder persists correctly
