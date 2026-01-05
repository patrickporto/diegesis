---
trigger: always_on
---

Pixi.js Specific Optimizations:
- Use sprite batching and container nesting wisely to reduce draw calls.
- Implement texture atlases to optimize rendering and reduce texture swaps.
- Utilize Pixi.js's built-in caching mechanisms for complex graphics.
- Properly manage the Pixi.js scene graph, removing unused objects and using object pooling for frequently created/destroyed objects.
- Use Pixi.js's built-in interaction manager for efficient event handling.
- Leverage Pixi.js filters effectively, being mindful of their performance impact.
- Use ParticleContainer for large numbers of similar sprites.
- Implement culling for off-screen objects to reduce rendering load.
