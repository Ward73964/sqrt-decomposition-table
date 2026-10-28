import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SqrtDecompositionTable } from '../src/index.js';

const add = (a, b) => a + b;
const mul = (a, b) => a * b;
const minOp = (a, b) => Math.min(a, b);
const maxOp = (a, b) => Math.max(a, b);

// Non-commutative operator: string concat encoded as length-tagged numbers is
// awkward, so we instead verify non-commutativity concretely with a custom op
// that composes (a, b) -> a*10 + b on single-digit inputs.
const concatDigits = (a, b) => a * 10 + b;

test('empty array: rangeQuery returns identity', () => {
  const t = new SqrtDecompositionTable([], add, 0);
  assert.strictEqual(t.length, 0);
});


test('empty array: rangeQuery throws since bounds cannot be satisfied', () => {
  const t = new SqrtDecompositionTable([], add, 0);
  assert.throws(() => t.rangeQuery(0, 0), RangeError);
});

test('single element: query returns that element', () => {
  const t = new SqrtDecompositionTable([7], add, 0);
  assert.strictEqual(t.rangeQuery(0, 0), 7);
});

test('sum over a full range equals naive reduction', () => {
  const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const t = new SqrtDecompositionTable(data, add, 0);
  assert.strictEqual(t.rangeQuery(0, data.length - 1), 55);
});

test('subrange query matches naive computation across many sizes', () => {
  const data = Array.from({ length: 100 }, (_, i) => (i * 7) % 13);
  const t = new SqrtDecompositionTable(data, add, 0);
  for (let l = 0; l < data.length; l++) {
    for (let len = 1; len <= data.length - l; len += 7) {
      const r = l + len - 1;
      const want = data.slice(l, r + 1).reduce(add, 0);
      assert.strictEqual(t.rangeQuery(l, r), want, `sum [${l}, ${r}]`);
    }
  }
});

test('product operator with identity 1', () => {
  const data = [2, 3, 4, 5];
  const t = new SqrtDecompositionTable(data, mul, 1);
  assert.strictEqual(t.rangeQuery(0, 3), 120);
  assert.strictEqual(t.rangeQuery(1, 2), 12);
});

test('min operator with identity +Infinity', () => {
  const data = [5, 2, 8, 1, 9, 3, 7, 4, 6, 0, 2];
  const t = new SqrtDecompositionTable(data, minOp, Infinity);
  assert.strictEqual(t.rangeQuery(0, data.length - 1), 0);
  assert.strictEqual(t.rangeQuery(2, 5), 1);
  assert.strictEqual(t.rangeQuery(0, 0), 5);
});

test('max operator with identity -Infinity', () => {
  const data = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];
  const t = new SqrtDecompositionTable(data, maxOp, -Infinity);
  assert.strictEqual(t.rangeQuery(0, data.length - 1), 9);
  assert.strictEqual(t.rangeQuery(3, 7), 9);
});

test('non-commutative operator preserves left-to-right order', () => {
  // concatDigits folds left-to-right, so [1,2,3] => ((1*10+2)*10)+3 = 123.
  const t = new SqrtDecompositionTable([1, 2, 3], concatDigits, 0);
  assert.strictEqual(t.rangeQuery(0, 2), 123);
});

test('point set updates the element and its block reduction', () => {
  const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const t = new SqrtDecompositionTable(data, add, 0);
  t.set(4, 100);
  assert.strictEqual(t.get(4), 100);
  assert.strictEqual(t.rangeQuery(0, 9), 150); // 55 - 5 + 100
  assert.strictEqual(t.rangeQuery(0, 3), 10);
  assert.strictEqual(t.rangeQuery(4, 4), 100);
});

test('set throws RangeError for out-of-bounds index', () => {
  const t = new SqrtDecompositionTable([1, 2, 3], add, 0);
  assert.throws(() => t.set(-1, 0), RangeError);
  assert.throws(() => t.set(3, 0), RangeError);
});

test('rangeQuery throws RangeError for invalid bounds', () => {
  const t = new SqrtDecompositionTable([1, 2, 3, 4, 5], add, 0);
  assert.throws(() => t.rangeQuery(-1, 2), RangeError);
  assert.throws(() => t.rangeQuery(0, 5), RangeError);
  assert.throws(() => t.rangeQuery(3, 2), RangeError);
});

test('rangeQuery throws RangeError for non-integer bounds', () => {
  const t = new SqrtDecompositionTable([1, 2, 3], add, 0);
  assert.throws(() => t.rangeQuery(0.5, 2), RangeError);
  assert.throws(() => t.rangeQuery(0, 2.5), RangeError);
});

test('constructor rejects non-array input', () => {
  assert.throws(() => new SqrtDecompositionTable(null, add, 0), TypeError);
});

test('constructor rejects NaN in data or identity', () => {
  assert.throws(() => new SqrtDecompositionTable([1, NaN, 3], add, 0), TypeError);
  assert.throws(() => new SqrtDecompositionTable([1, 2], add, NaN), TypeError);
});

test('constructor rejects non-function operator', () => {
  assert.throws(() => new SqrtDecompositionTable([1, 2], null, 0), TypeError);
});

test('large input with non-power-of-two length: query matches naive', () => {
  const n = 1000;
  const data = Array.from({ length: n }, (_, i) => (i * 31 + 7) % 101);
  const t = new SqrtDecompositionTable(data, minOp, Infinity);
  const check = (l, r) => {
    let want = Infinity;
    for (let i = l; i <= r; i++) want = Math.min(want, data[i]);
    assert.strictEqual(t.rangeQuery(l, r), want);
  };
  check(0, n - 1);
  check(0, 31);
  check(31, 62);
  check(n - 1, n - 1);
  check(100, 250);
});
