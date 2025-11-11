import { EventEmitter } from "node:events";

export function demoEventEmitterObserver() {
  const emitter = new EventEmitter();
  const received = [];

  emitter.on("cart:itemAdded", (event) => {
    received.push({ source: "EventEmitter", event });
  });

  emitter.emit("cart:itemAdded", { cartId: "cart-01", productId: "coffee" });
  return received;
}
