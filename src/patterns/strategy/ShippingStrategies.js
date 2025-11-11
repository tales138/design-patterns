class BaseShippingStrategy {
  appliesTo() {
    return false;
  }

  calculate() {
    throw new Error("Implementar nas subclasses.");
  }
}

class DomesticLightStrategy extends BaseShippingStrategy {
  appliesTo(order) {
    return order.destination === "domestic" && order.totalWeight <= 5;
  }

  calculate(order) {
    return order.totalWeight * 5;
  }
}

class DomesticHeavyStrategy extends BaseShippingStrategy {
  appliesTo(order) {
    return order.destination === "domestic" && order.totalWeight > 5;
  }

  calculate(order) {
    return order.totalWeight * 4;
  }
}

class InternationalEconomyStrategy extends BaseShippingStrategy {
  appliesTo(order) {
    return order.destination === "international" && order.priority === "economy";
  }

  calculate(order) {
    return order.totalWeight * 10 + 50;
  }
}

class InternationalExpressStrategy extends BaseShippingStrategy {
  appliesTo(order) {
    return order.destination === "international" && order.priority === "express";
  }

  calculate(order) {
    return order.totalWeight * 12 + 80;
  }
}

const STRATEGIES = [
  new DomesticLightStrategy(),
  new DomesticHeavyStrategy(),
  new InternationalEconomyStrategy(),
  new InternationalExpressStrategy(),
];

export class ShippingCalculatorContext {
  calculate(order) {
    const strategy = STRATEGIES.find((candidate) => candidate.appliesTo(order));
    if (!strategy) {
      throw new Error("Regras de frete nao suportadas.");
    }
    return strategy.calculate(order);
  }
}
