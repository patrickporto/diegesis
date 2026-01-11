## 1. Analysis

- [x] 1.1 Review current marquee preview logic in `updatePreview()` function
- [x] 1.2 Identify conditions for when preview shows and clears

## 2. Implementation

- [x] 2.1 Add button-pressed tracking state for select tool marquee
- [x] 2.2 Modify `updatePreview()` to check button is pressed before showing marquee
- [x] 2.3 Modify `updatePreview()` to check no objects are selected before showing marquee

## 3. Validation

- [ ] 3.1 Test that marquee preview appears only when button pressed and no selection
- [ ] 3.2 Test that marquee preview clears immediately on button release
- [ ] 3.3 Test that marquee preview clears when an object is selected
- [x] 3.4 Run full lint/typecheck
