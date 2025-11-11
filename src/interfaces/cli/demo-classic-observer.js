import { ClassicSubject, ClassicObserver } from "../../patterns/observer/ClassicObserver.js";

function runClassicObserverDemo() {
  const subject = new ClassicSubject();
  const shippingObserver = new ClassicObserver("shipping");
  const billingObserver = new ClassicObserver("billing");

  subject.attach(shippingObserver);
  subject.attach(billingObserver);

  subject.notify({ type: "ITEM_ADDED", payload: { cartId: "classic-cart", productId: "espresso", quantity: 1 } });
  subject.notify({ type: "ORDER_CONFIRMED", payload: { orderId: "order-123" } });

  console.log("[Classic][Shipping]", shippingObserver.received);
  console.log("[Classic][Billing]", billingObserver.received);
}

runClassicObserverDemo();
