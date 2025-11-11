import { AddItemToCart } from "../../application/use-cases/AddItemToCart.js";
import { InMemoryCartDAO } from "../../infrastructure/persistence/dao/InMemoryCartDAO.js";
import { CartDataMapper } from "../../infrastructure/persistence/mapper/CartDataMapper.js";
import { InMemoryCartRepository } from "../../infrastructure/persistence/repository/InMemoryCartRepository.js";
import { PostgresCartDAO } from "../../infrastructure/persistence/postgres/PostgresCartDAO.js";
import { PostgresCartRepository } from "../../infrastructure/persistence/postgres/PostgresCartRepository.js";
import { ShippingCalculatorContext } from "../../patterns/strategy/ShippingStrategies.js";
import { buildNotifier } from "../../patterns/decorator/OrderNotifierDecorator.js";
import { RabbitNotificationClient } from "../../infrastructure/notifications/RabbitNotificationClient.js";
import { createCartEventStream } from "../../patterns/observer/RxjsCartStreamDemo.js";
import { getRabbitMQChannel, closeRabbitMQ } from "../../shared/messaging/rabbitmqConnection.js";
import { getPostgresPool, closePostgresPool } from "../../shared/database/postgresPool.js";

const CART_ID = "full-demo-cart";
const CUSTOMER_ID = "full-demo-customer";
const NOTIFICATION_QUEUE = process.env.ORDER_NOTIFICATION_QUEUE ?? "order-notifications";
const CART_EVENTS_QUEUE = process.env.CART_EVENTS_QUEUE ?? "cart-events";

async function buildRepository() {
  if (process.env.USE_POSTGRES === "true") {
    const pool = getPostgresPool();
    const dao = new PostgresCartDAO(pool);
    const repository = new PostgresCartRepository({ dao });
    return {
      repository,
      cleanup: async () => {
        await closePostgresPool();
      },
    };
  }

  const repository = new InMemoryCartRepository({ dao: new InMemoryCartDAO(), mapper: new CartDataMapper() });
  return {
    repository,
    cleanup: async () => {},
  };
}

async function main() {
  const { repository, cleanup } = await buildRepository();
  const addItemToCart = new AddItemToCart(repository);

  // 1) Construi o pedido adicionando itens ao agregado
  await addItemToCart.execute({
    cartId: CART_ID,
    customerId: CUSTOMER_ID,
    item: { productId: "espresso", quantity: 2, unitPrice: 12 },
  });
  await addItemToCart.execute({
    cartId: CART_ID,
    customerId: CUSTOMER_ID,
    item: { productId: "cookie", quantity: 3, unitPrice: 6 },
  });
  await addItemToCart.execute({
    cartId: CART_ID,
    customerId: CUSTOMER_ID,
    item: { productId: "cold-brew", quantity: 1, unitPrice: 18 },
  });

  const cart = await repository.getById(CART_ID, CUSTOMER_ID);

  // 2) Calcula frete aplicando Strategy
  const shippingContext = new ShippingCalculatorContext();
  const shippingCost = shippingContext.calculate({
    destination: "domestic",
    totalWeight: cart.totalUnits,
  });

  const order = {
    id: `order-${Date.now()}`,
    customerEmail: "customer@example.com",
    customerPhone: "+55 11 99999-9999",
    customerDeviceId: "device-xyz",
    items: cart.items,
    total: cart.totalValue,
    shippingCost,
  };

  console.log("Pedido criado:", {
    totalItems: cart.totalUnits,
    subtotal: cart.totalValue,
    shippingCost,
  });

  const domainEvents = cart.pullDomainEvents();

  // 3) Usa Observer (RxJS) para processar os eventos do agregado
  const { subject, shippingStream, billingStream } = createCartEventStream();
  const shippingSubscription = shippingStream.subscribe((event) => console.log("[RxJS][Shipping]", event.message));
  const billingSubscription = billingStream.subscribe((event) => console.log("[RxJS][Billing]", event.message));
  domainEvents.forEach((event) => subject.next(event));
  shippingSubscription.unsubscribe();
  billingSubscription.unsubscribe();

  // 4) Integra RabbitMQ para notificacoes (Decorator) e eventos (Observer -> broker)
  const channel = await getRabbitMQChannel();
  await channel.assertQueue(NOTIFICATION_QUEUE, { durable: false });
  await channel.assertQueue(CART_EVENTS_QUEUE, { durable: false });

  const notifier = buildNotifier({
    email: new RabbitNotificationClient(channel, { queue: NOTIFICATION_QUEUE, channelType: "email" }),
    sms: new RabbitNotificationClient(channel, { queue: NOTIFICATION_QUEUE, channelType: "sms" }),
    push: new RabbitNotificationClient(channel, { queue: NOTIFICATION_QUEUE, channelType: "push" }),
  });
  notifier.send(order);
  console.log(`Decorator -> notificacoes publicadas na fila ${NOTIFICATION_QUEUE}.`);

  domainEvents.forEach((event) => {
    channel.sendToQueue(CART_EVENTS_QUEUE, Buffer.from(JSON.stringify(event)));
  });
  console.log(`Observer -> ${domainEvents.length} eventos enviados para a fila ${CART_EVENTS_QUEUE}.`);

  await cleanup();
  await closeRabbitMQ();
}

main().catch(async (error) => {
  console.error("Falha ao executar demo completo. Verifique Postgres (se USE_POSTGRES=true) e RabbitMQ.");
  console.error(error);
  await closeRabbitMQ();
  process.exitCode = 1;
});
