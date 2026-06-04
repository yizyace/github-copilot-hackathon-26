---
slug: factory-singleton
name: Factory & Singleton Misuse
category: factory_singleton
severity_ceiling: major
enabled: true
---

## What to look for

Creational-pattern smells — object construction or global access done in a way
that hides dependencies, defeats testing, or adds ceremony for no benefit.

**Singleton misuse**

- Global mutable state behind `getInstance()` or a module-level mutable export,
  used as an ambient dependency throughout the codebase.
- Singletons holding request- or user-scoped state — a recipe for race conditions
  and test bleed-through between cases.
- Code that can't be unit-tested without first resetting global state.

**Factory misuse**

- A "factory" that always returns the same concrete type with no variation —
  indirection that buys nothing; just call the constructor.
- A factory that takes a giant config object and `switch`es to build wildly
  different things (a god-factory; usually an OCP problem too).
- Construction logic duplicated inline across call sites that must build the
  object consistently — this is the case where a factory *would* genuinely help.

## Signals in a diff

- A new `static getInstance()` or `export const x = new X()` that other modules
  import and mutate.
- A factory function whose entire body is `return new TheOnlyType(...)`.
- A `createX(kind)` switch growing to return more and more different subtypes.
- Tests adding `SomeSingleton.reset()` hooks just to cope with shared state.

## What NOT to flag

- Genuinely stateless singletons or constants (a frozen config, a pure utility
  object) — these are fine.
- Dependency-injection container registrations and composition-root wiring.
- A factory that legitimately abstracts variation (returns different impls by
  input) — that is the pattern working as intended.

## Example

```ts
// before: ambient singleton makes Logger a hidden, untestable dependency
class Logger { static instance = new Logger(); log(m: string) { /* ... */ } }
function processOrder(o: Order) {
  Logger.instance.log(`processing ${o.id}`);   // hidden dependency, hard to assert in tests
}
```

Direction: pass the dependency in — `processOrder(o, logger: Logger)`, or inject
it via the constructor. Selection and construction move to the composition root;
the business function now states its needs and is trivially testable with a fake.
