# Research: Infrastructure Kernel Enhancement and Alignment

**Date**: 2025-01-22  
**Feature**: Infrastructure Kernel Enhancement and Alignment  
**Branch**: `005-infrastructure-kernel-enhancement`

---

## 1. 实体映射器实现策略

**Decision**: 自动映射 + 手动配置覆盖（简单属性自动映射，复杂场景如嵌套聚合、自定义转换可手动配置）

**Rationale**:

- 平衡开发效率和灵活性：简单属性自动映射减少重复代码，复杂场景手动配置确保正确性
- 支持嵌套聚合映射：通过配置覆盖处理领域实体中的嵌套聚合根和内部实体
- 自定义转换支持：允许为特定字段定义转换函数，处理类型不匹配或业务逻辑转换
- 保持映射配置的清晰性和可维护性

**Alternatives Considered**:

- 完全自动映射（使用反射）：性能较好，但难以处理复杂场景和类型转换
- 完全手动映射：最大控制力，但代码量大、维护成本高
- 仅在内存中映射：无法处理数据库查询结果的映射需求

**Implementation Approach**:

```typescript
// 自动映射：使用反射和装饰器自动映射同名同类型属性
// 手动配置：通过配置对象定义复杂映射规则
interface EntityMappingConfig {
  autoMap: boolean; // 是否启用自动映射
  customMappings: Map<string, MappingRule>; // 自定义映射规则
  nestedAggregates: NestedMappingConfig[]; // 嵌套聚合映射配置
}
```

**Reference**:

- 现有代码库中的 `libs/infra/database/src/mapping/entity-mapper.ts` 提供了跨数据库映射的参考实现
- `specs/004-infrastructure-kernel/data-model.md` 中的 GenericMapper 模式可作为基础

---

## 2. 事务管理接口设计

**Decision**: 重新实现独立的事务管理接口（infrastructure-kernel 定义自己的事务接口，不直接依赖 @hl8/database）

**Rationale**:

- 保持基础设施层独立性：infrastructure-kernel 作为独立库不应直接依赖其他基础设施模块
- 提供清晰的抽象接口：定义事务管理的标准接口，便于测试和替换实现
- 支持嵌套事务：提供嵌套事务支持，满足复杂业务场景需求
- 与 MikroORM 集成：直接基于 MikroORM 的 EntityManager 实现事务，避免额外的抽象层

**Alternatives Considered**:

- 直接使用 @hl8/database 的 TransactionService：会增加不必要的依赖，违反库独立性原则
- 封装并重新导出 @hl8/database 的服务：仍然存在依赖关系，增加维护成本

**Implementation Approach**:

```typescript
// 定义独立的事务管理接口
interface ITransactionManager {
  begin(): Promise<TransactionContext>;
  commit(context: TransactionContext): Promise<void>;
  rollback(context: TransactionContext): Promise<void>;
  runInTransaction<T>(callback: (em: EntityManager) => Promise<T>): Promise<T>;
}

// 基于 MikroORM EntityManager 实现
class MikroORMTransactionManager implements ITransactionManager {
  constructor(private readonly orm: MikroORM) {}
  // 实现事务管理逻辑
}
```

**Reference**:

- MikroORM 事务文档：支持嵌套事务和事务传播
- Clean Architecture：基础设施层应该定义自己的抽象接口

---

## 3. 事件存储集成实现方式

**Decision**: 实现 IEventStore 接口（infrastructure-kernel 直接实现 application-kernel 定义的 IEventStore 接口）

**Rationale**:

- 接口对齐：直接实现 application-kernel 定义的接口，确保接口契约一致性
- 职责清晰：infrastructure-kernel 负责数据持久化实现，application-kernel 定义接口契约
- 减少适配层：避免额外的适配层，简化架构复杂度
- 类型安全：TypeScript 类型系统确保实现正确性

**Alternatives Considered**:

- 仅提供底层持久化支持：无法保证接口一致性，增加集成复杂度
- 定义独立的事件存储接口：会导致接口不匹配，增加维护成本

**Implementation Approach**:

```typescript
// 直接实现 application-kernel 的 IEventStore 接口
import { IEventStore } from "@hl8/application-kernel";

class MikroORMEventStore implements IEventStore {
  constructor(
    private readonly em: EntityManager,
    private readonly logger: Logger,
  ) {}

  async saveEvents(aggregateId: EntityId, events: DomainEvent[], expectedVersion: number): Promise<EventStoreResult> {
    // 使用 MikroORM 持久化事件到数据库
  }

  // 实现所有接口方法
}
```

**Reference**:

- `libs/kernel/application-kernel/src/events/store/event-store.interface.ts` 定义了完整的接口契约
- Event Sourcing 最佳实践：事件存储实现应该遵循标准的接口定义

---

## 4. 规范模式查询转换复杂度限制

**Decision**: 支持常见组合（支持 AND、OR、NOT 组合，但不支持极端嵌套如 >5 层）

**Rationale**:

- 平衡实用性与性能：支持大多数业务场景的组合查询，避免极端嵌套带来的性能和复杂度问题
- 查询优化：限制嵌套深度有助于数据库查询优化，提升查询性能
- 实现复杂度控制：限制嵌套深度使实现更可控，降低测试和维护成本
- 符合实际业务需求：大多数业务查询不需要超过 5 层的嵌套组合

**Alternatives Considered**:

- 仅支持简单规范（单一条件）：功能过于受限，无法满足复杂查询需求
- 无限制复杂度支持：实现复杂度高，查询性能难以保证
- 仅在内存中评估规范：无法利用数据库索引，性能差

**Implementation Approach**:

```typescript
class SpecificationConverter {
  private maxNestingDepth = 5;

  convertToQuery<T>(spec: ISpecification<T>, depth: number = 0): QueryCriteria {
    if (depth > this.maxNestingDepth) {
      throw new Error("规范嵌套深度超过限制");
    }

    // 递归转换规范为查询条件
    // 支持 AND、OR、NOT 组合
  }
}
```

**Reference**:

- `libs/kernel/domain-kernel/src/specifications/specification.interface.ts` 定义了规范接口
- MikroORM QueryBuilder 支持复杂的查询条件组合

---

## 5. 批量操作范围定义

**Decision**: 批量保存和删除（支持 saveMany 和 deleteMany 操作）

**Rationale**:

- 覆盖核心场景：批量保存和删除是最常见的批量操作需求
- 性能优化：批量操作可以显著提升大量数据处理的性能
- 事务一致性：批量操作在同一事务中执行，保证数据一致性
- 实现复杂度适中：批量保存和删除的实现相对简单，风险可控

**Alternatives Considered**:

- 仅批量保存：功能不够完整，无法满足批量删除需求
- 所有 CRUD 操作的批量版本：实现复杂度高，查询操作（findMany）的需求不明确

**Implementation Approach**:

```typescript
interface IRepository<T> {
  // 现有方法...

  // 批量操作
  saveMany(entities: T[]): Promise<void>;
  deleteMany(ids: EntityId[]): Promise<void>;
}

class MikroORMRepository<T> implements IRepository<T> {
  async saveMany(entities: T[]): Promise<void> {
    this.em.persist(entities);
    await this.em.flush();
  }

  async deleteMany(ids: EntityId[]): Promise<void> {
    // 批量删除实现
  }
}
```

**Reference**:

- MikroORM 支持批量持久化和删除操作
- 现有规范要求批量操作在事务中执行

---

## 6. ITenantIsolatedRepository 接口正式实现

**Decision**: 正式实现 domain-kernel 定义的 ITenantIsolatedRepository 接口，确保类型安全

**Rationale**:

- 类型安全：TypeScript 编译器可以验证接口实现完整性
- 接口一致性：确保与 domain-kernel 接口定义完全一致
- 代码可维护性：明确的接口实现关系，便于理解和维护
- 测试验证：可以通过类型检查验证实现正确性

**Implementation Approach**:

```typescript
// 正式实现接口，解决类型约束冲突
class MikroORMTenantIsolatedRepository<T extends TenantIsolatedEntity> extends MikroORMRepository<T> implements ITenantIsolatedRepository<T> {
  // 实现所有接口方法
  async findByIdWithContext(id: EntityId, context: TenantContext): Promise<T | null> {
    // 实现逻辑
  }

  // 其他接口方法...
}
```

**Type Constraint Resolution**:

- 通过泛型约束和类型转换解决领域实体和持久化实体的类型差异
- 使用映射器在接口边界进行类型转换

**Reference**:

- `libs/kernel/domain-kernel/src/repositories/tenant-isolated-repository.interface.ts` 定义了完整接口
- 现有代码中的注释提到类型约束冲突，需要通过映射器解决

---

## 7. IRepository 接口完整实现

**Decision**: 补充 findAll 和 count 等缺失方法，完整实现 IRepository 接口

**Rationale**:

- 接口完整性：确保实现所有接口定义的方法
- 业务需求：findAll 和 count 是常见的仓储操作需求
- 一致性：与 domain-kernel 接口定义保持一致

**Implementation Approach**:

```typescript
class MikroORMRepository<T> implements IRepository<T> {
  // 现有方法...

  async findAll(): Promise<T[]> {
    return this.em.find(this.entityName, {});
  }

  async count(): Promise<number> {
    return this.em.count(this.entityName, {});
  }
}
```

**Reference**:

- `libs/kernel/domain-kernel/src/repositories/repository.interface.ts` 定义了接口
- 现有代码中已实现部分方法，需要补充缺失方法

---

## 8. 仓储工厂和 NestJS 依赖注入支持

**Decision**: 提供仓储工厂，支持 NestJS 依赖注入，自动注册仓储提供者

**Rationale**:

- 与 application-kernel 集成：application-kernel 基于 NestJS，需要 DI 支持
- 便捷性：通过工厂和模块自动注册，简化使用方式
- 类型安全：通过泛型和工厂模式确保类型安全

**Implementation Approach**:

```typescript
// 仓储工厂接口
interface IRepositoryFactory<T> {
  create(em: EntityManager): IRepository<T>;
}

// NestJS 模块
@Module({
  providers: [
    RepositoryFactory,
    // 自动注册仓储提供者
  ],
  exports: [RepositoryFactory],
})
export class InfrastructureKernelModule {}
```

**Reference**:

- NestJS 依赖注入文档
- 现有代码中已有部分模块结构

---

## 9. 异常体系对齐

**Decision**: 确保 infrastructure-kernel 抛出的异常都是 domain-kernel 定义的异常类型

**Rationale**:

- 统一异常处理：上层可以统一处理异常
- 错误追踪：一致的异常类型便于错误追踪和日志分析
- 接口契约：异常类型是接口契约的一部分

**Implementation Approach**:

```typescript
// 使用 domain-kernel 的异常类型
import { RepositoryException, BusinessException, SystemException } from "@hl8/domain-kernel";

// infrastructure-kernel 只抛出 domain-kernel 定义的异常
class MikroORMRepository<T> {
  async findById(id: EntityId): Promise<T | null> {
    try {
      // 操作
    } catch (error) {
      throw new RepositoryOperationFailedException();
      // 使用 domain-kernel 异常
    }
  }
}
```

**Reference**:

- `libs/kernel/domain-kernel` 中的异常类型定义
- 现有代码已部分使用 domain-kernel 异常

---

## 总结

所有关键技术决策已确定，实现策略明确。主要挑战在于：

1. 实体映射器的自动映射与手动配置平衡
2. 类型约束冲突的解决（领域实体 vs 持久化实体）
3. 规范模式到数据库查询的转换实现
4. 事件存储的完整接口实现

所有决策都基于现有代码库、最佳实践和项目需求，确保实现的可维护性和可扩展性。
