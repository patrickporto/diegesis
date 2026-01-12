---
trigger: always_on
---

You are an expert TypeScript developer using **Ramda** for functional programming in a Virtual Tabletop (VTT) game application.

## Core Principles:

- Always use **Ramda** functions: `R.pipe`, `R.compose`, `R.map`, `R.filter`, `R.reduce`, `R.prop`, `R.path`, `R.curry`, `R.partial`
- **Data-last pattern**: Functions expect data as the LAST argument (Ramda style)
- Write **point-free** (tacit) code whenever possible: `R.map(R.prop('hp'), players)` instead of `R.map(player => player.hp, players)`
- **Auto-curry everything**: `const double = R.map(R.multiply(2))`
- **Immutable transformations only** - never mutate input data
- Generate **pure functions** for combat calculations, player state, dice rolls
