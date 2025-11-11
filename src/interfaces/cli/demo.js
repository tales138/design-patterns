import { InMemoryCartDAO } from "../../infrastructure/persistence/dao/InMemoryCartDAO.js";
import { CartDataMapper } from "../../infrastructure/persistence/mapper/CartDataMapper.js";
import { InMemoryCartRepository } from "../../infrastructure/persistence/repository/InMemoryCartRepository.js";
import { AddItemToCart } from "../../application/use-cases/AddItemToCart.js";

async function main() {
  const dao = new InMemoryCartDAO();
  const mapper = new CartDataMapper();
  const repository = new InMemoryCartRepository({ dao, mapper });
  const addItemToCart = new AddItemToCart(repository);

  // DAO trabalha diretamente com registros planos
  dao.insertCartItem("cart-01", { productId: "coffee", quantity: 1, unitPrice: 25 });
  console.log("DAO -> registros crus:", dao.findByCart("cart-01"));

  // Data Mapper monta objetos de dominio, mas ainda depende do chamador para regras
  const cartFromMapper = mapper.toDomain("cart-01", "customer-01", dao.findByCart("cart-01"));
  cartFromMapper.addItem({ productId: "sugar", quantity: 2, unitPrice: 5 });
  console.log("Data Mapper -> agregado apos regra local:", cartFromMapper.totalValue);

  // Repository retorna o agregado pronto, garante invariantes e persistencia atomica
  await addItemToCart.execute({
    cartId: "cart-02",
    customerId: "customer-02",
    item: { productId: "tea", quantity: 3, unitPrice: 8 },
  });
  const cart = await repository.getById("cart-02", "customer-02");
  console.log("Repository -> agregado completo:", cart.totalValue, "eventos:", cart.pullDomainEvents());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
