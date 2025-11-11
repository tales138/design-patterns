import { CartItem } from "./CartItem.js";

const MAX_ITEMS = 50;

export class ShoppingCart {
  constructor({ cartId, customerId, creditLimit = 500, items = [], domainEvents = [] }) {
    if (!cartId) {
      throw new Error("ShoppingCart precisa de cartId.");
    }
    if (!customerId) {
      throw new Error("ShoppingCart precisa de customerId.");
    }

    this.cartId = cartId;
    this.customerId = customerId;
    this.creditLimit = creditLimit;
    this.items = items;
    this.domainEvents = domainEvents;
  }

  get totalValue() {
    return this.items.reduce((total, item) => total + item.total, 0);
  }

  get totalUnits() {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  addItem(rawItem) {
    const item = rawItem instanceof CartItem ? rawItem : new CartItem(rawItem);

    const nextTotalUnits = this.totalUnits + item.quantity;
    if (nextTotalUnits > MAX_ITEMS) {
      throw new Error("Nao e permitido mais que 50 unidades no carrinho.");
    }

    const nextTotalValue = this.totalValue + item.total;
    if (nextTotalValue > this.creditLimit) {
      throw new Error("Carrinho nao pode ultrapassar o limite de credito do cliente.");
    }

    const existingIndex = this.items.findIndex((existing) => existing.productId === item.productId);
    if (existingIndex >= 0) {
      const updated = this.items[existingIndex].mergeQuantity(item.quantity);
      const clone = [...this.items];
      clone[existingIndex] = updated;
      this.items = clone;
    } else {
      this.items = [...this.items, item];
    }

    this.domainEvents = [
      ...this.domainEvents,
      {
        name: "CartItemAdded",
        payload: { cartId: this.cartId, productId: item.productId, quantity: item.quantity },
        occurredAt: new Date(),
      },
    ];
  }

  pullDomainEvents() {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }
}
