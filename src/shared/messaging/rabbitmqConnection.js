import amqp from "amqplib";

let connection;
let channel;

export async function getRabbitMQChannel(url = process.env.RABBITMQ_URL ?? "amqp://localhost") {
  if (!channel) {
    connection = await amqp.connect(url);
    channel = await connection.createChannel();
  }
  return channel;
}

export async function closeRabbitMQ() {
  if (channel) {
    await channel.close();
    channel = undefined;
  }
  if (connection) {
    await connection.close();
    connection = undefined;
  }
}
