## Design Patterns - Carrinho de Compras em Node.js/DDD

Projeto criado para responder ao questionario proposto, utilizando sempre o mesmo caso de uso: *um pedido/adicionamento de itens ao carrinho de compras de um cliente*. Todo o codigo roda em Node.js (ESM) e segue camadas inspiradas em Domain-Driven Design (DDD).

```bash
npm install   # nao ha dependencias externas, serve apenas para criar o package-lock
npm run demo  # demonstra DAO vs Mapper vs Repository
```

---

## 1. DAO x Data Mapper x Repository

### a) Comparacao conceitual

| Padrao        | Foco principal                                            | Conhece o dominio?                          | Quando usar                                                                 |
|---------------|-----------------------------------------------------------|---------------------------------------------|------------------------------------------------------------------------------|
| **DAO**       | Operacoes CRUD sobre uma tabela ou colecao especifica     | Nao. Trabalha com registros/linhas.         | Aplicacoes simples, sem regras ricas e sem necessidade de invariantes.      |
| **Data Mapper** | Traduz dados tabulares em objetos de dominio             | Parcial. Sabe montar objetos, mas nao aplica regras. | Quando ha diferenca relevante entre modelo relacional e objetos.            |
| **Repository** | Agrega regras de consistencia e trata agregados completos | Sim. Manipula agregados e invariantes DDD.  | Contextos com dominio rico, invariantes e necessidade de testes isolados.   |

### b) Diferencas em codigo

- **DAO**: `src/infrastructure/persistence/dao/InMemoryCartDAO.js` salva linhas puras e retorna arrays simples.
- **Data Mapper**: `src/infrastructure/persistence/mapper/CartDataMapper.js` converte essas linhas em `ShoppingCart`, mas quem chama ainda decide regras.
- **Repository**: `src/infrastructure/persistence/repository/InMemoryCartRepository.js` retorna o agregado completo, garante invariantes e persiste como unidade. O uso concreto esta em `src/application/use-cases/AddItemToCart.js` + `src/interfaces/cli/demo.js`.

Execute `npm run demo` para ver o contraste na pratica (DAO -> Mapper -> Repository usando o mesmo carrinho).

#### Opcao com Postgres real

1. Suba um banco (ex.: `docker run --rm -it -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`).
2. Crie a tabela executando `psql $DATABASE_URL -f db/schema.sql` (ou, se estiver usando o container acima, `docker exec -it <nome-do-container> psql -U postgres -f /docker-entrypoint-initdb.d/01-schema.sql` depois de copiar o arquivo).
3. Defina `DATABASE_URL` (padrao: `postgres://postgres:postgres@localhost:5432/design_patterns`).
4. Rode `npm run demo:repository:pg` para usar o `PostgresCartRepository` (`src/interfaces/cli/demo-postgres.js` + `src/infrastructure/persistence/postgres/**`).
5. Rode `npm run demo:mapper:pg` para ver o Data Mapper trabalhando diretamente com o Postgres (DAO + mapper sem repository).

### c) Agregado e invariantes

- Agregado: `ShoppingCart` (`src/domain/cart/ShoppingCart.js`) agrupa `CartItem`s e mantem regras como **maximo de 50 unidades** e **limite de credito do cliente**.
- Invariantes: metodo `addItem` valida quantidade total, valor total e consolida itens duplicados antes de emitir o evento de dominio `CartItemAdded`.
- Repository: `InMemoryCartRepository` lida apenas com o agregado `ShoppingCart`, garantindo que leituras e escritas acontecam com a unidade completa e mantendo a consistencia mencionada por Eric Evans.

---

## 2. Refactorings -> Strategy e Decorator

### Replace Conditional with Polymorphism -> Strategy

- Codigo legado cheio de `if/else`: `src/patterns/strategy/LegacyShippingCalculator.js`.
- Apos refatoracao Strategy: `src/patterns/strategy/ShippingStrategies.js` define pequenas estrategias (`DomesticLightStrategy`, `InternationalExpressStrategy`, etc.) escolhidas em tempo de execucao por `ShippingCalculatorContext`.

### Move Embellishment to Decorator -> Decorator

- Classe original com responsabilidades demais: `src/patterns/decorator/LegacyOrderNotifier.js`.
- Refatoracao para Decorator: `src/patterns/decorator/OrderNotifierDecorator.js`. Agora cada canal (email, SMS, push) e um *decorator* que acrescenta comportamento sem inchar a classe base, permitindo compor dinamicamente as notificacoes do pedido/carrinho.

---

## 3. Padroes GoF criticados atualmente

Codigo demonstrativo em `src/patterns/gof/Criticisms.js`.

1. **Singleton**  
   - Problema: `LegacyCartServiceSingleton` cria estado global e acoplado.  
   - Alternativa moderna: `CartService` recebe dependencias via injecao (DI) facilitando testes e multiplas instancias.
2. **Abstract Factory**  
   - Problema: `ShippingGatewayFactory` exige varias classes/interfaces apenas para instanciar objetos simples.  
   - Alternativa: funcao `buildShippingGateway` com mapa de provedores, simples e idiomatica em JS moderno.
3. **Prototype**  
   - Problema: `PrototypeCart` precisa de `clone()` complexo e depende de `structuredClone`.  
   - Alternativa: `copyCartTemplate` usa desestruturacao/`map`, suficiente na maioria dos contextos com GC e construtores ricos.

---

## 4. Observer classico x tecnologias atuais

Codigo em `src/patterns/observer`.

| Tecnologia escolhida | Como aparece no repositorio | Relacao com Observer classico |
|----------------------|-----------------------------|-------------------------------|
| **Node.js EventEmitter** | `EventEmitterObserver.js` usa `EventEmitter` publicando `cart:itemAdded`. | Implementacao 1->n ja pronta no runtime, ideal para infraestrutura/OS watchers. |
| **Reactive Streams (tipo RxJS)** | `ReactiveObserver.js` mostra um `MiniSubject` com `subscribe`/`next`. | Generaliza Observer para fluxos assincronos infinitos, base de RxJS, Reactor, Flow API. |
| **Pub/Sub brokers (Kafka, RabbitMQ, SNS)** | `PubSubObserver.js` simula um broker com topicos e handlers. | Estende Observer para nn via um *broker*, permitindo EDA, Event Sourcing e serverless triggers. |

O arquivo `ClassicObserver.js` contem a versao manual do padrao. Os tres exemplos provam como as plataformas modernas apenas especializam o mesmo conceito fundamental.

---

## Estrutura DDD resumida

- **Domain**: `src/domain/cart` (agregado, invariantes, eventos).
- **Application**: `src/application/use-cases/AddItemToCart.js`.
- **Infrastructure**: `src/infrastructure/persistence/**` com DAO, Mapper e Repository (in-memory) e `src/infrastructure/persistence/postgres/**` para Postgres real.
- **Interfaces**: `src/interfaces/cli/demo.js` (in-memory) e `src/interfaces/cli/demo-postgres.js` (Postgres) orquestram o caso de uso.
- **Patterns**: `src/patterns/**` guarda as respostas dos itens 2, 3 e 4.

### Demos adicionais

- `npm run demo:observer:rxjs` -> CLI `src/interfaces/cli/observer-rxjs.js` chama o fluxo RxJS definido em `src/patterns/observer/RxjsCartStreamDemo.js`.
- `npm run demo:observer:rabbit` -> CLI `src/interfaces/cli/observer-rabbit.js` executa o demo com RabbitMQ (`src/patterns/observer/RabbitMQObserverDemo.js`). Requer um broker local (ex.: `docker run -it --rm -p 5672:5672 rabbitmq:3`).
- `npm run demo:repository:pg` -> persiste o agregado no Postgres usando `PostgresCartRepository`.
- `npm run demo:mapper:pg` -> usa o `CartDataMapper` diretamente com o DAO Postgres, sem repository, para reforcar o item 1.
- `npm run demo:strategy` -> compara o calculo de frete com if/else e com Strategy (`src/interfaces/cli/demo-strategy.js`).
- `npm run demo:order:notify` -> integra o decorator de notificacao com a criacao do pedido e publica cada canal em uma fila RabbitMQ (`order-notifications` por padrao). Configure `RABBITMQ_URL`/`ORDER_NOTIFICATION_QUEUE` ou use o `docker compose up` (ou `docker run -it --rm -p 5672:5672 rabbitmq:3`).
- `npm run demo:order:full` -> demonstra o processo completo: repositorio (in-memory ou Postgres), Strategy de frete, Observer (RxJS + RabbitMQ) e Decorator publicando notificacoes no RabbitMQ. Ajuste `USE_POSTGRES=true` para trocar o backend do carrinho e `CART_EVENTS_QUEUE`/`ORDER_NOTIFICATION_QUEUE` para personalizar filas.
- `npm run demo:order:interactive` -> CLI interativa que coleta os dados do pedido (cliente, itens, destino), pergunta se deve usar Postgres, executa todo o pipeline e exibe os logs do RxJS e das publicacoes RabbitMQ diretamente no terminal. Use RabbitMQ ativo (`docker compose up` ou `docker run … rabbitmq:3`); opcionalmente defina `USE_POSTGRES=true` para salvar o carrinho no banco.
- `npm run consume:queues` -> consumidor simples que escuta as filas `order-notifications` e `cart-events` do RabbitMQ e imprime as mensagens conforme chegam. Ideal para acompanhar os pushs enviados pelos demos.
- `npm run consume:rxjs` -> consumidor separado para a fila de logs do RxJS (`rxjs-logs` por padrao, configuravel via `RXJS_LOG_QUEUE`), permitindo acompanhar os observers em um terminal dedicado.

### Rodando com Docker Compose

> Requisitos: Docker + Docker Compose v2.

1. `docker compose up --build` -> sobe app (executando `npm run demo`), Postgres e RabbitMQ. A tabela do carrinho e criada automaticamente via `db/schema.sql` (montado como `/docker-entrypoint-initdb.d/01-schema.sql`).
2. Para executar outro script dentro do container (ex.: demos com Postgres ou notificacoes) rode:  
   `docker compose run --rm app npm run demo:repository:pg`  
   `docker compose run --rm app npm run demo:mapper:pg`  
   `docker compose run --rm app npm run demo:order:notify`  
   `docker compose run --rm app npm run demo:order:full`  
   `docker compose run --rm app npm run demo:order:interactive`  
   `docker compose run --rm app npm run consume:queues`  
   `docker compose run --rm app npm run consume:rxjs`
3. Demos de observer tambem podem ser chamados via `docker compose run --rm app npm run demo:observer:rxjs` ou `...demo:observer:rabbit` usando os servicos do compose (`RABBITMQ_URL=amqp://rabbitmq`).
4. Para encerrar e liberar recursos: `docker compose down -v`.

Com isso, o mesmo caso de uso (pedido/carrinho) e utilizado para todas as comparacoes solicitadas.
