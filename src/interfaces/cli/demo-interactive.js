import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { AddItemToCart } from "../../application/use-cases/AddItemToCart.js";
import { InMemoryCartDAO } from "../../infrastructure/persistence/dao/InMemoryCartDAO.js";
import { CartDataMapper } from "../../infrastructure/persistence/mapper/CartDataMapper.js";
import { InMemoryCartRepository } from "../../infrastructure/persistence/repository/InMemoryCartRepository.js";
import { PostgresCartDAO } from "../../infrastructure/persistence/postgres/PostgresCartDAO.js";
import { PostgresCartRepository } from "../../infrastructure/persistence/postgres/PostgresCartRepository.js";
import { ShippingCalculatorContext } from "../../patterns/strategy/ShippingStrategies.js";
import { createCartEventStream } from "../../patterns/observer/RxjsCartStreamDemo.js";
import { buildNotifier } from "../../patterns/decorator/OrderNotifierDecorator.js";
import { RabbitNotificationClient } from "../../infrastructure/notifications/RabbitNotificationClient.js";
import { getPostgresPool, closePostgresPool } from "../../shared/database/postgresPool.js";
import { getRabbitMQChannel, closeRabbitMQ } from "../../shared/messaging/rabbitmqConnection.js";

const NOTIFICATION_QUEUE = process.env.ORDER_NOTIFICATION_QUEUE ?? "order-notifications";
const CART_EVENTS_QUEUE = process.env.CART_EVENTS_QUEUE ?? "cart-events";
const RXJS_LOG_QUEUE = process.env.RXJS_LOG_QUEUE ?? "rxjs-logs";

// Utilidades simples para interagir com o usuario e garantir defaults
async function askYesNo(rl, question, defaultValue = false) {
  const suffix = defaultValue ? " (Y/n): " : " (y/N): ";
  const answer = (await rl.question(question + suffix)).trim();
  if (!answer) return defaultValue;
  return /^y(es)?$/i.test(answer);
}

async function askNumber(rl, question, defaultValue) {
  const suffix = defaultValue !== undefined ? ` (default ${defaultValue}): ` : ": ";
  const answer = (await rl.question(question + suffix)).trim();
  if (!answer && defaultValue !== undefined) return defaultValue;
  const parsed = Number(answer);
  if (Number.isNaN(parsed)) {
    console.log("Valor invalido, usando default.");
    return defaultValue;
  }
  return parsed;
}

async function askString(rl, question, defaultValue = "") {
  const suffix = defaultValue ? ` (default ${defaultValue}): ` : ": ";
  const answer = (await rl.question(question + suffix)).trim();
  return answer || defaultValue;
}

// Permite alternar entre repositorio em memoria e Postgres sem duplicar logica
async function buildRepository(usePostgres) {
  if (usePostgres) {
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

// Pergunta repetidamente os itens do pedido ate o usuario parar
async function main() {
  const rl = readline.createInterface({ input, output });
  let cleanupRepo = async () => {};
  try {
    console.log("=== Demo interativo de criacao de pedido ===");

    const usePostgres = await askYesNo(rl, "Usar Postgres?", false);
    const customerEmail = await askString(rl, "Email do cliente", "customer@example.com");
    const customerPhone = await askString(rl, "Telefone do cliente", "+55 11 99999-9999");
    const customerDeviceId = await askString(rl, "Device ID para push", "device-123");
    const destination = await askString(rl, "Destino (domestic/international)", "domestic");
    const priority = destination === "international" ? await askString(rl, "Prioridade (economy/express)", "economy") : undefined;

    const cartId = `cli-cart-${Date.now()}`;
    const { repository, cleanup } = await buildRepository(usePostgres);
    cleanupRepo = cleanup;
    const addItemToCart = new AddItemToCart(repository);

    const channel = await getRabbitMQChannel();
    await channel.assertQueue(NOTIFICATION_QUEUE, { durable: false });
    await channel.assertQueue(CART_EVENTS_QUEUE, { durable: false });
    await channel.assertQueue(RXJS_LOG_QUEUE, { durable: false });
    await channel.purgeQueue(NOTIFICATION_QUEUE);
    await channel.purgeQueue(CART_EVENTS_QUEUE);
    await channel.purgeQueue(RXJS_LOG_QUEUE);

    const rxLogs = [];
    let rxLogSequence = 0;
    const emitRxLog = (line) => {
      rxLogSequence += 1;
      rxLogs.push(line);
      channel.sendToQueue(
        RXJS_LOG_QUEUE,
        Buffer.from(
          JSON.stringify({
            log: line,
            emittedAt: new Date().toISOString(),
            sequence: rxLogSequence,
          }),
        ),
      );
    };
    const { subject, shippingStream, billingStream, rawStream } = createCartEventStream();
    const rawSubscription = rawStream.subscribe((event) =>
      emitRxLog(`[RxJS][Timeline][${event.type}] ${JSON.stringify(event.payload ?? {})}`),
    );
    const shippingSubscription = shippingStream.subscribe((event) => emitRxLog(`[RxJS][Shipping] ${event.message}`));
    const billingSubscription = billingStream.subscribe((event) => emitRxLog(`[RxJS][Billing] ${event.message}`));

    subject.next({
      type: "ORDER_STARTED",
      payload: { cartId, customerEmail, startedAt: new Date().toISOString() },
    });

    const collectedEvents = [];
    let itemIndex = 0;
    let addMore = true;
    while (addMore) {
      const productId = await askString(rl, "Produto (ex.: espresso)", `item-${itemIndex + 1}`);
      const quantity = await askNumber(rl, "Quantidade", 1);
      const unitPrice = await askNumber(rl, "Preco unitario", 10);
      const item = { productId, quantity, unitPrice };

      const updatedCart = await addItemToCart.execute({
        cartId,
        customerId: customerEmail,
        item,
      });
      const itemEvents = updatedCart.pullDomainEvents();
      collectedEvents.push(...itemEvents);
      if (itemEvents.length) {
        itemEvents.map(toObserverEvent).forEach((event) => subject.next(event));
      } else {
        subject.next({
          type: "ITEM_REGISTERED",
          payload: { cartId, productId, quantity, unitPrice, note: "Sem eventos especificos" },
        });
      }

      itemIndex += 1;
      addMore = await askYesNo(rl, "Adicionar outro item?", false);
    }

    if (itemIndex === 0) {
      console.log("Nenhum item informado. Abortando demo.");
      return;
    }

    const cart = await repository.getById(cartId, customerEmail);

    const shippingContext = new ShippingCalculatorContext();
    const shippingCost = shippingContext.calculate({
      destination,
      priority,
      totalWeight: cart.totalUnits,
    });

    const order = {
      id: `order-${Date.now()}`,
      customerEmail,
      customerPhone,
      customerDeviceId,
      items: cart.items,
      total: cart.totalValue,
      shippingCost,
      destination,
      priority,
    };

    console.log("\nResumo do pedido:");
    console.log(`Itens: ${cart.totalUnits} | Subtotal: ${cart.totalValue.toFixed(2)} | Frete (Strategy): ${shippingCost.toFixed(2)}`);

    const domainEvents = collectedEvents;
    console.log(`Eventos de dominio gerados: ${domainEvents.length}`);

    rawSubscription.unsubscribe();
    shippingSubscription.unsubscribe();
    billingSubscription.unsubscribe();

    // RabbitMQ reproduz o Observer generalizado e o Decorator real
    const notifier = buildNotifier({
      email: new RabbitNotificationClient(channel, { queue: NOTIFICATION_QUEUE, channelType: "email" }),
      sms: new RabbitNotificationClient(channel, { queue: NOTIFICATION_QUEUE, channelType: "sms" }),
      push: new RabbitNotificationClient(channel, { queue: NOTIFICATION_QUEUE, channelType: "push" }),
    });
    notifier.send(order);

    domainEvents.forEach((event) => channel.sendToQueue(CART_EVENTS_QUEUE, Buffer.from(JSON.stringify(event))));

    const notificationMessages = [];
    let msg;
    while ((msg = await channel.get(NOTIFICATION_QUEUE, { noAck: true }))) {
      notificationMessages.push(JSON.parse(msg.content.toString()));
    }

    const eventMessages = [];
    while ((msg = await channel.get(CART_EVENTS_QUEUE, { noAck: true }))) {
      eventMessages.push(JSON.parse(msg.content.toString()));
    }


    console.log("\nDemo completo finalizado com sucesso.");
  } catch (error) {
    console.error("Falha ao executar o demo interativo. Verifique se RabbitMQ e Postgres (quando selecionado) estao disponiveis.");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await cleanupRepo();
    await closeRabbitMQ();
    rl.close();
  }
}

main();
function toObserverEvent(domainEvent) {
  switch (domainEvent.name) {
    case "CartItemAdded":
      return { type: "ITEM_ADDED", payload: domainEvent.payload };
    default:
      return { type: domainEvent.name, payload: domainEvent.payload };
  }
}
