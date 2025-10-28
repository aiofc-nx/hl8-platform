# Quick Start: Domain Kernel Enhancement

**Feature**: Domain Kernel Enhancement  
**Date**: 2024-12-19  
**Phase**: 1 - Design & Contracts

## Overview

The Domain Kernel Enhancement provides comprehensive validation frameworks, business rule management, domain service coordination, and enhanced aggregate root operations while maintaining complete domain layer purity.

## Key Features

- **Value Object Validation**: Composable validation rules with error collection
- **Business Rule Management**: Severity-based rule validation with context tracking
- **Domain Service Coordination**: Rule-based coordination with dependency management
- **Aggregate Root Operations**: Pre/post condition validation with event handling
- **Domain Event Processing**: Synchronous event processing with handler registry

## Installation

```bash
# Install the enhanced domain kernel
pnpm install @hl8/domain-kernel

# Install development dependencies
pnpm install -D @types/jest jest ts-jest
```

## Value Object Validation

### Basic Usage

```typescript
import { ValueObject, ValidationRule, ValidationResult } from "@hl8/domain-kernel";

// Create a validation rule
const emailRule: ValidationRule<string> = {
  ruleName: "email-format",
  validate: (value: string) => {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    return {
      isValid,
      errors: isValid
        ? []
        : [
            {
              field: "email",
              message: "Invalid email format",
              code: "INVALID_EMAIL_FORMAT",
              value,
              context: {},
            },
          ],
    };
  },
  getRuleName: () => "email-format",
  getDescription: () => "Validates email format",
};

// Use in value object
class Email extends ValueObject<string> {
  constructor(value: string) {
    super(value);
    this.addValidationRule(emailRule);
  }

  protected validateValue(value: string): void {
    const result = this.validate(value);
    if (!result.isValid) {
      throw new Error(`Email validation failed: ${result.errors.map((e) => e.message).join(", ")}`);
    }
  }
}
```

### Advanced Usage

```typescript
// Create composite validation rules
const compositeRule = ValidationRuleFactory.createCompositeRule("email-validation", [emailRule, lengthRule, domainRule], "Complete email validation");

// Use in value object
class AdvancedEmail extends ValueObject<string> {
  constructor(value: string) {
    super(value);
    this.addValidationRule(compositeRule);
  }
}
```

## Business Rule Management

### Basic Usage

```typescript
import { Entity, BusinessRule, BusinessRuleManager } from "@hl8/domain-kernel";

// Create a business rule
const ageRule: BusinessRule = {
  ruleName: "minimum-age",
  description: "User must be at least 18 years old",
  severity: "ERROR",
  validate: (entity: Entity) => {
    const user = entity as User;
    const isValid = user.age >= 18;
    return {
      isValid,
      violations: isValid
        ? []
        : [
            {
              ruleName: "minimum-age",
              message: "User must be at least 18 years old",
              severity: "ERROR",
              context: { age: user.age, minimumAge: 18 },
            },
          ],
      entityType: "User",
      entityId: user.id.toString(),
    };
  },
  getRuleName: () => "minimum-age",
  getDescription: () => "User must be at least 18 years old",
  getSeverity: () => "ERROR",
};

// Use in entity
class User extends Entity {
  constructor(public age: number) {
    super();
    this.addBusinessRule(ageRule);
  }

  public validateBusinessRules(): boolean {
    const result = this.validateBusinessRules();
    if (!result.isValid) {
      console.error("Business rule violations:", result.violations);
      return false;
    }
    return true;
  }
}
```

### Advanced Usage

```typescript
// Create conditional business rules
const conditionalRule = BusinessRuleFactory.createConditionalRule(
  "premium-user-validation",
  "Premium users must have valid payment method",
  "ERROR",
  (entity: Entity) => (entity as User).isPremium,
  (entity: Entity) => (entity as User).hasValidPaymentMethod,
);

// Use business rule manager
const ruleManager = new BusinessRuleManager();
ruleManager.addRule(ageRule);
ruleManager.addRule(conditionalRule);

const result = ruleManager.validateEntity(user);
if (!result.isValid) {
  console.error("Validation failed:", result.violations);
}
```

## Domain Service Coordination

### Basic Usage

```typescript
import { CoordinationRule, CoordinationContext, CoordinationResult } from "@hl8/domain-kernel";

// Create a coordination rule
const orderProcessingRule: CoordinationRule = {
  operationName: "process-order",
  execute: async (context: CoordinationContext) => {
    const { parameters, entities } = context;
    const order = entities[0] as Order;

    try {
      // Validate inventory
      const inventoryService = new InventoryService();
      await inventoryService.reserveItems(order.items);

      // Process payment
      const paymentService = new PaymentService();
      await paymentService.charge(order.totalAmount);

      // Update order status
      order.markAsProcessed();

      return {
        success: true,
        data: { orderId: order.id, status: "processed" },
        errors: [],
        executionTime: Date.now() - context.timestamp.getTime(),
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        errors: [error.message],
        executionTime: Date.now() - context.timestamp.getTime(),
      };
    }
  },
  getOperationName: () => "process-order",
  getDependencies: () => ["inventory-service", "payment-service"],
};

// Use coordination manager
const coordinationManager = new CoordinationManager();
coordinationManager.registerRule(orderProcessingRule);

const context: CoordinationContext = {
  operation: "process-order",
  parameters: { orderId: "123" },
  entities: [order],
  timestamp: new Date(),
  correlationId: "corr-123",
};

const result = await coordinationManager.executeOperation("process-order", context);
if (result.success) {
  console.log("Order processed successfully:", result.getData());
} else {
  console.error("Order processing failed:", result.getErrors());
}
```

## Aggregate Root Operations

### Basic Usage

```typescript
import { AggregateRoot, BusinessOperation } from "@hl8/domain-kernel";

// Create a business operation
const createOrderOperation: BusinessOperation = {
  operationName: "create-order",
  execute: async (params: unknown, aggregate: AggregateRoot) => {
    const order = aggregate as Order;
    const { items, customerId } = params as { items: Item[]; customerId: string };

    order.addItems(items);
    order.setCustomerId(customerId);
    order.calculateTotal();

    return { orderId: order.id, total: order.totalAmount };
  },
  validatePreConditions: (params: unknown, aggregate: AggregateRoot) => {
    const order = aggregate as Order;
    const { items, customerId } = params as { items: Item[]; customerId: string };

    return items.length > 0 && customerId.length > 0 && order.isActive();
  },
  validatePostConditions: (result: unknown, aggregate: AggregateRoot) => {
    const order = aggregate as Order;
    const { orderId, total } = result as { orderId: string; total: number };

    return orderId === order.id.toString() && total > 0;
  },
  getOperationName: () => "create-order",
};

// Use in aggregate root
class Order extends AggregateRoot {
  private items: Item[] = [];
  private customerId: string = "";
  private totalAmount: number = 0;

  constructor() {
    super();
    this.registerBusinessOperation(createOrderOperation);
  }

  public async createOrder(items: Item[], customerId: string): Promise<{ orderId: string; total: number }> {
    return await this.executeBusinessOperation("create-order", { items, customerId });
  }
}
```

## Domain Event Processing

### Basic Usage

```typescript
import { DomainEvent, DomainEventHandler, EventProcessor } from "@hl8/domain-kernel";

// Create an event handler
const orderCreatedHandler: DomainEventHandler = {
  eventType: "OrderCreated",
  handle: (event: DomainEvent, aggregate: AggregateRoot) => {
    const order = aggregate as Order;
    console.log(`Order ${order.id} created with total ${order.totalAmount}`);

    // Update read models
    // Send notifications
    // Trigger other domain events
  },
  getEventType: () => "OrderCreated",
  canHandle: (event: DomainEvent) => event.eventType === "OrderCreated",
};

// Use event processor
const eventProcessor = new EventProcessor();
eventProcessor.registerHandler(orderCreatedHandler);

// Process events
const orderCreatedEvent = new DomainEvent(order.id, "OrderCreated", { orderId: order.id, total: order.totalAmount });

eventProcessor.processEvent(orderCreatedEvent, order);
```

### Advanced Usage

```typescript
// Create conditional event handlers
const conditionalHandler = EventHandlerFactory.createConditionalHandler(
  "OrderCreated",
  (event: DomainEvent, aggregate: AggregateRoot) => {
    const order = aggregate as Order;
    return order.totalAmount > 1000; // Only handle high-value orders
  },
  (event: DomainEvent, aggregate: AggregateRoot) => {
    console.log("High-value order created:", event.data);
  },
);

// Use event registry
const eventRegistry = new EventRegistry();
eventRegistry.register(orderCreatedHandler);
eventRegistry.register(conditionalHandler);

const handlers = eventRegistry.getHandlers("OrderCreated");
handlers.forEach((handler) => {
  if (handler.canHandle(event)) {
    handler.handle(event, aggregate);
  }
});
```

## Error Handling

### Validation Errors

```typescript
try {
  const email = new Email("invalid-email");
} catch (error) {
  if (error instanceof ValueObjectValidationException) {
    console.error("Validation failed:", error.errors);
    console.error("Field:", error.field);
    console.error("Value:", error.value);
  }
}
```

### Business Rule Violations

```typescript
const result = user.validateBusinessRules();
if (!result.isValid) {
  result.violations.forEach((violation) => {
    console.error(`${violation.ruleName}: ${violation.message}`);
    console.error("Severity:", violation.severity);
    console.error("Context:", violation.context);
  });
}
```

### Coordination Errors

```typescript
const result = await coordinationManager.executeOperation("process-order", context);
if (!result.success) {
  result.getErrors().forEach((error) => {
    console.error("Coordination error:", error);
  });
}
```

## Best Practices

1. **Validation Rules**: Keep validation rules focused and composable
2. **Business Rules**: Use appropriate severity levels (ERROR vs WARNING)
3. **Coordination**: Design coordination rules to be idempotent
4. **Operations**: Always validate pre/post conditions
5. **Events**: Keep event handlers lightweight and focused
6. **Error Handling**: Provide clear error messages with context
7. **Testing**: Write comprehensive tests for all validation and coordination logic

## Performance Considerations

- Validation rules should be lightweight and fast
- Business rule validation should complete in <10ms
- Domain event processing should complete in <5ms
- Use rule caching for frequently accessed rules
- Implement early termination for validation failures

## Migration Guide

The enhanced domain kernel maintains backward compatibility with existing implementations. To migrate:

1. **Value Objects**: Add validation rules using the new framework
2. **Entities**: Add business rules using the new framework
3. **Aggregate Roots**: Register business operations using the new framework
4. **Domain Services**: Use coordination rules for complex operations
5. **Domain Events**: Register event handlers using the new framework

All existing APIs remain unchanged, ensuring smooth migration.

## Migration Mapping from Original Spec

- **领域事件处理**：原规范默认异步；本增强规范领域层默认同步，异步由应用层/基础设施实现（消息队列/总线）。参见 `appendix-original-spec.md`。
- **领域服务依赖注入**：原规范强调DI；本增强规范通过"依赖接口化 + 上下文入参"实现等价能力，保持领域层纯净。
- **聚合根协调**：原规范强调"聚合根不直接执行业务逻辑"；本增强规范提供"业务操作 + 前/后置条件 + 事件处理"来强化该约束。
- **值对象验证**：原规范要求值对象具备验证能力；本增强规范提供可组合的验证规则与错误收集机制。
- **审计/标识符/分离原则**：保持一致，增强处仅补充契约清晰度与可测试性。

### Migration Steps

1. **Value Objects**: Add validation rules using the new framework
2. **Entities**: Add business rules using the new framework
3. **Aggregate Roots**: Register business operations using the new framework
4. **Domain Services**: Use coordination rules for complex operations
5. **Domain Events**: Register event handlers using the new framework

All existing APIs remain unchanged, ensuring smooth migration.
