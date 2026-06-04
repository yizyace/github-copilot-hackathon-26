---
slug: coupling
name: Tight Coupling & Low Cohesion
category: coupling
severity_ceiling: major
enabled: true
---

## What to look for

Code where one module leans on the *internal details* of another, so changing
one forces a change in the other. Aim for the opposite: **loose coupling, high
cohesion** — modules talk through small, stable interfaces, and everything inside
a module serves one clear purpose.

- A class or function reaching across a boundary to read or mutate another
  module's fields (feature envy, "train wrecks" like `a.getB().getC().doThing()`).
- Concrete collaborators hard-wired with `new` deep inside business logic instead
  of being passed in — there is no seam to substitute or test.
- A module that imports from many unrelated areas, or whose methods each touch a
  *different* cluster of fields. That is low cohesion — several modules wearing
  one trench coat.
- Bidirectional knowledge: two modules each importing the other to coordinate.

## Signals in a diff

- A new `import` from a deep internal path (`../../orders/internal/state`) rather
  than the package's public surface.
- A long dotted access chain added inside a method body.
- A parameter added to a signature only to thread it through to a collaborator the
  function shouldn't know about.
- A class gaining methods that operate on a completely different field cluster than
  the rest of the class.

## What NOT to flag

- Cohesive use of another module's well-defined **public** API — that is a normal,
  healthy dependency, not coupling.
- A single `new` for a value object, DTO, or plain data holder.
- Test files wiring up concrete collaborators — tests are allowed to know
  internals.
- Import count on its own. Flag only when the imports reveal mixed
  responsibilities.

## Example

```ts
// before: OrderService reaches into the customer's wallet internals
class OrderService {
  charge(order: Order, customer: Customer) {
    customer.wallet.balance -= order.total;          // feature envy + invariant leak
    customer.wallet.transactions.push({ amount: order.total });
  }
}
```

Direction: move the behavior onto `Wallet` and let `OrderService` depend on a
small interface — `customer.wallet.debit(order.total)` — so the balance invariant
lives with the data it protects and `OrderService` stops knowing the wallet's
shape.
