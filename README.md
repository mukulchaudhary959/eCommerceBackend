# Distributed E-Commerce Backend

A runnable learning-oriented microservices backend using Java/Spring Boot, Node.js/Express, MongoDB, PostgreSQL, Redis, RabbitMQ, Docker, and JWT.

## Architecture

```text
Client -> API Gateway :3000
             |-- User Service -------- MongoDB (users) + Redis (carts)
             |-- Product Service ----- MongoDB (catalog) + Redis (cache)
             |-- Order Service ------- PostgreSQL + RabbitMQ events
             |-- Inventory Service --- PostgreSQL + RabbitMQ events
             |-- Payment Service ----- PostgreSQL + RabbitMQ events
             `-- Notification Service RabbitMQ consumer -> email adapter
```

RabbitMQ topic exchange `commerce.events` carries `order.created`, `inventory.reserved`, and `payment.captured`. Notification failures retry three times through a durable TTL retry queue and then dead-letter through `commerce.dlx`. Payment writes require an idempotency key, inventory reservation uses an atomic PostgreSQL transaction, and order creation publishes an event after persistence.

## Run locally

Requirements: Docker Desktop with Docker Compose.

```powershell
Copy-Item .env.example .env
# Change JWT_SECRET in .env before using this outside local development.
docker compose up --build
```

- API gateway: `http://localhost:3000`
- Gateway health: `http://localhost:3000/health`
- RabbitMQ UI: `http://localhost:15672` (`guest` / `guest`)

To stop the stack, run `docker compose down`. Add `-v` only when you intentionally want to delete all local database data.

## API walkthrough

Register and save the returned token:

```http
POST /api/users/register
Content-Type: application/json

{"email":"buyer@example.com","password":"strong-password"}
```

Authenticated calls use `Authorization: Bearer <token>`.

```http
PUT /api/users/me/cart
{"items":[{"sku":"LAPTOP-1","quantity":1}]}

POST /api/orders
{"customerEmail":"buyer@example.com","items":[{"sku":"LAPTOP-1","quantity":1,"unitPrice":999.00}]}

POST /api/inventory/reserve
{"orderId":"<order-id>","items":[{"sku":"LAPTOP-1","quantity":1}]}

POST /api/payments
Idempotency-Key: checkout-<order-id>
{"orderId":"<order-id>","amount":999.00}
```

Product creation, inventory stock updates, and role changes require an `ADMIN` role. For a first local admin, update the user's `roles` array in MongoDB to `["ADMIN"]`; production deployments should use a controlled bootstrap/migration rather than exposing role elevation.

## Service ownership

| Service | Runtime | Data ownership | Responsibility |
|---|---|---|---|
| Gateway | Node/Express | None | Routing and rate limiting |
| User | Node/Express | MongoDB, Redis | JWT, RBAC, profiles, carts |
| Product | Node/Express | MongoDB, Redis | Catalog and cached reads |
| Order | Java/Spring Boot | PostgreSQL | Order lifecycle and events |
| Inventory | Node/Express | PostgreSQL | Atomic stock reservations |
| Payment | Node/Express | PostgreSQL | Idempotent payment records |
| Notification | Node/Express | RabbitMQ | Event consumption/email boundary |

## Distributed transaction approach

The checkout is designed as a saga, not a cross-database ACID transaction. The intended next production increment is an orchestrator or event consumers that move an order through `PENDING -> INVENTORY_RESERVED -> PAID`, with compensating actions (`inventory.release`, payment refund) on failure. Use a transactional outbox in each database before relying on the system for real money; the current direct publish is deliberately a starter implementation.

## AWS deployment mapping

- Images: Amazon ECR
- Containers: ECS Fargate (one service/task definition per microservice)
- Gateway: Application Load Balancer or Amazon API Gateway with a VPC Link
- PostgreSQL: Amazon RDS for PostgreSQL
- MongoDB: MongoDB Atlas (recommended) or Amazon DocumentDB after compatibility testing
- Redis: Amazon ElastiCache for Redis/Valkey
- RabbitMQ: Amazon MQ for RabbitMQ; MSK is the alternative if migrating to Kafka
- Secrets: AWS Secrets Manager, injected into ECS task definitions
- Email: Amazon SES behind the notification adapter
- Logs/metrics: CloudWatch Logs, Container Insights, and alarms on DLQ depth/error rate

Run at least two tasks per stateless service across availability zones, keep databases in private subnets, terminate TLS at the load balancer, and restrict security groups to service-to-service ports. The `docker-compose.yml` file is for development; production infrastructure should be expressed with Terraform or AWS CDK.

## Production hardening backlog

- Transactional outbox/inbox and automatic saga compensation
- RabbitMQ retry queues with exponential backoff and DLQ replay tooling
- Real payment provider and SES adapter
- OpenAPI contracts, contract tests, tracing, metrics, and structured logs
- Schema migrations with Flyway and a Node migration tool
- Key rotation/asymmetric JWTs through an identity provider
- Kubernetes/ECS health probes and autoscaling policies
