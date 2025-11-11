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
- **Infrastructure**: `src/infrastructure/persistence/**` com DAO, Mapper e Repository.
- **Interfaces**: `src/interfaces/cli/demo.js` orquestra o caso de uso.
- **Patterns**: `src/patterns/**` guarda as respostas dos itens 2, 3 e 4.

### Demos Observer com bibliotecas reais

- `npm run demo:observer:rxjs` -> usa um `Subject` do RxJS em `src/patterns/observer/RxjsCartStreamDemo.js`.
- `npm run demo:observer:rabbit` -> publica e consome eventos via RabbitMQ com `amqplib` (`src/patterns/observer/RabbitMQObserverDemo.js`). Requer um broker local (ex.: `docker run -it --rm -p 5672:5672 rabbitmq:3`).

Com isso, o mesmo caso de uso (pedido/carrinho) e utilizado para todas as comparacoes solicitadas.
