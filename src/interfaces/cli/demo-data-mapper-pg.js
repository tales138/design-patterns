import { CartDataMapper } from "../../infrastructure/persistence/mapper/CartDataMapper.js";
import { PostgresCartDAO } from "../../infrastructure/persistence/postgres/PostgresCartDAO.js";
import { closePostgresPool, getPostgresPool } from "../../shared/database/postgresPool.js";

const CART_ID = "pg-cart-mapper";
const CUSTOMER_ID = "customer-mapper";

async function seedRows(dao) {
  await dao.replaceCartItems(CART_ID, [
    { cartId: CART_ID, productId: "coffee", quantity: 1, unitPrice: 20 },
    { cartId: CART_ID, productId: "sugar", quantity: 2, unitPrice: 5 },
  ]);
}

async function main() {
  const pool = getPostgresPool();
  const dao = new PostgresCartDAO(pool);
  const mapper = new CartDataMapper();

  await seedRows(dao);

  const rawRows = await dao.findByCart(CART_ID);
  console.log("[Mapper] Linhas vindas do Postgres:", rawRows);

  // Data Mapper monta o agregado, mas quem chama ainda aplica regras
  const cart = mapper.toDomain(CART_ID, CUSTOMER_ID, rawRows);
  cart.addItem({ productId: "cookie", quantity: 1, unitPrice: 8 });

  await dao.replaceCartItems(CART_ID, mapper.toRows(cart));
  const persistedRows = await dao.findByCart(CART_ID);
  console.log("[Mapper] Linhas apos aplicar regras no dominio:", persistedRows);
}

main()
  .catch((error) => {
    console.error(
      "Falha ao executar demo de Data Mapper com Postgres. Certifique-se de que o banco esta disponivel e a tabela foi criada com db/schema.sql.",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePostgresPool();
  });
