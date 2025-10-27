# Domain Kernel Core Module - 领域核心模块

基于 Clean Architecture 的领域核心模块，提供值对象、实体、聚合根等核心领域层组件。

## 功能特性

### 🏗️ 核心组件

- **值对象 (ValueObject)**: 不可变的值对象基类，提供相等性比较、序列化等功能
- **实体 (Entity)**: 具有身份标识的实体基类，支持生命周期管理和审计
- **内部实体 (InternalEntity)**: 聚合根内部管理的实体，遵循实体-聚合分离原则
- **聚合根 (AggregateRoot)**: 聚合根基类，管理内部实体和领域事件
- **领域事件 (DomainEvent)**: 领域事件基类，支持事件发布和订阅
- **领域服务 (DomainService)**: 领域服务基类，封装跨实体的业务逻辑

### 🔧 基础设施

- **标识符系统**: UUID v4 生成器和实体标识符
- **审计系统**: 完整的审计信息跟踪和变更记录
- **异常处理**: 业务异常和系统异常的分类处理
- **验证系统**: 实体-聚合分离原则验证器

### 📊 审计能力

- **审计信息 (AuditInfo)**: 创建时间、更新时间、创建者、更新者、版本号
- **审计变更 (AuditChange)**: 详细的变更记录，包括变更类型、字段、旧值、新值
- **审计轨迹 (AuditTrail)**: 实体的完整变更历史

### 🎯 设计原则

- **Clean Architecture**: 遵循清洁架构原则，领域层独立于基础设施层
- **Rich Domain Model**: 富领域模型，业务逻辑封装在领域对象中
- **实体-聚合分离**: 严格的实体和聚合根分离原则
- **事件驱动**: 支持领域事件的发布和订阅
- **不可变性**: 值对象和关键属性不可变
- **类型安全**: 完整的 TypeScript 类型支持

## 安装使用

### 安装依赖

```bash
pnpm install
```

### 构建

```bash
pnpm build
```

### 测试

```bash
pnpm test
```

## 快速开始

### 创建值对象

```typescript
import { ValueObject } from "@hl8/domain-kernel";

class Email extends ValueObject {
  constructor(value: string) {
    super(value);
  }

  validateValue(value: string): void {
    if (!value || !value.includes("@")) {
      throw new Error("无效的邮箱地址");
    }
  }

  get value(): string {
    return this._value;
  }
}
```

### 创建实体

```typescript
import { Entity, EntityId, AuditInfo, EntityLifecycle } from "@hl8/domain-kernel";

class User extends Entity {
  constructor(
    public readonly email: string,
    public readonly name: string,
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState?: EntityLifecycle,
    version?: number,
  ) {
    super(id, auditInfo, lifecycleState, version);
  }

  clone(): User {
    return new User(this.email, this.name, this.id, this.auditInfo.clone(), this.lifecycleState, this.version);
  }
}
```

### 创建聚合根

```typescript
import { AggregateRoot, EntityId, AuditInfo, EntityLifecycle } from "@hl8/domain-kernel";

class UserAggregate extends AggregateRoot {
  constructor(
    public readonly email: string,
    public readonly name: string,
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState?: EntityLifecycle,
    version?: number,
  ) {
    super(id, auditInfo, lifecycleState, version);
  }

  setProfile(email: string, name: string): { success: boolean; message: string } {
    return this.coordinateBusinessOperation("setProfile", { email, name });
  }

  protected performCoordination(operation: string, params: any): any {
    switch (operation) {
      case "setProfile":
        const { email, name } = params;
        // 执行业务逻辑
        return { success: true, message: "用户资料更新成功" };
      default:
        return { success: false, error: "未知操作" };
    }
  }

  protected performBusinessInvariantValidation(): boolean {
    return this.email && this.name;
  }

  clone(): UserAggregate {
    return new UserAggregate(this.email, this.name, this.id, this.auditInfo.clone(), this.lifecycleState, this.version);
  }
}
```

### 使用领域事件

```typescript
import { DomainEvent, EntityId } from "@hl8/domain-kernel";

// 创建领域事件
const event: DomainEvent = {
  type: "UserCreated",
  aggregateRootId: userId,
  timestamp: new Date(),
  data: { email: "user@example.com", name: "张三" },
};

// 添加到聚合根
aggregateRoot.addDomainEvent(event);

// 获取所有事件
const events = aggregateRoot.getDomainEvents();
```

### 异常处理

```typescript
import { BusinessException, SystemException } from "@hl8/domain-kernel";

// 业务异常
throw new BusinessException("用户不存在", "USER_NOT_FOUND");

// 系统异常
throw new SystemException("数据库连接失败", "DATABASE_CONNECTION_ERROR");
```

### 验证分离原则

```typescript
import { SeparationValidator } from "@hl8/domain-kernel";

// 验证聚合根是否符合分离原则
const result = SeparationValidator.validateAggregateRoot(aggregateRoot);

if (result.isValid) {
  console.log("分离原则验证通过");
} else {
  console.log("分离原则验证失败:", result.errors);
}
```

## API 参考

### 值对象 (ValueObject)

- `constructor(value: T, createdAt?: Date, version?: number)`: 创建值对象
- `get value(): T`: 获取值
- `equals(other: ValueObject<T>): boolean`: 比较相等性
- `toJSON(): object`: 序列化为 JSON
- `clone(): ValueObject<T>`: 克隆值对象
- `validateValue(value: T): void`: 验证值（子类实现）

### 实体 (Entity)

- `constructor(id?: EntityId, auditInfo?: AuditInfo, lifecycleState?: EntityLifecycle, version?: number)`: 创建实体
- `get id(): EntityId`: 获取标识符
- `get auditInfo(): AuditInfo`: 获取审计信息
- `get lifecycleState(): EntityLifecycle`: 获取生命周期状态
- `get version(): number`: 获取版本号
- `activate(): void`: 激活实体
- `deactivate(): void`: 停用实体
- `suspend(): void`: 暂停实体
- `resume(): void`: 恢复实体
- `equals(other: Entity): boolean`: 比较相等性
- `toJSON(): object`: 序列化为 JSON
- `clone(): Entity`: 克隆实体（子类实现）

### 聚合根 (AggregateRoot)

- `constructor(id?: EntityId, auditInfo?: AuditInfo, lifecycleState?: EntityLifecycle, version?: number)`: 创建聚合根
- `addInternalEntity(entity: InternalEntity): void`: 添加内部实体
- `removeInternalEntity(entityId: EntityId): void`: 移除内部实体
- `getInternalEntity(entityId: EntityId): InternalEntity | undefined`: 获取内部实体
- `coordinateBusinessOperation(operation: string, params: any): any`: 协调业务操作
- `addDomainEvent(event: DomainEvent): void`: 添加领域事件
- `getDomainEvents(): DomainEvent[]`: 获取领域事件
- `clearDomainEvents(): void`: 清空领域事件
- `validateBusinessInvariants(): boolean`: 验证业务不变量
- `clone(): AggregateRoot`: 克隆聚合根（子类实现）

### 领域事件 (DomainEvent)

- `type: string`: 事件类型
- `aggregateRootId: EntityId`: 聚合根标识符
- `timestamp: Date`: 时间戳
- `data: any`: 事件数据
- `metadata?: Record<string, any>`: 元数据
- `eventId?: EntityId`: 事件标识符
- `version?: number`: 版本号

## 测试

项目包含完整的测试套件：

- **单元测试**: 每个组件的独立测试
- **集成测试**: 组件间的协作测试
- **端到端测试**: 完整业务流程测试

运行测试：

```bash
# 运行所有测试
pnpm test

# 运行单元测试
pnpm test:unit

# 运行集成测试
pnpm test:integration

# 运行端到端测试
pnpm test:e2e
```

## 示例

查看 `examples/` 目录中的完整使用示例：

```bash
node examples/basic-usage.cjs
```

## 贡献

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 作者

hl8-platform 团队

## 版本历史

- **1.0.0** - 初始版本
  - 实现核心领域组件
  - 支持值对象、实体、聚合根
  - 完整的审计和事件系统
  - 分离原则验证器
