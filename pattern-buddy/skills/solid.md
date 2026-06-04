---
slug: solid
name: SOLID Principle Violations
category: solid
severity_ceiling: major
enabled: true
---

## What to look for

Violations of the five SOLID principles, which keep object-oriented designs
flexible and testable:

- **SRP** (Single Responsibility): a class or function has more than one reason to
  change — e.g. it parses input, applies business rules, *and* writes to a DB.
- **OCP** (Open/Closed): handling a new case means editing an existing
  `switch`/`if-else` ladder over a type tag instead of adding a new
  implementation.
- **LSP** (Liskov Substitution): a subclass weakens the base contract — throws on
  a method the base supports, tightens preconditions, or returns a narrower type.
- **ISP** (Interface Segregation): consumers are forced to depend on methods they
  don't use (a "fat" interface); implementers stub the rest with `throw`/no-op.
- **DIP** (Dependency Inversion): high-level policy depends directly on a
  low-level concrete (a specific DB client, SDK, or `fs`) instead of on an
  abstraction passed in.

## Signals in a diff

- A class gaining a method from an unrelated concern (formatting added to a
  repository, HTTP added to a domain model) — SRP.
- A new branch added to a `switch (kind)` that already exists in several places —
  OCP; every new type touches every switch.
- A subclass override whose body is `throw new Error("not supported")` — LSP.
- An interface gaining a method that only one of several implementers can satisfy
  — ISP.
- `new ConcreteClient()` or `import { db } from "../infra/db"` inside a
  domain/service layer — DIP.

## What NOT to flag

- A class whose several methods genuinely serve one cohesive responsibility.
- A `switch` over a closed, stable set that will not grow (e.g. a two-state enum)
  — OCP is about churn, not all branching.
- Concrete dependencies in composition roots / `main` / wiring code — that is
  exactly where concretes belong.

## Example

```ts
// before: OCP violation — every new shape edits this function
function area(s: Shape) {
  switch (s.kind) {
    case "circle": return Math.PI * s.r ** 2;
    case "square": return s.side ** 2;
    // adding "triangle" means editing here AND every other switch on kind
  }
}
```

Direction: invert to polymorphism — give each shape an `area()` method (or a
strategy registered by kind) so a new shape is a new file and this function
collapses to `return s.area();`. Closed for modification, open for extension.
