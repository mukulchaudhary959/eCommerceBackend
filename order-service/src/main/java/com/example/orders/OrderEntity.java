package com.example.orders;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "orders")
class OrderEntity {
  @Id
  UUID id;
  @Column(nullable = false)
  String userId;
  @Column(nullable = false)
  String customerEmail;
  @Column(nullable = false)
  String status;
  @Column(nullable = false)
  BigDecimal total;
  @Column(nullable = false, columnDefinition = "text")
  String itemsJson;
  @Column(nullable = false)
  Instant createdAt;

  protected OrderEntity() {
  }

  OrderEntity(String userId, String email, BigDecimal total, String items) {
    id = UUID.randomUUID();
    this.userId = userId;
    customerEmail = email;
    this.total = total;
    itemsJson = items;
    status = "PENDING";
    createdAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public String getUserId() {
    return userId;
  }

  public String getCustomerEmail() {
    return customerEmail;
  }

  public String getStatus() {
    return status;
  }

  public BigDecimal getTotal() {
    return total;
  }

  public String getItemsJson() {
    return itemsJson;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
