import { AddItemToCart } from "../../application/use-cases/AddItemToCart.js";
import { PostgresCartDAO } from "../../infrastructure/persistence/postgres/PostgresCartDAO.js";
import { PostgresCartRepository } from "../../infrastructure/persistence/postgres/PostgresCartRepository.js";
import { closePostgresPool, getPostgresPool } from "../../shared/database/postgresPool.js";

async function main() {
  const pool = getPostgresPool();
  const dao = new PostgresCartDAO(pool);
  const repository = new PostgresCartRepository({ dao });
  const addItemToCart = new AddItemToCart(repository);

  await addItemToCart.execute({
    cartId: "pg-cart-01",
    customerId: "customer-pg",
    item: { productId: "espresso", quantity: 2, unitPrice: 12 },
  });
  await addItemToCart.execute({
    cartId: "pg-cart-01",
    customerId: "customer-pg",
    item: { productId: "cookie", quantity: 1, unitPrice: 7 },
  });

  const cart = await repository.getById("pg-cart-01", "customer-pg");
  console.log("Postgres repository -> total:", cart.totalValue, "itens:", cart.items.length);
}

main()
  .catch((error) => {
    console.error("Falha ao executar demo com Postgres. Configure DATABASE_URL e rode o script SQL em db/schema.sql.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePostgresPool();
  });
