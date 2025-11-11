/**
 * Singleton antipadrao:
 */
export class LegacyCartServiceSingleton {
  static instance;

  static getInstance(repository) {
    if (!LegacyCartServiceSingleton.instance) {
      LegacyCartServiceSingleton.instance = new LegacyCartServiceSingleton(repository);
    }
    return LegacyCartServiceSingleton.instance;
  }

  constructor(repository) {
    this.repository = repository;
  }
}

export class CartService {
  constructor({ repository }) {
    this.repository = repository;
  }
}

/**
 * Abstract Factory verboso:
 */
export class ShippingGatewayFactory {
  create(config) {
    if (config.provider === "fast") {
      return { type: "FastShip", apiKey: config.apiKey };
    }
    if (config.provider === "cheap") {
      return { type: "CheapShip", apiKey: config.apiKey };
    }
    throw new Error("Fornecedor desconhecido.");
  }
}

export function buildShippingGateway(config) {
  const providers = {
    fast: () => ({ type: "FastShip", apiKey: config.apiKey }),
    cheap: () => ({ type: "CheapShip", apiKey: config.apiKey }),
  };
  const factory = providers[config.provider];
  if (!factory) {
    throw new Error("Fornecedor desconhecido.");
  }
  return factory();
}

/**
 * Prototype raramente usado:
 */
export class PrototypeCart {
  constructor(template) {
    this.template = template;
  }

  clone() {
    return new PrototypeCart(structuredClone(this.template));
  }
}

export function copyCartTemplate(template) {
  return { ...template, items: template.items.map((item) => ({ ...item })) };
}
