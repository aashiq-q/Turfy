---
name: Orval Zod barrel collision
description: The current Orval output can generate duplicate names between runtime Zod schemas and generated TypeScript parameter types.
---

When the API contract has path or query parameters, the generated Zod runtime file and generated TypeScript types can export the same parameter name. Keep the public `@workspace/api-zod` barrel focused on generated runtime schemas unless the type exports are explicitly needed.

**Why:** The duplicate wildcard exports fail the workspace typecheck even though Orval itself completes successfully.

**How to apply:** After codegen, inspect `lib/api-zod/src/index.ts`; if it re-adds `./generated/types`, remove that wildcard before typechecking the libs or API server.