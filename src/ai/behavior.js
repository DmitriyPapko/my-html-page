class Selector {
  constructor(children = []) {
    this.children = children;
  }
  tick(ctx) {
    for (const child of this.children) {
      if (child.tick(ctx)) return true;
    }
    return false;
  }
}

class Sequence {
  constructor(children = []) {
    this.children = children;
  }
  tick(ctx) {
    for (const child of this.children) {
      if (!child.tick(ctx)) return false;
    }
    return true;
  }
}

class Action {
  constructor(fn) {
    this.fn = fn;
  }
  tick(ctx) {
    return this.fn(ctx);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Selector, Sequence, Action };
} else {
  Object.assign(globalThis, { Selector, Sequence, Action });
}
