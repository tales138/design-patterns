export class CartItem {
  constructor({ productId, quantity, unitPrice }) {
    if (!productId) {
      throw new Error("CartItem precisa de productId.");
    }
    if (quantity <= 0) {
      throw new Error("CartItem precisa de quantidade positiva.");
    }
    if (unitPrice <= 0) {
      throw new Error("CartItem precisa de preco positivo.");
    }

    this.productId = productId;
    this.quantity = quantity;
    this.unitPrice = unitPrice;
  }

  mergeQuantity(extraQuantity) {
    return new CartItem({
      productId: this.productId,
      quantity: this.quantity + extraQuantity,
      unitPrice: this.unitPrice,
    });
  }

  get total() {
    return this.quantity * this.unitPrice;
  }
}
