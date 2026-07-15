package com.example.orders;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.*;

@Configuration
class RabbitConfig {
  @Bean
  TopicExchange events() {
    return new TopicExchange("commerce.events", true, false);
  }

  @Bean
  DirectExchange dlx() {
    return new DirectExchange("commerce.dlx", true, false);
  }

  @Bean
  Queue orderDlq() {
    return QueueBuilder.durable("orders.dlq").build();
  }

  @Bean
  Binding dlqBinding(Queue orderDlq, DirectExchange dlx) {
    return BindingBuilder.bind(orderDlq).to(dlx).with("orders.failed");
  }
}
