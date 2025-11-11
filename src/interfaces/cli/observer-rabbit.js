import { runRabbitObserverDemo } from "../../patterns/observer/RabbitMQObserverDemo.js";

// Demonstra o Observer evoluindo para Pub/Sub com RabbitMQ real
runRabbitObserverDemo().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
