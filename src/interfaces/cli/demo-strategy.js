import { legacyShippingCalculator } from "../../patterns/strategy/LegacyShippingCalculator.js";
import { ShippingCalculatorContext } from "../../patterns/strategy/ShippingStrategies.js";

const SAMPLE_ORDERS = [
  { id: "order-01", destination: "domestic", totalWeight: 3 },
  { id: "order-02", destination: "domestic", totalWeight: 8 },
  { id: "order-03", destination: "international", totalWeight: 4, priority: "economy" },
  { id: "order-04", destination: "international", totalWeight: 2, priority: "express" },
];

function runStrategyDemo() {
  const context = new ShippingCalculatorContext();

  SAMPLE_ORDERS.forEach((order) => {
    const legacyCost = legacyShippingCalculator(order);
    const strategyCost = context.calculate(order);
    console.log(
      `Pedido ${order.id} -> Legacy: ${legacyCost} | Strategy: ${strategyCost} (${order.destination} / ${order.priority ?? "default"})`,
    );
  });
}

runStrategyDemo();
