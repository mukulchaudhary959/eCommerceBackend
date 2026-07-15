package com.example.orders;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/orders")
class OrderController {
  record Item(String sku, int quantity, BigDecimal unitPrice) {
  }

  record CreateOrder(String customerEmail, List<Item> items) {
  }

  private final OrderRepository repository;
  private final RabbitTemplate rabbit;
  private final ObjectMapper json;

  OrderController(OrderRepository repository, RabbitTemplate rabbit, ObjectMapper json) {
    this.repository = repository;
    this.rabbit = rabbit;
    this.json = json;
  }

  @PostMapping
  ResponseEntity<OrderEntity> create(@RequestBody CreateOrder request, JwtAuthenticationToken auth) throws Exception {
    if (request.items() == null || request.items().isEmpty())
      return ResponseEntity.badRequest().build();
    BigDecimal total = request.items().stream().map(i -> i.unitPrice().multiply(BigDecimal.valueOf(i.quantity())))
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    OrderEntity order = repository.save(new OrderEntity(auth.getToken().getSubject(), request.customerEmail(), total,
        json.writeValueAsString(request.items())));
    rabbit.convertAndSend("commerce.events", "order.created", Map.of("orderId", order.id, "userId", order.userId,
        "customerEmail", order.customerEmail, "total", order.total));
    return ResponseEntity.status(HttpStatus.CREATED).body(order);
  }

  @GetMapping
  List<OrderEntity> list(JwtAuthenticationToken auth) {
    return repository.findByUserIdOrderByCreatedAtDesc(auth.getToken().getSubject());
  }

  @GetMapping("/{id}")
  ResponseEntity<OrderEntity> get(@PathVariable UUID id, JwtAuthenticationToken auth) {
    return repository.findById(id).filter(o -> o.userId.equals(auth.getToken().getSubject())).map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }
}
