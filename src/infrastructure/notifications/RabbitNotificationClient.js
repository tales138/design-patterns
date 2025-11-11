export class RabbitNotificationClient {
  constructor(channel, { queue, channelType }) {
    this.channel = channel;
    this.queue = queue;
    this.channelType = channelType;
  }

  send(message) {
    // Cada mensagem leva metadados minimos para identificar o canal e horario
    const payload = {
      channel: this.channelType,
      sentAt: new Date().toISOString(),
      ...message,
    };
    this.channel.sendToQueue(this.queue, Buffer.from(JSON.stringify(payload)));
  }
}
