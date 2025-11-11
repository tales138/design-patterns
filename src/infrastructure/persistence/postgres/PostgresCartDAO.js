/**
 * DAO baseado em Postgres que lida com registros reais.
 */
export class PostgresCartDAO {
  constructor(pool) {
    this.pool = pool;
  }

  async findByCart(cartId) {
    const { rows } = await this.pool.query(
      `
        SELECT product_id AS "productId", quantity, unit_price AS "unitPrice"
        FROM cart_items
        WHERE cart_id = $1
        ORDER BY product_id
      `,
      [cartId],
    );
    return rows;
  }

  /**
   * Substitui todos os itens do carrinho em uma transacao simples.
   */
  async replaceCartItems(cartId, rows) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cartId]);
      for (const row of rows) {
        await client.query(
          `
            INSERT INTO cart_items (cart_id, product_id, quantity, unit_price)
            VALUES ($1, $2, $3, $4)
          `,
          [row.cartId, row.productId, row.quantity, row.unitPrice],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
