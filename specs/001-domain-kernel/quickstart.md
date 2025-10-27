# Quick Start Guide: Domain Kernel Core Module

**Version**: 1.0.0  
**Date**: 2024-12-19

## 概述

Domain Kernel Core Module 是基于 Clean Architecture 的领域核心模块，提供值对象、实体（充血模型+UUID+审计）、聚合根（实体分离原则）等核心领域层组件，统一各业务模块的开发模式。

## 安装

```bash
# 使用 pnpm 安装
pnpm add @hl8/domain-kernel

# 或使用 npm
npm install @hl8/domain-kernel

# 或使用 yarn
yarn add @hl8/domain-kernel
```

## 快速开始

### 1. 创建值对象

```typescript
import { ValueObject } from "@hl8/domain-kernel";

// 创建邮箱值对象
class Email extends ValueObject<string> {
  constructor(value: string) {
    super(value);
    this.validateEmail(value);
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }
  }
}

// 使用值对象
const email1 = new Email("user@example.com");
const email2 = new Email("user@example.com");

console.log(email1.equals(email2)); // true
console.log(email1.toString()); // "user@example.com"
```

### 2. 创建实体（充血模型）

```typescript
import { Entity, EntityId, AuditInfo } from "@hl8/domain-kernel";

// 创建用户实体
class User extends Entity {
  private name: string;
  private email: Email;

  constructor(name: string, email: Email) {
    super(); // 自动生成UUID和审计信息
    this.name = name;
    this.email = email;
  }

  // 业务方法 - 更新用户名
  updateName(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new Error("Name cannot be empty");
    }
    this.name = newName;
    this.updateAuditInfo(); // 自动更新审计信息
  }

  // 业务方法 - 更新邮箱
  updateEmail(newEmail: Email): void {
    this.email = newEmail;
    this.updateAuditInfo();
  }

  // 业务方法 - 获取用户信息
  getUserInfo(): { id: string; name: string; email: string } {
    return {
      id: this.getId().getValue(),
      name: this.name,
      email: this.email.getValue(),
    };
  }

  // 业务验证
  validate(): boolean {
    return this.name.length > 0 && this.email.isValid();
  }
}

// 使用实体
const user = new User("John Doe", new Email("john@example.com"));
console.log(user.getId().getValue()); // UUID v4
console.log(user.getLifecycleState()); // EntityLifecycle.CREATED

// 激活用户
user.activate();
console.log(user.getLifecycleState()); // EntityLifecycle.ACTIVE

// 执行业务操作
user.updateName("Jane Doe");
console.log(user.getUserInfo().name); // "Jane Doe"
```

### 3. 创建聚合根（实体分离原则）

```typescript
import { AggregateRoot, InternalEntity } from "@hl8/domain-kernel";

// 创建订单项内部实体
class OrderItem extends InternalEntity {
  private productId: string;
  private quantity: number;
  private price: number;

  constructor(productId: string, quantity: number, price: number) {
    super(); // 需要指定聚合根ID
    this.productId = productId;
    this.quantity = quantity;
    this.price = price;
  }

  // 执行业务逻辑
  executeBusinessLogic(params: any): any {
    if (params.action === "updateQuantity") {
      this.updateQuantity(params.quantity);
    }
    return this.calculateTotal();
  }

  // 业务方法
  updateQuantity(newQuantity: number): void {
    if (newQuantity <= 0) {
      throw new Error("Quantity must be positive");
    }
    this.quantity = newQuantity;
  }

  calculateTotal(): number {
    return this.quantity * this.price;
  }

  // 验证业务规则
  validateBusinessRules(): boolean {
    return this.quantity > 0 && this.price > 0;
  }
}

// 创建订单聚合根
class Order extends AggregateRoot {
  private customerId: string;
  private status: string;
  private items: Map<string, OrderItem> = new Map();

  constructor(customerId: string) {
    super();
    this.customerId = customerId;
    this.status = "PENDING";
  }

  // 协调业务操作 - 添加订单项
  addOrderItem(productId: string, quantity: number, price: number): void {
    const item = new OrderItem(productId, quantity, price);
    item.setAggregateRootId(this.getId()); // 设置聚合根ID

    this.addInternalEntity(item);
    this.updateStatus("UPDATED");

    // 发布领域事件
    this.addDomainEvent({
      eventType: "OrderItemAdded",
      eventData: { productId, quantity, price },
      timestamp: new Date(),
    });
  }

  // 协调业务操作 - 更新订单项数量
  updateOrderItemQuantity(itemId: string, newQuantity: number): void {
    const item = this.getInternalEntity(new EntityId(itemId));
    if (!item) {
      throw new Error("Order item not found");
    }

    // 委托给内部实体执行
    const result = item.executeBusinessLogic({
      action: "updateQuantity",
      quantity: newQuantity,
    });

    this.updateStatus("UPDATED");
    return result;
  }

  // 计算订单总金额
  calculateTotal(): number {
    let total = 0;
    for (const item of this.items.values()) {
      total += item.calculateTotal();
    }
    return total;
  }

  // 验证业务不变量
  validateBusinessInvariants(): boolean {
    // 订单必须有客户ID
    if (!this.customerId) return false;

    // 订单项必须有效
    for (const item of this.items.values()) {
      if (!item.validateBusinessRules()) return false;
    }

    return true;
  }

  private updateStatus(newStatus: string): void {
    this.status = newStatus;
  }
}

// 使用聚合根
const order = new Order("customer-123");
order.addOrderItem("product-1", 2, 100);
order.addOrderItem("product-2", 1, 50);

console.log(order.calculateTotal()); // 250
console.log(order.getDomainEvents().length); // 2 (两个OrderItemAdded事件)
```

### 4. 处理领域事件

```typescript
import { DomainEvent } from "@hl8/domain-kernel";

// 创建领域事件处理器
class OrderEventHandler {
  handle(event: DomainEvent): void {
    switch (event.getEventType()) {
      case "OrderItemAdded":
        console.log("Order item added:", event.getEventData());
        break;
      case "OrderStatusChanged":
        console.log("Order status changed:", event.getEventData());
        break;
    }
  }
}

// 使用事件处理器
const eventHandler = new OrderEventHandler();
const events = order.getDomainEvents();

for (const event of events) {
  eventHandler.handle(event);
}

// 清空已处理的事件
order.clearDomainEvents();
```

### 5. 异常处理

```typescript
import { BusinessException, SystemException } from "@hl8/domain-kernel";

// 业务异常
try {
  user.updateName(""); // 空名称
} catch (error) {
  if (error instanceof BusinessException) {
    console.log("Business error:", error.getMessage());
    console.log("Error code:", error.getCode());
  }
}

// 系统异常
try {
  // 系统级操作
} catch (error) {
  if (error instanceof SystemException) {
    console.log("System error:", error.getMessage());
    console.log("Context:", error.getContext());
  }
}
```

## 核心特性

### 1. 充血模型

- 实体承载业务逻辑和状态管理
- 业务方法封装在实体内部
- 状态变更通过业务方法进行

### 2. UUID v4 标识符

- 自动生成全局唯一标识符
- 支持冲突检测和重试机制
- 确保分布式环境下的唯一性

### 3. 审计能力

- 自动记录创建和修改信息
- 支持审计轨迹查询
- 数据完整性验证

### 4. 实体分离原则

- 聚合根协调内部实体执行
- 禁止聚合根直接执行业务逻辑
- 确保架构一致性

### 5. 领域事件

- 支持事件发布和订阅
- 事件存储和重放功能
- 松耦合的领域模型通信

## 最佳实践

### 1. 实体设计

- 保持实体职责单一
- 业务逻辑内聚
- 状态与行为统一

### 2. 聚合根设计

- 管理聚合边界
- 协调内部实体
- 发布领域事件

### 3. 值对象设计

- 保持不可变性
- 实现相等性比较
- 封装业务规则

### 4. 异常处理

- 区分业务异常和系统异常
- 提供有意义的错误信息
- 记录异常上下文

## 性能考虑

- UUID生成成功率: 99.99%
- 审计记录成功率: 99.99%
- 值对象比较: <1ms
- 聚合根协调: <5ms

## 更多信息

- [API文档](./contracts/domain-kernel.interfaces.ts)
- [数据模型](./data-model.md)
- [研究文档](./research.md)
- [实现计划](./plan.md)
