import { AddItemToCart } from "../../application/use-cases/AddItemToCart.js";
import { InMemoryCartDAO } from "../../infrastructure/persistence/dao/InMemoryCartDAO.js";
import { CartDataMapper } from "../../infrastructure/persistence/mapper/CartDataMapper.js";
import { InMemoryCartRepository } from "../../infrastructure/persistence/repository/InMemoryCartRepository.js";
import { RabbitNotificationClient } from "../../infrastructure/notifications/RabbitNotificationClient.js";
import { buildNotifier } from "../../patterns/decorator/OrderNotifierDecorator.js";
import { closeRabbitMQ, getRabbitMQChannel } from "../../shared/messaging/rabbitmqConnection.js";

const QUEUE = process.env.ORDER_NOTIFICATION_QUEUE ?? "order-notifications";

async function main() {
  // 1) Cria o pedido usando o caso de uso existente (in-memory para simplicidade)
  const repository = new InMemoryCartRepository({ dao: new InMemoryCartDAO(), mapper: new CartDataMapper() });
  const addItemToCart = new AddItemToCart(repository);

  await addItemToCart.execute({
    cartId: "cart-notify",
    customerId: "customer-notify",
    item: { productId: "espresso", quantity: 2, unitPrice: 12 },
  });
  await addItemToCart.execute({
    cartId: "cart-notify",
    customerId: "customer-notify",
    item: { productId: "cookie", quantity: 1, unitPrice: 8 },
  });

  const cart = await repository.getById("cart-notify", "customer-notify");

  const order = {
    id: `order-${Date.now()}`,
    customerEmail: "customer@example.com",
    customerPhone: "+55 11 99999-9999",
    customerDeviceId: "device-123",
    items: cart.items,
    total: cart.totalValue,
  };

  // 2) Configura o RabbitMQ para publicar as notificacoes
  const channel = await getRabbitMQChannel();
  await channel.assertQueue(QUEUE, { durable: false });

  const notifier = buildNotifier({
    email: new RabbitNotificationClient(channel, { queue: QUEUE, channelType: "email" }),
    sms: new RabbitNotificationClient(channel, { queue: QUEUE, channelType: "sms" }),
    push: new RabbitNotificationClient(channel, { queue: QUEUE, channelType: "push" }),
  });

  const result = notifier.send(order);
  console.log(`Notificacoes enviadas via Decorator. Canais: ${result.channels.join(", ")}.`);
  console.log(`Mensagens publicadas na fila RabbitMQ "${QUEUE}".`);
}

main()
  .catch((error) => {
    console.error("Falha ao executar demo de notificacao com RabbitMQ. Certifique-se de ter um broker ativo.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeRabbitMQ();
  });
