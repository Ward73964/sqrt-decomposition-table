/**
 * Sqrt-decomposition table over an array using an associative binary operator.
 *
 * The array is partitioned into fixed-size blocks of length B = ceil(sqrt(n)).
 * Each block stores the reduced (folded) value of its slice, so a range query
 * only touches at most two partial blocks plus sqrt(n) interior blocks.
 *
 * Requirement on `op`: it must be associative — op(op(a,b),c) == op(a,op(b,c)).
 * It need not be commutative; the table folds left-to-right, so rangeQuery(l, r)
 * computes op(arr[l], op(arr[l+1], ... op(arr[r-1], arr[r])...)).
 *
 * `identity` must satisfy op(identity, x) == x == op(x, identity) for every x.
 */
export class SqrtDecompositionTable {
  /**
   * @param {ReadonlyArray<number>} data
   * @param {(a: number, b: number) => number} op - associative binary operator
   * @param {number} identity - identity element for `op`
   */
  constructor(data, op, identity) {
    if (typeof op !== 'function') {
      throw new TypeError('op must be a function');
    }
    if (typeof identity !== 'number' || Number.isNaN(identity)) {
      throw new TypeError('identity must be a finite number');
    }
    if (!Array.isArray(data)) {
      throw new TypeError('data must be an array');
    }
    for (const x of data) {
      if (typeof x !== 'number' || Number.isNaN(x)) {
        throw new TypeError('every element must be a finite number');
      }
    }

    this._op = op;
    this._identity = identity;
    this._data = data.slice();

    const n = this._data.length;
    // Block size is chosen as ceil(sqrt(n)) so that query cost stays O(sqrt(n))
    // for both partial-block scans and full-block lookups. For tiny inputs we
    // still use at least 1 so the arithmetic is well-defined.
    this._blockSize = Math.max(1, Math.ceil(Math.sqrt(n)));
    this._blockCount = n === 0 ? 0 : Math.ceil(n / this._blockSize);
    this._block = new Array(this._blockCount).fill(identity);
    for (let i = 0; i < n; i++) {
      const b = Math.floor(i / this._blockSize);
      this._block[b] = this._op(this._block[b], this._data[i]);
    }
  }

  /** Number of elements in the table. */
  get length() {
    return this._data.length;
  }

  /** Returns the value stored at `index`, or `undefined` if out of range. */
  get(index) {
    if (index < 0 || index >= this._data.length) return undefined;
    return this._data[index];
  }

  /**
   * Point update: set `index` to `value` and refresh its block's reduction.
   * Throws RangeError for out-of-bounds indices.
   */
  set(index, value) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new TypeError('value must be a finite number');
    }
    if (index < 0 || index >= this._data.length) {
      throw new RangeError(`index ${index} out of bounds [0, ${this._data.length})`);
    }
    this._data[index] = value;
    const b = Math.floor(index / this._blockSize);
    // Rebuild only the affected block: cheaper than incremental bookkeeping
    // and keeps a single source of truth for block values.
    let acc = this._identity;
    const start = b * this._blockSize;
    const end = Math.min(start + this._blockSize, this._data.length);
    for (let i = start; i < end; i++) {
      acc = this._op(acc, this._data[i]);
    }
    this._block[b] = acc;
  }

  /**
   * Left-fold over the inclusive range [left, right] using the stored operator.
   * Returns `identity` for empty ranges. Throws RangeError for invalid bounds.
   */
  rangeQuery(left, right) {
    const n = this._data.length;
    if (!Number.isInteger(left) || !Number.isInteger(right)) {
      throw new RangeError('left and right must be integers');
    }
    if (left < 0 || right >= n || left > right) {
      throw new RangeError(`invalid range [${left}, ${right}] for length ${n}`);
    }
    if (n === 0) return this._identity;

    let result = this._identity;
    const bs = this._blockSize;
    let i = left;

    // Left partial block: scan element-by-element until the next block boundary.
    while (i <= right && i % bs !== 0) {
      result = this._op(result, this._data[i]);
      i++;
    }
    // Interior blocks that are fully covered: fold their precomputed values.
    while (i + bs - 1 <= right) {
      result = this._op(result, this._block[Math.floor(i / bs)]);
      i += bs;
    }
    // Right partial block: scan the remaining tail elements.
    while (i <= right) {
      result = this._op(result, this._data[i]);
      i++;
    }
    return result;
  }
}
