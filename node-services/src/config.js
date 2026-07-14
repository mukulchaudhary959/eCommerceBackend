export const config = {
  service: process.env.SERVICE_NAME || 'gateway',
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'development-secret-change-me-32-chars',
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/ecommerce',
  postgresUrl: process.env.POSTGRES_URL || 'postgresql://ecommerce:ecommerce@localhost:5432/ecommerce',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  rabbitUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'
};

