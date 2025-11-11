/**
 * Classe "inchada" antes da refatoracao.
 */
export class LegacyOrderNotifier {
  constructor({ emailClient, smsClient, pushClient }) {
    this.emailClient = emailClient;
    this.smsClient = smsClient;
    this.pushClient = pushClient;
  }

  notify(order, channels = { email: true, sms: true, push: true }) {
    if (channels.email) {
      this.emailClient.send({
        to: order.customerEmail,
        subject: `Pedido ${order.id} confirmado`,
        body: `Itens: ${order.items.length}`,
      });
    }

    if (channels.sms) {
      this.smsClient.send({
        to: order.customerPhone,
        message: `Pedido ${order.id} saiu para entrega`,
      });
    }

    if (channels.push) {
      this.pushClient.send({
        to: order.customerDeviceId,
        message: `Pedido ${order.id} chegou!`,
      });
    }
  }
}
