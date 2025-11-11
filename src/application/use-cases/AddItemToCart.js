export class AddItemToCart {
  constructor(cartRepository) {
    this.cartRepository = cartRepository;
  }

  async execute({ cartId, customerId, item }) {
    // Repositorio devolve o agregado completo (novo ou existente)
    const cart = await this.cartRepository.getById(cartId, customerId);
    // Regras/invariantes ficam dentro do agregado
    cart.addItem(item);
    // Persistencia trata o agregado como unidade
    await this.cartRepository.save(cart);
    return cart;
  }
}
