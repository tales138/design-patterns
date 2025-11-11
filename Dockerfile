FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production=false

COPY . .

ENV NODE_ENV=development
ENV DATABASE_URL=postgres://postgres:postgres@postgres:5432/design_patterns
ENV RABBITMQ_URL=amqp://rabbitmq

CMD ["npm", "run", "demo"]
