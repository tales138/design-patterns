export class ClassicSubject {
  constructor() {
    this.observers = new Set();
  }

  attach(observer) {
    this.observers.add(observer);
  }

  detach(observer) {
    this.observers.delete(observer);
  }

  notify(event) {
    this.observers.forEach((observer) => observer.update(event));
  }
}

export class ClassicObserver {
  constructor(name) {
    this.name = name;
    this.received = [];
  }

  update(event) {
    this.received.push({ ...event, receivedAt: new Date() });
  }
}

export function demoClassicObserver() {
  const subject = new ClassicSubject();
  const shippingObserver = new ClassicObserver("shipping");
  const billingObserver = new ClassicObserver("billing");

  subject.attach(shippingObserver);
  subject.attach(billingObserver);
  subject.notify({ type: "ITEM_ADDED", payload: { productId: "coffee" } });

  return { shippingObserver, billingObserver };
}
