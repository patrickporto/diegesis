# Tasks

- [x] **Refactor BattlemapEditor State** <!-- id: 0 -->
    -   Update `panelLocations` state type definition to `Record<PanelLocation, string[]>`.
    -   Add `activePanelTabs` state (`Record<PanelLocation, string>`) to track the focused tab in each group.
    -   Update `getSlotContent` to return a list of panel IDs instead of a single one.

- [x] **Implement TabbedPanelHost** <!-- id: 1 -->
    -   Create `components/BattlemapEditor/TabbedPanelHost.tsx`.
    -   It should accept `panelIds: string[]`, `activeId: string`, `onSelect: (id) => void`, and `renderPanel: (id) => ReactNode`.
    -   Render a tab bar (using icons/text) and the active panel's content.
    -   Support dragging individual tabs out (optional/future) or just dragging the whole group header.

- [x] **Update PanelLayout Drop Zones** <!-- id: 2 -->
    -   Modify `PanelLayout.tsx` to render explicit, absolute-positioned drop overlays for `topLeft`, `bottomLeft`, `topRight`, `bottomRight` that sit *above* the layout (z-index) when a drag is active.
    -   These zones must be active even if the underlying `Panel` columns are not rendered (size 0 or null).
    -   Ensure dropping into an empty zone creates a new entry in the `panelLocations` array.

- [x] **Update Drop Handlers** <!-- id: 3 -->
    -   Update `handlePanelDrop` in `BattlemapEditor` to:
        -   Remove panel from old location array.
        -   Push panel to new location array.
        -   Set as active tab in new location.
