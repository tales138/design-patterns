import { getRabbitMQChannel, closeRabbitMQ } from "../../shared/messaging/rabbitmqConnection.js";

const NOTIFICATION_QUEUE = process.env.ORDER_NOTIFICATION_QUEUE ?? "order-notifications";
const CART_EVENTS_QUEUE = process.env.CART_EVENTS_QUEUE ?? "cart-events";

async function main() {
  const channel = await getRabbitMQChannel();
  await channel.assertQueue(NOTIFICATION_QUEUE, { durable: false });
  await channel.assertQueue(CART_EVENTS_QUEUE, { durable: false });

  console.log("Consumindo filas do RabbitMQ. Pressione CTRL+C para encerrar.");
  console.log(`- Notificacoes: ${NOTIFICATION_QUEUE}`);
  console.log(`- Eventos do carrinho: ${CART_EVENTS_QUEUE}`);

  // Consumidor para notificacoes disparadas pelo decorator
  channel.consume(
    NOTIFICATION_QUEUE,
    (msg) => {
      if (!msg) return;
      const payload = JSON.parse(msg.content.toString());
      console.log("[RabbitMQ][Notification]", payload);
      channel.ack(msg);
    },
    { noAck: false },
  );

  // Consumidor para eventos de dominio enviados pelo Observer -> Rabbit
  channel.consume(
    CART_EVENTS_QUEUE,
    (msg) => {
      if (!msg) return;
      const payload = JSON.parse(msg.content.toString());
      console.log("[RabbitMQ][CartEvent]", payload);
      channel.ack(msg);
    },
    { noAck: false },
  );

  const shutdown = async () => {
    console.log("\nEncerrando consumidor...");
    await closeRabbitMQ();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(async (error) => {
  console.error("Falha ao consumir filas. Verifique RABBITMQ_URL.");
  console.error(error);
  await closeRabbitMQ();
  process.exitCode = 1;
});
