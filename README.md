# sqrt-decomposition-table

Splits an array into fixed-size blocks to answer associative range queries with point updates in O(sqrt(n)) time, using an operator and identity you supply.

```js
import { SqrtDecompositionTable } from 'sqrt-decomposition-table';

const t = new SqrtDecompositionTable(
  [5, 2, 8, 1, 9, 3, 7],
  (a, b) => Math.min(a, b),
  Infinity,
);

t.rangeQuery(0, 6);   // 1
t.rangeQuery(2, 4);   // 1
t.set(3, 20);
t.rangeQuery(0, 6);   // 2
```

## Why this exists

For an array of length n with an associative operator and a known identity, a sqrt-decomposition table answers range queries in O(sqrt(n)) and applies point updates in O(sqrt(n)) — the update rebuilds a single block of size sqrt(n). It is simpler than a segment tree and uses O(n) memory with a small constant. The trade-off: queries are slower by a sqrt(n) factor versus a segment tree, and the structure only supports point updates, not range updates.

The operator must be associative; it need not be commutative. Queries fold strictly left-to-right, so for a non-commutative operator the result respects element order. You must provide an identity element satisfying `op(identity, x) == x == op(x, identity)`.

## Edge cases

The table accepts empty arrays. An empty table has length 0, and any `rangeQuery` call on it throws `RangeError` because no valid inclusive range exists. `rangeQuery(l, r)` also throws `RangeError` when `l < 0`, `r >= length`, `l > r`, or either bound is not an integer. `set` throws `RangeError` for indices outside `[0, length)`. All elements, the identity, and update values must be finite numbers; `NaN` is rejected at construction and at `set` time.

## Exports

- `SqrtDecompositionTable` — class. Constructor: `(data: number[], op: (a: number, b: number) => number, identity: number)`.
  - `length: number` — number of elements.
  - `get(index: number): number | undefined` — element at index, or `undefined` if out of range.
  - `set(index: number, value: number): void` — point update; throws `RangeError` if out of bounds.
  - `rangeQuery(left: number, right: number): number` — left-fold over the inclusive range `[left, right]`; throws `RangeError` for invalid bounds.
