---
slug: dry
name: DRY — Don't Repeat Yourself
category: dry
severity_ceiling: minor
enabled: true
---

## What to look for

Duplication of **knowledge** — one business rule, calculation, or decision
expressed in more than one place, so a future change has to be made in lockstep
everywhere or the copies drift and bugs appear. DRY is about *meaning*, not about
lines that merely look alike.

- The same non-trivial logic (a validation rule, a tax/discount formula, a status
  transition) copy-pasted across functions or files.
- A magic constant or policy threshold repeated literally in several spots.
- Parallel branches that differ only in a single value, begging to be data-driven.
- A bug "fixed" in one copy but not its twins.

## Signals in a diff

- A new block that is a near-duplicate of an existing one nearby (same shape,
  renamed variables).
- The same literal (`0.0825`, `"ACTIVE"`, a regex) added where it already exists
  elsewhere.
- A second `if`/`switch` encoding a rule that another module already encodes.
- Copy-pasted error-handling or mapping code with a single field changed.

## What NOT to flag

- **Incidental** duplication: two pieces of code that look alike today but change
  for different reasons. Merging them creates the wrong coupling — the cure is
  worse than the disease.
- Boilerplate the language or framework requires (DTO field lists, simple
  getters).
- Test arrange blocks kept intentionally explicit for readability.
- A single repetition where extracting an abstraction would obscure intent — note
  it at most as `info`.

## Example

```ts
// before: the "is eligible" rule lives in two places and will drift
function canCheckout(c: Cart) {
  return c.items.length > 0 && c.total >= 0 && !c.locked;
}
function canApplyCoupon(c: Cart) {
  return c.items.length > 0 && c.total >= 0 && !c.locked && c.coupon == null;
}
```

Direction: name the shared knowledge once — `cartIsActive(c)` — and compose from
it: `canCheckout = cartIsActive(c)` and `canApplyCoupon = cartIsActive(c) &&
c.coupon == null`. Now there is one place to change the eligibility rule.
