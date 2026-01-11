# Proposal: Responsive Battlemap Panels

## Summary
Enhance the battlemap editor panels for mobile-first responsiveness, improve Token Library UX (unified Add Token/Folder), add drag-and-drop layer reordering, and fix panel duplication issues.

## Motivation
- Token Library uses `prompt()` for folder creation, which is poor mobile UX
- Separate "Add Token" and "Folder" buttons clutter the interface
- Layer Manager uses arrow buttons for reordering instead of intuitive drag-and-drop
- Settings, Tokens, and Layers appear duplicated in both SideDock actions and panel tabs
- Tab and close button UX is cramped on mobile devices

## Scope

### 1. Token Library Improvements
- Unify "Add Token" and "New Folder" into a single action menu (FAB or dropdown)
- Replace `prompt()` with an inline naming input that works on mobile
- Improve folder creation flow with smooth animations
- Add swipe-to-delete and long-press context menu for mobile

### 2. Layer Manager Drag-and-Drop
- Implement drag-and-drop reordering using touch-friendly gestures
- Remove or hide the arrow buttons on larger screens
- Visual feedback during drag operations

### 3. Panel Deduplication
- Remove Settings, Tokens, and Layers from the `panelLocations` panel lists
- Keep them only as SideDock action icons
- Properties panel remains in the tabbed system

### 4. Tab and Close Button UX
- Larger touch targets for mobile (min 44px)
- Swipe-to-close gesture on mobile
- Improved visual hierarchy for active tabs

### 5. Responsive Layout
- Panels adapt to screen size
- Full-width panels on mobile with slide-in animation
- Collapsible sections within panels

## Non-Goals
- Complete redesign of the battlemap canvas
- Token image editing features beyond cropping
- Multi-level folder nesting
- Adding new dependencies (use existing patterns)

## Success Criteria
- All panel interactions work smoothly on mobile (iOS Safari, Android Chrome)
- No duplicate panel entries visible to users
- Folder creation works without browser prompts
- Layer reordering via drag-and-drop is intuitive
- All 4 panels (Tokens, Layers, Settings, Properties) have SideDock icons
