import { InMemoryCartDAO } from "../dao/InMemoryCartDAO.js";
import { CartDataMapper } from "../mapper/CartDataMapper.js";
import { ShoppingCart } from "../../../domain/cart/ShoppingCart.js";

/**
 * Repository trabalha com agregados completos e mantem invariantes.
 */
export class InMemoryCartRepository {
  constructor({ dao = new InMemoryCartDAO(), mapper = new CartDataMapper() } = {}) {
    this.dao = dao;
    this.mapper = mapper;
    this.aggregates = new Map();
  }

  async getById(cartId, customerId) {
    // Primeiro tenta pegar um agregado salvo em memoria
    if (this.aggregates.has(cartId)) {
      return this.aggregates.get(cartId);
    }

    const rows = this.dao.findByCart(cartId);
    if (!rows.length) {
      // Repositorio retorna um agregado vazio pronto para novas regras
      const empty = new ShoppingCart({ cartId, customerId, items: [] });
      this.aggregates.set(cartId, empty);
      return empty;
    }

    const aggregate = this.mapper.toDomain(cartId, customerId, rows);
    this.aggregates.set(cartId, aggregate);
    return aggregate;
  }

  async save(cart) {
    if (!(cart instanceof ShoppingCart)) {
      throw new Error("Repository so aceita agregados do tipo ShoppingCart.");
    }

    const rows = this.mapper.toRows(cart);
    // Zera as linhas relacionadas e grava novamente simulando transacao.
    this.dao.table.set(cart.cartId, []);
    rows.forEach((row) => this.dao.insertCartItem(cart.cartId, row));
    this.aggregates.set(cart.cartId, cart);
    return cart;
  }
}
