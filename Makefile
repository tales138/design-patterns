SHELL := /bin/sh

.PHONY: install demo demo-pg demo-mapper-pg demo-strategy demo-order-notify demo-order-full demo-order-interactive consume-queues consume-rxjs observer-rxjs observer-rabbit docker-up docker-down docker-demo docker-demo-pg docker-demo-mapper-pg docker-demo-strategy docker-demo-order-notify docker-demo-order-full docker-demo-order-interactive docker-consume-queues docker-consume-rxjs docker-observer-rabbit docker-observer-rxjs

install:
	npm install

demo:
	npm run demo

demo-pg:
	npm run demo:repository:pg

demo-mapper-pg:
	npm run demo:mapper:pg

demo-strategy:
	npm run demo:strategy

demo-order-notify:
	npm run demo:order:notify

demo-order-full:
	npm run demo:order:full

demo-order-interactive:
	npm run demo:order:interactive

consume-queues:
	npm run consume:queues

consume-rxjs:
	npm run consume:rxjs
observer-rxjs:
	npm run demo:observer:rxjs

observer-rabbit:
	npm run demo:observer:rabbit

docker-up:
	docker compose up --build

docker-down:
	docker compose down -v

docker-demo:
	docker compose run --rm app npm run demo

docker-demo-pg:
	docker compose run --rm app npm run demo:repository:pg

docker-demo-mapper-pg:
	docker compose run --rm app npm run demo:mapper:pg

docker-demo-strategy:
	docker compose run --rm app npm run demo:strategy

docker-demo-order-notify:
	docker compose run --rm app npm run demo:order:notify

docker-demo-order-full:
	docker compose run --rm app npm run demo:order:full

docker-demo-order-interactive:
	docker compose run --rm app npm run demo:order:interactive

docker-consume-queues:
	docker compose run --rm app npm run consume:queues

docker-consume-rxjs:
	docker compose run --rm app npm run consume:rxjs

docker-observer-rxjs:
	docker compose run --rm app npm run demo:observer:rxjs

docker-observer-rabbit:
	docker compose run --rm app npm run demo:observer:rabbit
