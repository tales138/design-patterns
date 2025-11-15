import { demoPubSubObserver } from "../../patterns/observer/PubSubObserver.js";

function runPubSubDemo() {
  const received = demoPubSubObserver();
  console.log("[PubSub][Received]", received);
}

runPubSubDemo();
