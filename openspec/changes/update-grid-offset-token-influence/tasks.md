## 1. Preparation

- [x] 1.1 Read and confirm current offset handling in key files (e.g., useTokenInteractions.ts:lines handling snapToGrid).
- [x] 1.2 Review GridRenderer.ts to understand how grid offsets are used for rendering.

## 2. Implementation

- [x] 2.1 Update GridRenderer.ts to incorporate offsets in grid calculations.
- [x] 2.2 Modify useTokenInteractions.ts to apply offsets during placement and drag events.
- [x] 2.3 Adjust snapping logic in utils.ts and related hooks to use offset-adjusted positions.

## 3. Validation

- [ ] 3.1 Add unit tests for offset-influenced placement/movement.
- [ ] 3.2 Manually test snapping with various offset values.
- [x] 3.3 Run full lint/typecheck/test suite.
