class SimpleBroker {
  constructor() {
    this.topics = new Map();
  }

  subscribe(topic, handler) {
    const handlers = this.topics.get(topic) ?? new Set();
    handlers.add(handler);
    this.topics.set(topic, handlers);
    return () => handlers.delete(handler);
  }

  publish(topic, event) {
    const handlers = this.topics.get(topic);
    handlers?.forEach((handler) => handler(event));
  }
}

export function demoPubSubObserver() {
  const broker = new SimpleBroker();
  const received = [];

  broker.subscribe("cart-events", (event) => {
    received.push({ source: "PubSub", event });
  });

  broker.publish("cart-events", { type: "ITEM_ADDED", cartId: "cart-99" });
  return received;
}
