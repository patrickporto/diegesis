# Project Overview: Diegesis

Diegesis is a web application featuring a Battlemap Editor, likely for tabletop role-playing games (TTRPGs). It is built as a highly interactive React application with collaborative features.

## Tech Stack
- **Framework:** React 19
- **Language:** TypeScript
- **Bundler:** Vite
- **Rendering Engine:** PixiJS 8 (used for the Battlemap Editor)
- **State Management:** Zustand
- **Collaboration:** Yjs
- **Styling:** Tailwind CSS 4, Mantine UI
- **Testing:** Vitest, React Testing Library
- **Linting/Formatting:** ESLint, Prettier

## Core Features
- **Battlemap Editor:** Panning, zooming, grid rendering, drawing tools, fog of war, token management.
- **Collaborative Editing:** Real-time synchronization using Yjs.
- **Responsive UI:** Mobile-first approach with drawer-style menus on smaller screens.

## Directory Structure
- `src/components/BattlemapEditor`: Main components for the battlemap editor.
- `src/components/BattlemapEditor/hooks`: Custom hooks for interactions, rendering, and data management.
- `src/stores`: Global state management using Zustand.
- `src/utils`: General utility functions (e.g., flood fill algorithm).
- `src/types`: Shared TypeScript interfaces and types.
