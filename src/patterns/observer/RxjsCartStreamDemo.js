import { Subject } from "rxjs";
import { filter, map } from "rxjs/operators";

/**
 * Demonstra como levar eventos do agregado do carrinho para um fluxo RxJS real.
 * Execute com: npm run demo:observer:rxjs
 */
export function createCartEventStream() {
  const subject = new Subject();

  const shippingStream = subject.pipe(
    // Rotas de entrega reagem somente a eventos ITEM_ADDED
    filter((event) => event.type === "ITEM_ADDED"),
    map((event) => ({
      ...event,
      message: `Separar produto ${event.payload.productId} com ${event.payload.quantity} unidade(s).`,
    })),
  );

  const billingStream = subject.pipe(
    filter((event) => event.type === "CART_LIMIT_APPROVED"),
    map((event) => ({
      ...event,
      message: `Limite aprovado para o carrinho ${event.payload.cartId}.`,
    })),
  );

  return { subject, shippingStream, billingStream };
}

export function runRxjsDemo() {
  const { subject, shippingStream, billingStream } = createCartEventStream();

  // Logs simulam observers separados consumindo o mesmo Subject
  const shippingSubscription = shippingStream.subscribe((event) => {
    console.log("[RxJS][Shipping]", event.message);
  });

  const billingSubscription = billingStream.subscribe((event) => {
    console.log("[RxJS][Billing]", event.message);
  });

  subject.next({ type: "ITEM_ADDED", payload: { cartId: "cart-01", productId: "coffee", quantity: 2 } });
  subject.next({ type: "CART_LIMIT_APPROVED", payload: { cartId: "cart-01" } });

  setTimeout(() => {
    shippingSubscription.unsubscribe();
    billingSubscription.unsubscribe();
    subject.complete();
  }, 1000);
}
