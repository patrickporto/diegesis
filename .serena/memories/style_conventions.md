# Style and Conventions

## General Guidelines
- **TypeScript:** Use TypeScript for all code. Prefer interfaces over types. Avoid enums; use maps or literal types instead.
- **Functional Programming:** Use functional and declarative patterns; avoid classes.
- **Early Returns:** Use early returns to improve readability.
- **Components:** Use functional components. Define them as `function ComponentName() { ... }` rather than `const ComponentName = () => { ... }` (as per user instructions).
- **Hooks:** Use custom hooks to encapsulate complex logic (e.g., `useBattlemapInteractions`).

## Naming Conventions
- **Variables/Functions:** Use descriptive names.
- **Event Handlers:** Prefix with `handle` (e.g., `handleClick`, `handleKeyDown`).
- **Hooks:** Prefix with `use`.

## Styling
- **Tailwind CSS:** Use Tailwind utility classes for styling. Avoid raw CSS or inline styles unless absolutely necessary for dynamic values (e.g., PixiJS positioning).
- **Aesthetics:** Prioritize high-quality, modern aesthetics (glassmorphism, vibrant colors, dark mode).

## React Specifics
- **React Compiler:** The project uses the React Compiler (`react-compiler/react-compiler`: `error`). Avoid direct mutations of variables that the compiler might track as immutable. Use refs for objects like PixiJS instances that need to be mutated outside the React state lifecycle.
- **Accessibility:** Ensure all interactive elements have proper ARIA labels, tab index, and keyboard support.
