## 1. Analysis

- [x] 1.1 Review current blur implementation in `useDrawingRenderer.ts` (lines 55-63)
- [x] 1.2 Review current selection marker rendering in `useDrawingRenderer.ts` (lines 137-221)
- [x] 1.3 Identify how blur filter is applied to Graphics object
- [x] 1.4 Determine approach for separating content and selection marker rendering

## 2. Implementation

- [x] 2.1 Create separate Graphics object reference map for selection markers
- [x] 2.2 Modify rendering to use two Graphics objects per drawing:
  - Primary Graphics object for drawing content (with blur filter applied)
  - Secondary Graphics object for selection markers (no filters)
- [x] 2.3 Update cleanup logic to handle both Graphics objects per drawing
- [x] 2.4 Ensure both Graphics objects are added to the correct layer container
- [x] 2.5 Update selection marker rendering to use the unfiltered Graphics object
- [x] 2.6 Test that selection markers render at correct z-index (above drawing content)

## 3. Validation

- [x] 3.1 Test that selection markers are sharp when drawing has blur = 10px
- [x] 3.2 Test that selection markers are sharp when drawing has blur = 0px
- [x] 3.3 Test that selection markers remain sharp when blur value is changed dynamically
- [x] 3.4 Test that multiple selected drawings with different blur values all have sharp selection markers
- [x] 3.5 Test selection marker visibility for all drawing types (brush, rect, ellipse, polygon, text)
- [x] 3.6 Verify no performance regression from additional Graphics objects
- [x] 3.7 Run full lint/typecheck
