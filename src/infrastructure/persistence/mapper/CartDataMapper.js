import { CartItem } from "../../../domain/cart/CartItem.js";
import { ShoppingCart } from "../../../domain/cart/ShoppingCart.js";

/**
 * Data Mapper converte registros em objetos de dominio e vice-versa.
 * Diferente do DAO, ele entende a estrutura do dominio.
 */
export class CartDataMapper {
  toDomain(cartId, customerId, rows = []) {
    const items = rows.map((row) => new CartItem(row));
    return new ShoppingCart({ cartId, customerId, items });
  }

  toRows(cart) {
    return cart.items.map((item) => ({
      cartId: cart.cartId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
  }
}
