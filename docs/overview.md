## Visao Tecnica Geral

Este overview detalha como cada requisito do questionario foi atendido, quais decisoes tecnicas sustentam as solucoes e como reproduzir os demos. Tudo gira em torno de um unico agregado `ShoppingCart` para garantir comparabilidade entre os padroes.

---

## Arquitetura DDD e Fluxo do Caso de Uso

1. **Interfaces (CLI demos)**  
   - Scripts `npm run demo*`/`make` instanciam as dependencias corretas (ex.: repository em memoria ou Postgres) e chamam o caso de uso `AddItemToCart`.  
   - Mantem a camada de apresentacao simples e focada em demonstracao.

2. **Application**  
   - `src/application/use-cases/AddItemToCart.js` orquestra `CartRepository`.  
   - Respeita o padrao DDD: recuperar agregado completo, executar comportamento, salvar o agregado como unidade.

3. **Domain**  
   - `ShoppingCart` encapsula invariantes (max 50 unidades, limite de credito, mescla de itens iguais) e gera eventos `CartItemAdded`.  
   - `CartItem` valida dados criticos e provê metodos de apoio (`total`, `mergeQuantity`).

4. **Infrastructure**  
   - DAO/Mapper/Repository em memoria (`src/infrastructure/persistence/**`).  
   - Adaptador IDêntico para Postgres (`src/infrastructure/persistence/postgres/**`) usando `pg`.  
   - `src/shared/database/postgresPool.js` garante pool unico e reaproveitavel.

Essa separacao permite alternar mecanismos de persistencia e demonstra como DDD facilita a comparacao entre padroes.

---

## Questao 1 – DAO vs Data Mapper vs Repository

### Implementacao

- **DAO** (`src/infrastructure/persistence/dao/InMemoryCartDAO.js`)  
  - Opera linhas simples em um `Map`.  
  - Responsavel apenas por `insert`/`find`. Nenhum conhecimento de regras.

- **Data Mapper** (`src/infrastructure/persistence/mapper/CartDataMapper.js`)  
  - Converte registros DAO em `ShoppingCart` + `CartItem`.  
  - Ainda deixa ao chamador a responsabilidade de aplicar invariantes.

- **Repository** (`src/infrastructure/persistence/repository/InMemoryCartRepository.js`)  
  - Oculta DAO + mapper e devolve o agregado completo.  
  - Faz cache simples para evitar reconstrucoes repetidas.  
  - `save` substitui todo o carrinho de uma vez, mantendo consistencia.

### Agregado e invariantes

- `ShoppingCart.addItem` executa toda a logica de negocio:  
  - checa `MAX_ITEMS`;  
  - verifica limite de credito;  
  - mescla itens repetidos;  
  - registra evento em `domainEvents`.  
- `AddItemToCart` garante que consumidores sempre passem pelo agregado, preservando invariantes e dando suporte a eventos para outras camadas (ex.: Observer).

### Banco real (Postgres)

- `src/infrastructure/persistence/postgres/PostgresCartDAO.js` faz `SELECT` e transacoes `DELETE + INSERT`.  
- `PostgresCartRepository` reaproveita o `CartDataMapper`, provando que o padrao repository isola detalhes de armazenamento.  
- `db/schema.sql` registra a definicao da tabela.  
- `src/interfaces/cli/demo-postgres.js` + script `npm run demo:repository:pg` exibem o mesmo fluxo usando Postgres.  
- `src/interfaces/cli/demo-data-mapper-pg.js` + `npm run demo:mapper:pg` demonstram o Data Mapper ligado diretamente ao DAO Postgres (sem repository), reforcando o item 1.b.  
- Variavel `DATABASE_URL` controla a conexao; docker-compose sobe Postgres com schema aplicado automaticamente.

Conclusao: o mesmo caso de uso ilustra claramente a diferenca entre operacoes CRUD (DAO), traducao objeto-DB (Mapper) e agregados completos (Repository) conforme descrito por Eric Evans.

---

## Questao 2 – Refatoracoes (Kerievsky)

### Replace Conditional with Polymorphism -> Strategy

- **Antes**: `src/patterns/strategy/LegacyShippingCalculator.js` continha `if/else` para combinacoes de destino/peso/prioridade. Extender uma nova regra exigia editar condicoes existentes, arriscando regressao.  
- **Depois**: `src/patterns/strategy/ShippingStrategies.js` define uma classe base e quatro estrategias concretas (DomesticLight, DomesticHeavy, InternationalEconomy, InternationalExpress). `ShippingCalculatorContext` escolhe a estrategia com `find`.  
- **Resultado**:  
  - adicionar nova regra = criar nova classe sem tocar nas demais;  
  - cada estrategia tem unica responsabilidade;  
  - fica simples aplicar testes unitarios e injetar estrategias personalizadas.

Demo associado: `src/interfaces/cli/demo-strategy.js` (`npm run demo:strategy`) imprime o custo calculado pelo codigo legado versus o Strategy para diferentes pedidos, evidenciando o ganho da refatoracao.

### Move Embellishment to Decorator -> Decorator

- **Antes**: `src/patterns/decorator/LegacyOrderNotifier.js` cuidava de email, SMS e push. Habilitar/desabilitar canais exigia varios `if`s e parametro de configuracao complexo.  
- **Depois**: `src/patterns/decorator/OrderNotifierDecorator.js` cria `OrderNotifier` abstrato, `BaseNotifier` e decorators especificos (`EmailNotifier`, `SmsNotifier`, `PushNotifier`). `buildNotifier` compõe dinamicamente os canais.  
- **Resultado**:  
  - cada canal pode ser ligado/desligado por composicao;  
  - open/closed principle: novos canais nao alteram o codigo existente;  
  - facilita extensoes (ex.: decorator que registra auditoria).

Ambas refatoracoes usam o mesmo contexto do pedido do carrinho, ligando o desafio teorico com o dominio da aplicacao.

---

## Questao 3 – Criticas a Padroes GoF em Desuso

Implementacoes em `src/patterns/gof/Criticisms.js`:

1. **Singleton**  
   - `LegacyCartServiceSingleton` demonstra o antipadrao: instancia global estatica, dificulta testes e promove acoplamento.  
   - `CartService` com injecao via construtor mostra a alternativa moderna (DI/IoC). Facilita multiplas instancias e testes isolados.

2. **Abstract Factory**  
   - Exemplo tradicional `ShippingGatewayFactory` exige uma classe inteira para apenas escolher entre “fast” e “cheap”.  
   - Solucao moderna `buildShippingGateway` usa um mapa de funcoes, alavancando os recursos da linguagem e frameworks DI. Menos verbosidade e menor risco de overengineering.

3. **Prototype**  
   - `PrototypeCart` implementa `clone()` com `structuredClone`, ilustrando o custo de manter clones profundos.  
   - `copyCartTemplate` com spread + `map` atende o mesmo proposito na maioria dos sistemas com GC, reforcando porque Prototype raramente e necessario hoje.

Assim, cada critica teorica e sustentada com codigo pratico ligado ao dominio.

---

## Questao 4 – Observer em Tecnologias Modernas

Objetivo: mostrar que Observer classico e a base para Pub/Sub, reatividade e arquiteturas orientadas a eventos.

- **Observer classico**: `src/patterns/observer/ClassicObserver.js` implementa `Subject`, `Observer` e um `demo` simples.  
- **EventEmitter (Node)**: `EventEmitterObserver.js` usa a API nativa (`emitter.on/emit`). Demonstra listeners 1->N dentro do runtime JS.  
- **Reactive (RxJS)**: `RxjsCartStreamDemo.js` cria um `Subject` e aplica `filter`/`map` para montar fluxos especializados (expedicao vs faturamento). Mostra o salto para streams assincronas continuas.  
- **Pub/Sub Broker**:  
  - `PubSubObserver.js` implementa um broker simples com topicos e handlers.  
  - `RabbitMQObserverDemo.js` integra com `amqplib`, simulando um ambiente EDA real (fila, ack, producer/consumer).  
- **Mini reactive**: `ReactiveObserver.js` traz um subject minimalista para reforcar o conceito.

Esses exemplos se alinham com a lista de tecnologias citadas na pergunta (EventEmitter, Pub/Sub, ReactiveX, RabbitMQ etc.), provando que todas compartilham a mesma raiz conceitual.

---

## Demos e Automacao

| Comando | Ambiente | Objetivo tecnico | Arquivos envolvidos |
|---------|----------|------------------|---------------------|
| `npm run demo` / `make demo` | Node local | Demonstrar DAO x Mapper x Repository e eventos. | `src/interfaces/cli/demo.js`, repos em memoria |
| `npm run demo:repository:pg` / `make demo-pg` | Node + Postgres | Persistencia real com `pg`, usando o mesmo agregado. | `src/interfaces/cli/demo-postgres.js`, `postgres/*.js` |
| `npm run demo:mapper:pg` / `make demo-mapper-pg` | Node + Postgres | Demonstra Data Mapper + DAO Postgres sem repository. | `src/interfaces/cli/demo-data-mapper-pg.js`, `CartDataMapper`, `PostgresCartDAO` |
| `npm run demo:strategy` / `make demo-strategy` | Node local | Compara if/else legado com Strategy no calculo de frete. | `src/interfaces/cli/demo-strategy.js`, `src/patterns/strategy/*` |
| `npm run demo:observer:rxjs` / `make observer-rxjs` | Node local | Observer -> RxJS. | CLI `src/interfaces/cli/observer-rxjs.js` + `src/patterns/observer/RxjsCartStreamDemo.js` |
| `npm run demo:observer:rabbit` / `make observer-rabbit` | Node + RabbitMQ | Observer -> Pub/Sub broker real. | CLI `src/interfaces/cli/observer-rabbit.js` + `src/patterns/observer/RabbitMQObserverDemo.js` |
| `docker compose up --build` / `make docker-up` | Docker | Sobe app, Postgres e RabbitMQ; roda `npm run demo`. | `Dockerfile`, `docker-compose.yml` |
| `docker compose run --rm app <script>` / `make docker-*` | Docker | Executa qualquer script dentro do container, reaproveitando os servicos (env `DATABASE_URL`, `RABBITMQ_URL`). | Mesmo que acima |

Todos os comandos podem ser chamados diretamente via CLI ou encapsulados com o `Makefile`.

---

## Ambiente e Variaveis

- **Node**: `>=18`, projeto ESM.  
- **Dependencias principais**: `pg`, `amqplib`, `rxjs`.  
- **Variaveis**:  
  - `DATABASE_URL` (default: `postgres://postgres:postgres@localhost:5432/design_patterns`).  
  - `RABBITMQ_URL` (default: `amqp://localhost`, alterado para `amqp://rabbitmq` no docker-compose).  
  - `PGSSL` para habilitar SSL em ambientes gerenciados.  
- **Docker Compose**: aplica `db/schema.sql` automaticamente (montado em `/docker-entrypoint-initdb.d/`) e expõe portas padrao (5432, 5672). O container `app` já vem com as variaveis configuradas.

---

## Extensoes Planejadas

1. Popular `src/domain/cart/events` com classes/handlers concretos.  
2. Adicionar testes automatizados para o agregado, estrategias e decorators.  
3. Criar uma camada HTTP (REST/GraphQL) reutilizando os casos de uso.  
4. Introduzir uma ferramenta de migrations (p.ex. `node-pg-migrate`) para evolucao controlada do schema.

---

Graças a essas implementacoes, o projeto cobre todas as perguntas: comparacoes DAO/Mapper/Repository e agregados DDD, refatoracoes Strategy/Decorator, criticas a padroes GoF antiquados e demonstracoes do Observer em tecnologias modernas, tudo usando o mesmo dominio de carrinho de compras e reproduzivel via CLI, Docker ou Makefile.
