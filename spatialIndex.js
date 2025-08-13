export class SpatialIndex {
  constructor(cellSize = 256) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  _key(cx, cy) {
    return `${cx},${cy}`;
  }

  _cellKey(x, y) {
    return this._key(
      Math.floor(x / this.cellSize),
      Math.floor(y / this.cellSize)
    );
  }

  add(e) {
    const key = this._cellKey(e.x, e.y);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = new Set();
      this.cells.set(key, cell);
    }
    cell.add(e);
    e._siKey = key;
  }

  remove(e) {
    const key = e._siKey;
    if (!key) return;
    const cell = this.cells.get(key);
    if (cell) {
      cell.delete(e);
      if (cell.size === 0) this.cells.delete(key);
    }
    e._siKey = null;
  }

  update(e) {
    const key = this._cellKey(e.x, e.y);
    if (key === e._siKey) return;
    this.remove(e);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = new Set();
      this.cells.set(key, cell);
    }
    cell.add(e);
    e._siKey = key;
  }

  queryCircle(x, y, r) {
    const res = [];
    const cs = this.cellSize;
    const minX = Math.floor((x - r) / cs);
    const maxX = Math.floor((x + r) / cs);
    const minY = Math.floor((y - r) / cs);
    const maxY = Math.floor((y + r) / cs);
    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const cell = this.cells.get(this._key(cx, cy));
        if (cell) res.push(...cell);
      }
    }
    return res;
  }

  clear() {
    this.cells.clear();
  }
}

