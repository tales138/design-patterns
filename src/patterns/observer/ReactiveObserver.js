class MiniSubject {
  constructor() {
    this.subscribers = new Set();
  }

  next(value) {
    this.subscribers.forEach((subscriber) => subscriber(value));
  }

  subscribe(subscriber) {
    this.subscribers.add(subscriber);
    return {
      unsubscribe: () => this.subscribers.delete(subscriber),
    };
  }
}

export function demoReactiveObserver() {
  const stream = new MiniSubject();
  const received = [];

  stream.subscribe((value) => {
    received.push({ source: "ReactiveStream", value });
  });

  stream.next({ event: "ITEM_ADDED", payload: { productId: "tea" } });
  return received;
}
