export class AddItemToCart {
  constructor(cartRepository) {
    this.cartRepository = cartRepository;
  }

  async execute({ cartId, customerId, item }) {
    const cart = await this.cartRepository.getById(cartId, customerId);
    cart.addItem(item);
    await this.cartRepository.save(cart);
    return cart;
  }
}
