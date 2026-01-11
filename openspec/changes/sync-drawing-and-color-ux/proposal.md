# Proposal: Sync Drawing Properties and Enhance Color Picker UX

Ensure that all drawing tools (including Brush and Polygon) correctly apply the active tool properties during creation, and improve the Color Picker with a visual custom color selector and better palette management.

## Problem Statement

1.  **Hardcoded Brush Properties**: The `brush` tool currently hardcodes red stroke and width 2 during creation, ignoring the user's selected defaults.
2.  **Inconsistent Editor**: Properties used during creation (defaults) and editing (selection) are not perfectly aligned in terms of UI exposure.
3.  **Basic Color Picker**: The current `ColorPicker` is limited to hex input and presets. It lacks a visual spectrum/gradient picker and has a clunky "Add to Custom" workflow.
4.  **Preview-only sync**: Changing properties while a tool is active only updates the transient preview, but sometimes fails to persist to the final object or doesn't feel integrated.

## Proposed Changes

### Drawing Interaction

- Modify `useBattlemapInteractions.ts` to use `drawingProps` from the store when finalizing `brush` and `polygon` drawings.
- Ensure `PropertyEditor.tsx` and `DrawingPropertiesPanel.tsx` share the same logic or components for property manipulation.

### Color Picker

- **Visual Picker**: Implement a Saturation/Hue/Lightness visual selector (or a similar visual spectrum) for custom colors.
- **Live Preview**: Add a large preview swatch for the currently "in-flight" custom color.
- **Improved Palette**: Make adding to the custom palette more intuitive (e.g., clicking the preview or a dedicated '+' button near the palette).

## User Review Required

> [!IMPORTANT]
> The visual Color Picker will require a slider for Hue and a 2D area for Saturation/Lightness. This may increase the popup size of the `ColorPicker`.

> [!NOTE]
> We will ensure that "Brush" also respects "Opacity" and "Blur" settings from the `drawingProps` when being created.

## Verification Plan

### Manual Verification
1. Select 'Brush' tool.
2. Change color to Blue and Width to 10 in the properties panel.
3. Draw on map.
4. **THEN** verify the created object is Blue with width 10.
5. Open `ColorPicker`.
6. Use the new visual spectrum to pick a color.
7. Click the '+' button to save it to the custom palette.
8. Verify it appears and can be re-selected.
