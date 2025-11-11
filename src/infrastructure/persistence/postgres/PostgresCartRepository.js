import { CartDataMapper } from "../mapper/CartDataMapper.js";
import { ShoppingCart } from "../../../domain/cart/ShoppingCart.js";

export class PostgresCartRepository {
  constructor({ dao, mapper = new CartDataMapper() }) {
    this.dao = dao;
    this.mapper = mapper;
  }

  async getById(cartId, customerId) {
    const rows = await this.dao.findByCart(cartId);
    if (!rows.length) {
      return new ShoppingCart({ cartId, customerId, items: [] });
    }
    return this.mapper.toDomain(cartId, customerId, rows);
  }

  async save(cart) {
    if (!(cart instanceof ShoppingCart)) {
      throw new Error("Repository so aceita agregados do tipo ShoppingCart.");
    }
    const rows = this.mapper.toRows(cart);
    await this.dao.replaceCartItems(cart.cartId, rows);
    return cart;
  }
}
