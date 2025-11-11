class OrderNotifier {
  send() {
    throw new Error("Implementar em subclasses.");
  }
}

class BaseNotifier extends OrderNotifier {
  send() {
    // extension point for cross-cutting concerns such as logging or auditing
    return { channels: [] };
  }
}

class NotifierDecorator extends OrderNotifier {
  constructor(notifier) {
    super();
    this.notifier = notifier;
  }

  send(order) {
    return this.notifier.send(order);
  }
}

export class EmailNotifier extends NotifierDecorator {
  constructor(notifier, emailClient) {
    super(notifier);
    this.emailClient = emailClient;
  }

  send(order) {
    const result = super.send(order);
    this.emailClient.send({
      to: order.customerEmail,
      subject: `Pedido ${order.id} confirmado`,
      body: `Itens: ${order.items.length}`,
    });
    result.channels.push("email");
    return result;
  }
}

export class SmsNotifier extends NotifierDecorator {
  constructor(notifier, smsClient) {
    super(notifier);
    this.smsClient = smsClient;
  }

  send(order) {
    const result = super.send(order);
    this.smsClient.send({
      to: order.customerPhone,
      message: `Pedido ${order.id} saiu para entrega`,
    });
    result.channels.push("sms");
    return result;
  }
}

export class PushNotifier extends NotifierDecorator {
  constructor(notifier, pushClient) {
    super(notifier);
    this.pushClient = pushClient;
  }

  send(order) {
    const result = super.send(order);
    this.pushClient.send({
      to: order.customerDeviceId,
      message: `Pedido ${order.id} chegou!`,
    });
    result.channels.push("push");
    return result;
  }
}

export function buildNotifier(clients) {
  const base = new BaseNotifier();
  return new PushNotifier(new SmsNotifier(new EmailNotifier(base, clients.email), clients.sms), clients.push);
}
