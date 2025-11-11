import amqp from "amqplib";

const QUEUE = "cart-events-demo";
const AMQP_URL = process.env.RABBITMQ_URL ?? "amqp://localhost";

/**
 * Demonstra observer via RabbitMQ. Precisa de um broker local:
 * docker run -it --rm -p 5672:5672 rabbitmq:3
 */
export async function runRabbitObserverDemo() {
  let connection;
  try {
    connection = await amqp.connect(AMQP_URL);
  } catch (error) {
    console.error("Nao foi possivel conectar no RabbitMQ:", error.message);
    console.error("Certifique-se de ter um broker rodando em", AMQP_URL);
    return;
  }

  const channel = await connection.createChannel();
  await channel.assertQueue(QUEUE, { durable: false });

  await channel.consume(
    QUEUE,
    (msg) => {
      if (!msg) {
        return;
      }

      const event = JSON.parse(msg.content.toString());
      console.log("[RabbitMQ][Consumer]", event);
      channel.ack(msg);
    },
    { noAck: false },
  );

  const event = { type: "ITEM_ADDED", payload: { cartId: "cart-queue", productId: "tea", quantity: 1 } };
  channel.sendToQueue(QUEUE, Buffer.from(JSON.stringify(event)));
  console.log("[RabbitMQ][Producer] Evento enviado:", event);

  setTimeout(async () => {
    await channel.close();
    await connection.close();
  }, 1500);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runRabbitObserverDemo().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
