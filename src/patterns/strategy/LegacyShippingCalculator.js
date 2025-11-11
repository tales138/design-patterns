/**
 * Codigo original cheio de if/else.
 */
export function legacyShippingCalculator(order) {
  if (order.destination === "domestic" && order.totalWeight <= 5) {
    return order.totalWeight * 5;
  } else if (order.destination === "domestic" && order.totalWeight > 5) {
    return order.totalWeight * 4;
  } else if (order.destination === "international" && order.priority === "economy") {
    return order.totalWeight * 10 + 50;
  } else if (order.destination === "international" && order.priority === "express") {
    return order.totalWeight * 12 + 80;
  }

  throw new Error("Regras de frete nao suportadas.");
}
