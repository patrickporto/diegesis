# Spec: Drawing Sync

## MODIFIED Requirements

- **Requirement: DRAW-PERSIST-STORE-PROPS**
  - **Description**: Drawing tools MUST use the properties from `drawingProps` (stroke, fill, width, alpha, blur, opacity) when finalizing a drawing, instead of hardcoded values.
  - #### Scenario: Finalizing a brush stroke
    - **WHEN** the user completes a brush stroke
    - **THEN** the created `brush` object in the database MUST have the `strokeColor`, `strokeWidth`, `blur`, and `opacity` currently active in the store.

- **Requirement: DRAW-PROP-CONSISTENCY**
  - **Description**: The properties available for editing a selected drawing MUST match the properties available for tool defaults during creation.
  - #### Scenario: Selecting a brush stroke
    - **WHEN** the user selects an existing brush stroke
    - **THEN** the properties panel MUST show controls for `Stroke Color`, `Stroke Width`, `Blur`, and `Opacity`.
