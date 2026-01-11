# Change: Update Grid Offsets to Influence Token Placement and Movement

## Why

Current implementation likely ignores grid offsets for token positioning, leading to misalignment during placement, movement, and snapping.

## What Changes

- Modify token interactions to factor in offsets for placement/movement/snapping.
- **No breaking changes**; enhances existing behavior.

## Impact

- Affected specs: New battlemap-token-system.
- Affected code: src/components/BattlemapEditor/hooks/useTokenInteractions.ts, TokenRenderer.ts, GridRenderer.ts, and related hooks.
