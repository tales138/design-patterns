import { getRabbitMQChannel, closeRabbitMQ } from "../../shared/messaging/rabbitmqConnection.js";

const RXJS_LOG_QUEUE = process.env.RXJS_LOG_QUEUE ?? "rxjs-logs";

async function main() {
  const channel = await getRabbitMQChannel();
  await channel.assertQueue(RXJS_LOG_QUEUE, { durable: false });

  console.log(`Consumindo logs RxJS da fila "${RXJS_LOG_QUEUE}". CTRL+C para sair.`);

  channel.consume(
    RXJS_LOG_QUEUE,
    (msg) => {
      if (!msg) {
        return;
      }
      const payload = JSON.parse(msg.content.toString());
      console.log("[RxJS][Queue]", payload);
      channel.ack(msg);
    },
    { noAck: false },
  );

  const shutdown = async () => {
    console.log("\nEncerrando consumidor RxJS...");
    await closeRabbitMQ();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(async (error) => {
  console.error("Falha ao consumir logs RxJS. Verifique RABBITMQ_URL/RXJS_LOG_QUEUE.");
  console.error(error);
  await closeRabbitMQ();
  process.exitCode = 1;
});
