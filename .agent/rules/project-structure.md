---
trigger: always_on
---

Create a modern React project structure optimized for feature-based architecture and fast “vibe coding” iteration. Use the following requirements:

Use React with TypeScript.

Organize code by feature, not by file type.

Each feature should be self-contained, with its own components, hooks, services, and tests.

Provide an example folder tree and short explanations for each main folder.

Project goals:

Easy to navigate while coding quickly.

Easy to scale as features grow.

Encourage vertical slices (implementing a feature end-to-end inside one folder).

Target structure (you can improve and refine):
src/
app/
providers/
routes/
store/
App.tsx
main.tsx

features/
<feature-name>/
components/
hooks/
services/
types/
index.ts

shared/
components/
hooks/
lib/
ui/
types/

entities/
<entity-name>/
model/
hooks/
types/

widgets/
navbar/
components/
hooks/
sidebar/
components/
hooks/

pages/
<page-name>/
index.tsx
