---
slug: abstraction-altitude
name: Abstraction Altitude
category: other
severity_ceiling: minor
enabled: true
---

## What to look for

Code operating at the **wrong level of abstraction** — mixing high-level intent
with low-level mechanics, or introducing abstractions that don't earn their keep.
Good code reads like a layered story: each function speaks in one vocabulary.

- **Leaky abstraction**: a high-level API that forces callers to handle the
  lower-level details it was meant to hide (raw SQL strings escaping a repository,
  HTTP status codes surfacing in domain logic).
- **Mixed altitude**: one function that both expresses business intent *and*
  fiddles with bytes, indices, or connection setup.
- **Premature / speculative abstraction**: an interface, generic, or plugin system
  with exactly one implementation and no concrete second use case (YAGNI) —
  indirection that costs now for a maybe-later.
- **Over-generalization**: a "flexible" helper carrying many boolean/option flags
  that each caller uses only a slice of.

## Signals in a diff

- A domain/service function gaining low-level calls (buffer math, manual JSON
  shape-poking, transport details).
- A brand-new `interface` or abstract class introduced alongside its *only*
  implementation, with no second caller in the same change.
- A signature sprouting option flags
  (`(…, opts: { raw?: boolean; legacy?: boolean; internal?: boolean })`).
- Helpers named `doEverything`/`handle`/`process` that span several abstraction
  levels at once.

## What NOT to flag

- A single implementation behind an interface that exists for a real seam (a
  testing boundary, dependency inversion at an architectural edge).
- Low-level code living in an explicitly low-level module — that is its job.
- Reasonable, in-use generics and parameters. Flag only speculative ones with no
  current consumer.

## Example

```ts
// before: business intent tangled with transport + parsing details
async function getActiveUsers() {
  const res = await fetch("/api/users?status=active");
  const json = await res.json();
  return json.data.map((u: any) => ({ id: u.user_id, name: u.full_name })); // wrong altitude
}
```

Direction: split the layers. A low-level `usersApi.list({ status })` owns
fetch/parse/mapping; `getActiveUsers()` stays high-level —
`return usersApi.list({ status: "active" })` — so each function speaks one
vocabulary and the transport can change without touching intent.
