---
slug: circular-deps
name: Circular Dependencies
category: circular_dependency
severity_ceiling: major
enabled: true
---

## What to look for

Dependency cycles — module A imports B, and B (directly or transitively) imports
A back. Cycles make code hard to reason about, break initialization order, defeat
tree-shaking, and usually signal a missing abstraction or a misplaced
responsibility.

- Two modules importing each other to call back and forth.
- A longer loop through a third module (A → B → C → A).
- A "utils" or "models" module that imports from feature modules which import it
  back (the classic barrel-file cycle).
- Symptoms at runtime: `undefined` exports, partially-initialized objects, or a
  module that only works depending on import order.

## Signals in a diff

- A new `import` that closes a loop — e.g. a low-level module suddenly importing a
  high-level one that already depends on it.
- An import added to a barrel/index file from a module that the barrel
  re-exports.
- A type or value moved into a shared module that now imports back into the place
  it came from.
- A function added to module A that calls into B, where B already imports A.

## What NOT to flag

- Type-only import cycles the compiler erases (`import type`) — they don't exist
  at runtime; mention at most as `info` if they still hurt clarity.
- One-directional dependency chains, however deep — depth is not a cycle.
- Cycles contained entirely within a single module/file.

## Example

```ts
// before: user.ts <-> order.ts cycle
// user.ts
import { Order } from "./order";
export class User { lastOrder(): Order { /* ... */ } }
// order.ts
import { User } from "./user";
export class Order { owner: User; }
```

Direction: break the cycle by extracting the shared contract. Introduce a small
`types.ts` (or an interface) that both depend on, or invert one edge so only one
module knows the other. Aim for a single direction of dependency between the two.
