/**
 * DAO trata o armazenamento como linhas de tabela.
 * Nao ha nocao de agregado, apenas registros brutos.
 */
export class InMemoryCartDAO {
  constructor() {
    this.table = new Map();
  }

  insertCartItem(cartId, { productId, quantity, unitPrice }) {
    const rows = this.table.get(cartId) ?? [];
    rows.push({
      cartId,
      productId,
      quantity,
      unitPrice,
    });
    this.table.set(cartId, rows);
    return rows.at(-1);
  }

  findByCart(cartId) {
    return [...(this.table.get(cartId) ?? [])];
  }
}
