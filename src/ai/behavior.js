export class Selector {
  constructor(children = []) {
    this.children = children;
  }
  tick(ctx) {
    for (const child of this.children) {
      if (child.tick(ctx) === true) return true;
    }
    return false;
  }
}

export class Sequence {
  constructor(children = []) {
    this.children = children;
  }
  tick(ctx) {
    for (const child of this.children) {
      if (child.tick(ctx) === false) return false;
    }
    return true;
  }
}

export class Action {
  constructor(fn) {
    this.fn = fn;
  }
  tick(ctx) {
    return this.fn(ctx);
  }
}

// Expose for browser without bundler
Object.assign(globalThis, { Selector, Sequence, Action });
