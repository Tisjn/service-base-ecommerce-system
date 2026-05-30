# Scalability Demo - Product Service

This demo shows horizontal scaling for `product-service` with Docker Compose.

## Why This File Exists

The normal development compose file publishes `3003:3003` for easy local testing.
Fixed host ports and `container_name` are not suitable for `--scale`, because
each replica needs a unique container name and cannot bind the same host port.

`services/product-service/docker-compose.scale.yml` removes those constraints:

- no fixed `container_name` on `product-service`
- product replicas stay internal on the Docker network
- `product-lb` publishes stable host port `3003`
- Redis and RabbitMQ stay shared dependencies for all replicas

## Run The Demo

From the repository root:

```bash
docker compose -f services/product-service/docker-compose.scale.yml up -d --build --scale product-service=2
docker compose -f services/product-service/docker-compose.scale.yml ps
```

Or from `services/product-service`:

```bash
docker compose -f docker-compose.scale.yml up -d --build --scale product-service=2
docker compose -f docker-compose.scale.yml ps
```

Expected result: Docker Compose starts two `product-service` replicas, for
example `product-service-1` and `product-service-2`, plus one `product-lb`
container on host port `3003`. The API Gateway can keep calling
`http://host.docker.internal:3003`, while `product-lb` forwards traffic to the
scaled product-service replicas.

## Stop The Demo

```bash
docker compose -f services/product-service/docker-compose.scale.yml down
```

## Rubric Mapping

- Architecture characteristic: scalability
- Evidence: horizontal scaling with two product-service replicas
- Command: `docker compose ... up --scale product-service=2`
