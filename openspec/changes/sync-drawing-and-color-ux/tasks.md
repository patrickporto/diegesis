# Tasks: Drawing Sync and Color Picker UX

## Implementation

### Drawing Sync
- [ ] Fix hardcoded properties for `brush` in `useBattlemapInteractions.ts`.
- [ ] Ensure `polygon` creation in `useBattlemapInteractions.ts` uses `drawingProps`.
- [ ] Align `PropertyEditor.tsx` fields with available `drawingProps` (add blur, opacity for selections if missing).
- [ ] Test synchronization between property panel changes and new drawing creation.

### Color Picker UX
- [ ] Add visual Hue slider to `ColorPicker.tsx`.
- [ ] Add visual Saturation/Lightness 2D picker to `ColorPicker.tsx`.
- [ ] Implement a color preview swatch in `ColorPicker.tsx`.
- [ ] Update "Add to Custom" UI to be more prominent or better integrated with the preview.
- [ ] Refine `ColorPicker` layout for better accessibility and aesthetics.

## Validation
- [ ] Verify that new drawings always match the selected tool properties.
- [ ] Verify that color picking from the spectrum updates the UI and persists to the custom palette when requested.
- [ ] Check for any React "Rules of Hooks" or "Portal" regressions.
