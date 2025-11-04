# 应用层对基础设施层的支持作用 - 培训文档

## 📋 目录

1. [概述](#概述)
2. [架构关系](#架构关系)
3. [核心支持组件](#核心支持组件)
4. [基础设施层实现模式](#基础设施层实现模式)
5. [实际应用示例](#实际应用示例)
6. [最佳实践](#最佳实践)
7. [总结](#总结)

---

## 概述

本文档阐述 `@hl8/application-kernel`（应用层核心模块）对 `@hl8/infrastructure-kernel`（基础设施层核心模块）的支持作用，帮助开发者理解应用层如何为基础设施层提供接口定义、类型规范和架构模式，确保技术实现层符合应用层的业务需求。

### 核心观点

- **应用层定义接口**：应用层定义技术无关的接口（如 `IEventStore`），基础设施层实现这些接口
- **依赖倒置原则**：基础设施层依赖应用层的抽象接口，而不是应用层依赖基础设施层的具体实现
- **架构模式支持**：应用层提供 CQRS、事件溯源等架构模式的接口定义，基础设施层提供技术实现
- **类型安全保证**：应用层提供完整的类型定义，确保基础设施层实现时的类型安全
- **配置标准化**：应用层提供统一的配置接口，基础设施层根据配置进行技术选型

---

## 架构关系

### Clean Architecture 分层

```
┌─────────────────────────────────────┐
│      Interface Layer                │  接口层：API、DTO
├─────────────────────────────────────┤
│      Application Layer              │  应用层：用例编排和架构模式（本文档重点）
│      ↓ 定义接口和类型               │
│      @hl8/application-kernel         │
├─────────────────────────────────────┤
│      Domain Layer                   │  领域层：业务逻辑
│      ↓ 提供业务类型                 │
│      @hl8/domain-kernel             │
├─────────────────────────────────────┤
│      Infrastructure Layer           │  基础设施层：技术实现（实现应用层接口）
│      ↓ 实现                         │
│      @hl8/infrastructure-kernel     │
└─────────────────────────────────────┘
```

### 依赖关系

**应用层 (Application Layer)**:

- ✅ **定义接口**：定义事件存储、命令查询总线等核心接口
- ✅ **架构模式**：提供 CQRS、事件溯源等架构模式的标准化接口
- ✅ **类型规范**：提供事件、快照、结果等类型定义
- ✅ **配置抽象**：提供技术无关的配置接口

**基础设施层 (Infrastructure Layer)**:

- ✅ **实现接口**：实现应用层定义的接口（如 `IEventStore`）
- ✅ **技术适配**：将技术实现（MikroORM）适配到应用层接口
- ✅ **数据持久化**：提供数据库层面的持久化实现
- ✅ **性能优化**：在保持接口契约的前提下进行性能优化

### 支持关系图谱

```
应用层 (application-kernel)
├── 事件存储接口
│   ├── IEventStore ────────────────→ 基础设施层事件存储实现
│   ├── DomainEvent ─────────────────→ 基础设施层事件类型
│   ├── EventSnapshot ────────────────→ 基础设施层快照类型
│   ├── EventStream ──────────────────→ 基础设施层事件流类型
│   ├── EventStoreResult ─────────────→ 基础设施层结果类型
│   └── EventStoreStatistics ────────→ 基础设施层统计类型
│
├── 事件总线接口
│   ├── IEventBus ────────────────────→ 基础设施层事件总线实现
│   └── EventHandler ─────────────────→ 基础设施层事件处理器
│
├── 配置接口
│   ├── EventStoreConfig ─────────────→ 基础设施层事件存储配置
│   ├── EventBusConfig ───────────────→ 基础设施层事件总线配置
│   └── ApplicationKernelModuleOptions ─→ 基础设施层模块配置
│
└── 类型系统
    ├── BaseCommand ───────────────────→ 基础设施层命令类型（可选）
    ├── BaseQuery ────────────────────→ 基础设施层查询类型（可选）
    └── UseCase ──────────────────────→ 基础设施层用例基类（可选）
```

---

## 核心支持组件

### 1. 事件存储接口 (Event Store Interface)

#### IEventStore - 事件存储接口

应用层定义事件存储的核心接口，基础设施层实现该接口提供数据库持久化。

**应用层定义**:

```typescript
// @hl8/application-kernel
export interface IEventStore {
  /**
   * 保存事件
   * @param aggregateId 聚合根ID
   * @param events 事件列表
   * @param expectedVersion 期望版本号，用于乐观并发控制
   * @returns 保存结果
   */
  saveEvents(aggregateId: EntityId, events: DomainEvent[], expectedVersion: number): Promise<EventStoreResult>;

  /**
   * 获取聚合根的所有事件
   * @param aggregateId 聚合根ID
   * @param fromVersion 起始版本号，可选
   * @param toVersion 结束版本号，可选
   * @returns 事件列表
   */
  getEvents(aggregateId: EntityId, fromVersion?: number, toVersion?: number): Promise<DomainEvent[]>;

  /**
   * 获取聚合根的事件流
   * @param aggregateId 聚合根ID
   * @param fromVersion 起始版本号，可选
   * @param toVersion 结束版本号，可选
   * @returns 事件流
   */
  getEventStream(aggregateId: EntityId, fromVersion?: number, toVersion?: number): Promise<EventStream>;

  /**
   * 获取事件快照
   * @param aggregateId 聚合根ID
   * @param version 版本号，可选，默认最新版本
   * @returns 事件快照
   */
  getSnapshot(aggregateId: EntityId, version?: number): Promise<EventSnapshot | null>;

  /**
   * 保存事件快照
   * @param snapshot 事件快照
   * @returns 保存结果
   */
  saveSnapshot(snapshot: EventSnapshot): Promise<EventStoreResult>;

  /**
   * 获取聚合根的当前版本
   * @param aggregateId 聚合根ID
   * @returns 当前版本号
   */
  getCurrentVersion(aggregateId: EntityId): Promise<number>;

  /**
   * 获取事件统计信息
   * @param aggregateId 聚合根ID，可选
   * @returns 统计信息
   */
  getStatistics(aggregateId?: EntityId): Promise<EventStoreStatistics>;
}
```

**基础设施层实现**:

```typescript
// @hl8/infrastructure-kernel - MikroORM事件存储实现
import { IEventStore, EventStoreResult, EventStream, EventStoreStatistics, DomainEvent as ApplicationDomainEvent, EventSnapshot } from "@hl8/application-kernel";
import { EntityId } from "@hl8/domain-kernel";
import { EntityManager } from "@mikro-orm/core";

export class MikroORMEventStore implements IEventStore {
  constructor(
    private readonly em: EntityManager,
    private readonly eventEntityClass: typeof EventEntity = EventEntity,
    private readonly snapshotEntityClass: typeof EventSnapshotEntity = EventSnapshotEntity,
  ) {}

  async saveEvents(aggregateId: EntityId, events: ApplicationDomainEvent[], expectedVersion: number): Promise<EventStoreResult> {
    try {
      // 验证版本号（使用应用层定义的接口约束）
      const currentVersion = await this.getCurrentVersion(aggregateId);
      if (currentVersion !== expectedVersion) {
        throw new Error(`版本冲突：期望版本 ${expectedVersion}，实际版本 ${currentVersion}`);
      }

      // 创建事件实体并保存（使用应用层定义的 DomainEvent 类型）
      const eventEntities: EventEntity[] = [];
      let nextVersion = expectedVersion;

      for (const event of events) {
        nextVersion++;
        const eventEntity = new EventEntity();
        eventEntity.aggregateId = aggregateId.value;
        eventEntity.eventVersion = nextVersion;
        eventEntity.eventType = event.eventType;
        eventEntity.eventId = event.eventId.value;
        eventEntity.data = this.serializeEventData(event.data);
        eventEntity.metadata = event.metadata;
        eventEntity.timestamp = event.timestamp;

        eventEntities.push(eventEntity);
        this.em.persist(eventEntity);
      }

      await this.em.flush();

      // 返回应用层定义的 EventStoreResult 类型
      return {
        success: true,
        eventsCount: events.length,
        newVersion: nextVersion,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        eventsCount: 0,
        newVersion: expectedVersion,
        timestamp: new Date(),
      };
    }
  }

  async getEvents(aggregateId: EntityId, fromVersion?: number, toVersion?: number): Promise<ApplicationDomainEvent[]> {
    const where: Record<string, unknown> = {
      aggregateId: aggregateId.value,
      deletedAt: null,
    };

    if (fromVersion !== undefined) {
      where.eventVersion = { $gte: fromVersion };
    }

    if (toVersion !== undefined) {
      where.eventVersion = { ...where.eventVersion, $lte: toVersion };
    }

    const eventEntities = await this.em.find(this.eventEntityClass, where, {
      orderBy: { eventVersion: "asc" },
    });

    // 转换为应用层定义的 DomainEvent 类型
    return eventEntities.map((entity) => this.entityToDomainEvent(entity));
  }

  async getEventStream(aggregateId: EntityId, fromVersion?: number, toVersion?: number): Promise<EventStream> {
    const events = await this.getEvents(aggregateId, fromVersion, toVersion);

    // 返回应用层定义的 EventStream 类型
    return {
      aggregateId,
      events,
      fromVersion: events.length > 0 ? events[0].version : fromVersion || 0,
      toVersion: events.length > 0 ? events[events.length - 1].version : toVersion || 0,
      totalEvents: events.length,
      hasMore: false,
    };
  }

  private entityToDomainEvent(entity: EventEntity): ApplicationDomainEvent {
    // 使用应用层定义的 DomainEvent 构造函数
    return new ApplicationDomainEvent(EntityId.fromString(entity.aggregateId), entity.eventType, this.deserializeEventData(entity.data), entity.metadata || {}, EntityId.fromString(entity.eventId), entity.timestamp, entity.eventVersion);
  }

  // ... 实现其他接口方法
}
```

**支持作用**:

- ✅ **接口契约**：定义清晰的事件存储契约，基础设施层必须遵守
- ✅ **技术无关**：接口不涉及具体数据库实现，基础设施层可以自由选择技术栈
- ✅ **类型安全**：通过 TypeScript 接口确保类型安全

---

### 2. 事件类型系统 (Event Type System)

#### DomainEvent - 领域事件类型

应用层定义领域事件的结构和类型，基础设施层使用该类型进行序列化和持久化。

**应用层定义**:

```typescript
// @hl8/application-kernel
import { DomainEvent as BaseDomainEvent, EntityId } from "@hl8/domain-kernel";

export class DomainEvent extends BaseDomainEvent {
  constructor(aggregateRootId: EntityId, eventType: string, data: unknown, metadata: Record<string, unknown> = {}, eventId?: EntityId, timestamp?: Date, version: number = 1) {
    super(aggregateRootId, eventType, data, metadata, eventId, timestamp, version);
  }

  public toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId.toString(),
      aggregateRootId: this.aggregateRootId.toString(),
      timestamp: this.timestamp.toISOString(),
      version: this.version,
      eventType: this.eventType,
      data: this.data,
      metadata: this.metadata,
    };
  }

  public clone(): DomainEvent {
    return new DomainEvent(this.aggregateRootId, this.eventType, this.data, { ...this.metadata }, this.eventId);
  }
}
```

**基础设施层使用**:

```typescript
// @hl8/infrastructure-kernel - 事件实体转换
import { DomainEvent as ApplicationDomainEvent } from "@hl8/application-kernel";
import { EntityId } from "@hl8/domain-kernel";

export class MikroORMEventStore {
  private entityToDomainEvent(entity: EventEntity): ApplicationDomainEvent {
    // 使用应用层定义的 DomainEvent 构造函数
    return new ApplicationDomainEvent(EntityId.fromString(entity.aggregateId), entity.eventType, this.deserializeEventData(entity.data), entity.metadata || {}, EntityId.fromString(entity.eventId), entity.timestamp, entity.eventVersion);
  }

  private serializeEventData(data: unknown): Record<string, unknown> {
    // 使用应用层 DomainEvent 的 toJSON 方法
    if (data === null || data === undefined) {
      return {};
    }

    if (typeof data === "object") {
      return data as Record<string, unknown>;
    }

    return { value: data };
  }

  async saveEvents(aggregateId: EntityId, events: ApplicationDomainEvent[], expectedVersion: number): Promise<EventStoreResult> {
    for (const event of events) {
      const eventEntity = new EventEntity();
      // 使用应用层 DomainEvent 的属性
      eventEntity.aggregateId = event.aggregateRootId.value;
      eventEntity.eventType = event.eventType;
      eventEntity.eventId = event.eventId.value;
      eventEntity.data = this.serializeEventData(event.data);
      eventEntity.metadata = event.metadata;
      eventEntity.timestamp = event.timestamp;
      eventEntity.eventVersion = event.version;

      this.em.persist(eventEntity);
    }

    await this.em.flush();
    return {
      /* ... */
    };
  }
}
```

**支持作用**:

- ✅ **事件结构统一**：确保所有基础设施层实现使用统一的事件结构
- ✅ **序列化支持**：提供标准的事件序列化方法
- ✅ **版本管理**：事件版本信息由应用层定义，基础设施层遵守

---

#### EventSnapshot - 事件快照类型

应用层定义事件快照的结构，基础设施层使用该类型进行快照存储和恢复。

**应用层定义**:

```typescript
// @hl8/application-kernel
import { EntityId } from "@hl8/domain-kernel";

export class EventSnapshot {
  public readonly aggregateId: EntityId;
  public readonly version: number;
  public readonly data: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly type: string;
  public readonly metadata: Record<string, unknown>;

  constructor(aggregateId: EntityId, version: number, data: Record<string, unknown>, type: string, metadata: Record<string, unknown> = {}, timestamp?: Date) {
    this.aggregateId = aggregateId;
    this.version = version;
    this.data = { ...data };
    this.type = type;
    this.metadata = { ...metadata };
    this.timestamp = timestamp || new Date();
  }

  public toJSON(): Record<string, unknown> {
    return {
      aggregateId: this.aggregateId.toString(),
      version: this.version,
      data: this.data,
      type: this.type,
      metadata: this.metadata,
      timestamp: this.timestamp.toISOString(),
    };
  }

  public static fromJSON(json: Record<string, unknown>): EventSnapshot {
    return new EventSnapshot(EntityId.fromString(json.aggregateId as string), json.version as number, json.data as Record<string, unknown>, json.type as string, json.metadata as Record<string, unknown>, new Date(json.timestamp as string));
  }
}
```

**基础设施层使用**:

```typescript
// @hl8/infrastructure-kernel - 快照存储实现
import { EventSnapshot } from "@hl8/application-kernel";

export class MikroORMEventStore {
  async getSnapshot(aggregateId: EntityId, version?: number): Promise<EventSnapshot | null> {
    const snapshotEntity = await this.em.findOne(
      this.snapshotEntityClass,
      {
        aggregateId: aggregateId.value,
        snapshotVersion: version,
        deletedAt: null,
      },
      {
        orderBy: version === undefined ? { snapshotVersion: "desc" } : undefined,
      },
    );

    if (!snapshotEntity) {
      return null;
    }

    // 使用应用层定义的 EventSnapshot 构造函数
    return new EventSnapshot(aggregateId, snapshotEntity.snapshotVersion, snapshotEntity.data, snapshotEntity.snapshotType, snapshotEntity.metadata || {}, snapshotEntity.timestamp);
  }

  async saveSnapshot(snapshot: EventSnapshot): Promise<EventStoreResult> {
    // 使用应用层定义的 EventSnapshot 属性
    const snapshotEntity = new EventSnapshotEntity();
    snapshotEntity.aggregateId = snapshot.aggregateId.value;
    snapshotEntity.snapshotVersion = snapshot.version;
    snapshotEntity.data = snapshot.data;
    snapshotEntity.snapshotType = snapshot.type;
    snapshotEntity.metadata = snapshot.metadata;
    snapshotEntity.timestamp = snapshot.timestamp;

    this.em.persist(snapshotEntity);
    await this.em.flush();

    return {
      success: true,
      eventsCount: 1,
      newVersion: snapshot.version,
      timestamp: new Date(),
    };
  }
}
```

**支持作用**:

- ✅ **快照结构统一**：确保快照在不同技术实现中保持一致
- ✅ **优化支持**：快照用于优化事件重放性能
- ✅ **序列化支持**：提供标准的快照序列化方法

---

### 3. 事件流类型 (Event Stream Type)

#### EventStream - 事件流类型

应用层定义事件流的结构，基础设施层返回该类型以提供事件流的元数据。

**应用层定义**:

```typescript
// @hl8/application-kernel
export interface EventStream {
  /** 聚合根ID */
  aggregateId: EntityId;
  /** 事件列表 */
  events: DomainEvent[];
  /** 起始版本号 */
  fromVersion: number;
  /** 结束版本号 */
  toVersion: number;
  /** 总事件数量 */
  totalEvents: number;
  /** 是否有更多事件 */
  hasMore: boolean;
}
```

**基础设施层使用**:

```typescript
// @hl8/infrastructure-kernel - 事件流实现
import { EventStream, DomainEvent } from "@hl8/application-kernel";

export class MikroORMEventStore {
  async getEventStream(aggregateId: EntityId, fromVersion?: number, toVersion?: number): Promise<EventStream> {
    // 获取事件（使用应用层定义的 DomainEvent 类型）
    const events = await this.getEvents(aggregateId, fromVersion, toVersion);

    // 返回应用层定义的 EventStream 类型
    return {
      aggregateId,
      events, // DomainEvent[]
      fromVersion: events.length > 0 ? events[0].version : fromVersion || 0,
      toVersion: events.length > 0 ? events[events.length - 1].version : toVersion || 0,
      totalEvents: events.length,
      hasMore: false, // 暂时不支持分页，返回全部事件
    };
  }
}
```

**支持作用**:

- ✅ **流式处理支持**：提供事件流的标准化结构
- ✅ **元数据丰富**：包含版本范围、事件数量等元数据
- ✅ **分页支持**：通过 `hasMore` 字段支持分页查询

---

### 4. 结果和统计类型 (Result and Statistics Types)

#### EventStoreResult - 事件存储结果类型

应用层定义事件存储操作的结果类型，基础设施层使用该类型返回操作结果。

**应用层定义**:

```typescript
// @hl8/application-kernel
export interface EventStoreResult {
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 保存的事件数量 */
  eventsCount: number;
  /** 新版本号 */
  newVersion: number;
  /** 操作时间戳 */
  timestamp: Date;
}
```

**基础设施层使用**:

```typescript
// @hl8/infrastructure-kernel - 结果返回
import { EventStoreResult } from "@hl8/application-kernel";

export class MikroORMEventStore {
  async saveEvents(aggregateId: EntityId, events: ApplicationDomainEvent[], expectedVersion: number): Promise<EventStoreResult> {
    try {
      // ... 保存逻辑

      // 返回应用层定义的 EventStoreResult 类型
      return {
        success: true,
        eventsCount: events.length,
        newVersion: nextVersion,
        timestamp: new Date(),
      };
    } catch (error) {
      // 错误时也返回相同类型
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        eventsCount: 0,
        newVersion: expectedVersion,
        timestamp: new Date(),
      };
    }
  }
}
```

**支持作用**:

- ✅ **结果标准化**：统一操作结果的格式
- ✅ **错误处理**：标准化的错误信息格式
- ✅ **版本追踪**：包含版本信息用于乐观并发控制

---

#### EventStoreStatistics - 统计信息类型

应用层定义事件存储的统计信息类型，基础设施层使用该类型返回统计信息。

**应用层定义**:

```typescript
// @hl8/application-kernel
export interface EventStoreStatistics {
  /** 总事件数量 */
  totalEvents: number;
  /** 聚合根数量 */
  aggregateCount: number;
  /** 快照数量 */
  snapshotCount: number;
  /** 存储大小（字节） */
  storageSize: number;
  /** 最后更新时间 */
  lastUpdated: Date;
  /** 按类型分组的统计 */
  byType: Record<string, number>;
  /** 按聚合根分组的统计 */
  byAggregate: Record<string, number>;
}
```

**基础设施层使用**:

```typescript
// @hl8/infrastructure-kernel - 统计信息实现
import { EventStoreStatistics } from "@hl8/application-kernel";

export class MikroORMEventStore {
  async getStatistics(aggregateId?: EntityId): Promise<EventStoreStatistics> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (aggregateId) {
      where.aggregateId = aggregateId.value;
    }

    // 统计事件总数
    const totalEvents = await this.em.count(this.eventEntityClass, where);

    // 统计聚合根数量
    let aggregateCount = 0;
    if (aggregateId) {
      aggregateCount = 1;
    } else {
      // 统计不同的聚合根ID
      const allEvents = await this.em.find(this.eventEntityClass, where, {
        fields: ["aggregateId"],
      });
      const distinctAggregateIds = new Set(allEvents.map((e) => e.aggregateId));
      aggregateCount = distinctAggregateIds.size;
    }

    // 统计快照数量
    const snapshotCount = await this.em.count(this.snapshotEntityClass, where);

    // 返回应用层定义的 EventStoreStatistics 类型
    return {
      totalEvents,
      aggregateCount,
      snapshotCount,
      storageSize: totalEvents * 1024, // 粗略估算
      lastUpdated: new Date(),
      byType: {}, // 按类型分组统计
      byAggregate: {}, // 按聚合根分组统计
    };
  }
}
```

**支持作用**:

- ✅ **监控支持**：提供标准化的统计信息用于监控
- ✅ **性能分析**：包含存储大小等性能指标
- ✅ **分组统计**：支持按类型和聚合根分组统计

---

### 5. 配置接口 (Configuration Interfaces)

#### EventStoreConfig - 事件存储配置接口

应用层定义事件存储的配置接口，基础设施层根据配置进行技术选型和实现。

**应用层定义**:

```typescript
// @hl8/application-kernel
export interface EventStoreConfig {
  /** 存储类型 */
  type: "postgresql" | "mongodb" | "hybrid";
  /** PostgreSQL 连接配置 */
  postgresql?: {
    connectionString: string;
    schema?: string;
  };
  /** MongoDB 连接配置 */
  mongodb?: {
    connectionString: string;
    database?: string;
  };
  /** 快照配置 */
  snapshots?: {
    enabled: boolean;
    interval: number;
    maxAge: number;
  };
  /** 性能配置 */
  performance?: {
    batchSize: number;
    connectionPoolSize: number;
    queryTimeout: number;
  };
}
```

**基础设施层使用**:

```typescript
// @hl8/infrastructure-kernel - 配置使用
import { EventStoreConfig } from "@hl8/application-kernel";

export class MikroORMEventStore implements IEventStore {
  constructor(
    private readonly em: EntityManager,
    private readonly config: EventStoreConfig,
  ) {
    // 根据应用层定义的配置进行初始化
    if (config.type === "postgresql" && config.postgresql) {
      // 使用 PostgreSQL 配置
      this.initializePostgreSQL(config.postgresql);
    } else if (config.type === "mongodb" && config.mongodb) {
      // 使用 MongoDB 配置
      this.initializeMongoDB(config.mongodb);
    } else if (config.type === "hybrid") {
      // 使用混合存储策略
      this.initializeHybrid(config);
    }
  }

  private initializePostgreSQL(config: EventStoreConfig["postgresql"]) {
    // 使用配置初始化 PostgreSQL 连接
  }

  private initializeMongoDB(config: EventStoreConfig["mongodb"]) {
    // 使用配置初始化 MongoDB 连接
  }
}
```

**支持作用**:

- ✅ **配置标准化**：统一的配置接口，便于管理
- ✅ **技术选型**：通过配置决定使用哪种数据库
- ✅ **性能调优**：通过配置调整性能参数

---

## 基础设施层实现模式

### 模式 1: 接口实现模式

```typescript
// 基础设施层：实现应用层定义的事件存储接口
import { IEventStore, EventStoreResult, EventStream, DomainEvent, EventSnapshot } from "@hl8/application-kernel";
import { EntityId } from "@hl8/domain-kernel";
import { EntityManager } from "@mikro-orm/core";

export class MikroORMEventStore implements IEventStore {
  constructor(
    private readonly em: EntityManager,
    private readonly config: EventStoreConfig,
  ) {}

  // 实现应用层定义的所有接口方法
  async saveEvents(aggregateId: EntityId, events: DomainEvent[], expectedVersion: number): Promise<EventStoreResult> {
    // 实现逻辑...
  }

  async getEvents(aggregateId: EntityId, fromVersion?: number, toVersion?: number): Promise<DomainEvent[]> {
    // 实现逻辑...
  }

  // ... 实现其他接口方法
}
```

**应用层支持点**:

1. ✅ `IEventStore` 接口：定义事件存储契约
2. ✅ `DomainEvent` 类型：事件类型定义
3. ✅ `EventStoreResult` 类型：结果类型定义
4. ✅ `EventStream` 类型：事件流类型定义

---

### 模式 2: 类型适配模式

```typescript
// 基础设施层：将数据库实体适配为应用层类型
import { DomainEvent, EventSnapshot } from "@hl8/application-kernel";
import { EntityId } from "@hl8/domain-kernel";

export class MikroORMEventStore {
  // 将数据库实体转换为应用层的 DomainEvent
  private entityToDomainEvent(entity: EventEntity): DomainEvent {
    return new DomainEvent(EntityId.fromString(entity.aggregateId), entity.eventType, this.deserializeEventData(entity.data), entity.metadata || {}, EntityId.fromString(entity.eventId), entity.timestamp, entity.eventVersion);
  }

  // 将应用层的 EventSnapshot 转换为数据库实体
  private snapshotToEntity(snapshot: EventSnapshot): EventSnapshotEntity {
    const entity = new EventSnapshotEntity();
    entity.aggregateId = snapshot.aggregateId.value;
    entity.snapshotVersion = snapshot.version;
    entity.data = snapshot.data;
    entity.snapshotType = snapshot.type;
    entity.metadata = snapshot.metadata;
    entity.timestamp = snapshot.timestamp;
    return entity;
  }
}
```

**应用层支持点**:

1. ✅ `DomainEvent` 构造函数：提供标准化的事件创建方式
2. ✅ `EventSnapshot` 类型：提供标准化的快照类型

---

### 模式 3: 配置驱动模式

```typescript
// 基础设施层：根据应用层配置进行技术选型
import { EventStoreConfig } from "@hl8/application-kernel";

export class MikroORMEventStoreFactory {
  static create(config: EventStoreConfig, em: EntityManager): IEventStore {
    // 根据应用层定义的配置选择实现
    switch (config.type) {
      case "postgresql":
        return new PostgreSQLEventStore(em, config);
      case "mongodb":
        return new MongoDBEventStore(em, config);
      case "hybrid":
        return new HybridEventStore(em, config);
      default:
        throw new Error(`不支持的存储类型: ${config.type}`);
    }
  }
}
```

**应用层支持点**:

1. ✅ `EventStoreConfig` 接口：定义配置结构
2. ✅ 配置类型枚举：`"postgresql" | "mongodb" | "hybrid"`

---

## 实际应用示例

### 示例 1: 完整的事件存储实现

```typescript
// 应用层：定义事件存储接口和类型
// @hl8/application-kernel
export interface IEventStore {
  saveEvents(aggregateId: EntityId, events: DomainEvent[], expectedVersion: number): Promise<EventStoreResult>;

  getEvents(aggregateId: EntityId, fromVersion?: number, toVersion?: number): Promise<DomainEvent[]>;

  getSnapshot(aggregateId: EntityId, version?: number): Promise<EventSnapshot | null>;
}

// 基础设施层：实现事件存储接口
// @hl8/infrastructure-kernel
import { IEventStore, DomainEvent, EventStoreResult, EventSnapshot } from "@hl8/application-kernel";
import { EntityId } from "@hl8/domain-kernel";

export class MikroORMEventStore implements IEventStore {
  constructor(
    private readonly em: EntityManager,
    private readonly config: EventStoreConfig,
  ) {}

  async saveEvents(aggregateId: EntityId, events: DomainEvent[], expectedVersion: number): Promise<EventStoreResult> {
    // 1. 验证版本（使用应用层定义的接口）
    const currentVersion = await this.getCurrentVersion(aggregateId);
    if (currentVersion !== expectedVersion) {
      return {
        success: false,
        error: `版本冲突：期望 ${expectedVersion}，实际 ${currentVersion}`,
        eventsCount: 0,
        newVersion: currentVersion,
        timestamp: new Date(),
      };
    }

    // 2. 保存事件（使用应用层定义的 DomainEvent 类型）
    let nextVersion = expectedVersion;
    for (const event of events) {
      nextVersion++;
      const entity = new EventEntity();
      entity.aggregateId = event.aggregateRootId.value;
      entity.eventType = event.eventType;
      entity.eventId = event.eventId.value;
      entity.data = this.serializeEventData(event.data);
      entity.metadata = event.metadata;
      entity.timestamp = event.timestamp;
      entity.eventVersion = event.version;

      this.em.persist(entity);
    }

    await this.em.flush();

    // 3. 返回结果（使用应用层定义的 EventStoreResult 类型）
    return {
      success: true,
      eventsCount: events.length,
      newVersion: nextVersion,
      timestamp: new Date(),
    };
  }

  async getEvents(aggregateId: EntityId, fromVersion?: number, toVersion?: number): Promise<DomainEvent[]> {
    const where: Record<string, unknown> = {
      aggregateId: aggregateId.value,
      deletedAt: null,
    };

    if (fromVersion !== undefined) {
      where.eventVersion = { $gte: fromVersion };
    }

    if (toVersion !== undefined) {
      where.eventVersion = { ...where.eventVersion, $lte: toVersion };
    }

    const entities = await this.em.find(EventEntity, where, {
      orderBy: { eventVersion: "asc" },
    });

    // 转换为应用层定义的 DomainEvent 类型
    return entities.map((entity) => this.entityToDomainEvent(entity));
  }

  async getSnapshot(aggregateId: EntityId, version?: number): Promise<EventSnapshot | null> {
    const snapshotEntity = await this.em.findOne(
      EventSnapshotEntity,
      {
        aggregateId: aggregateId.value,
        snapshotVersion: version,
        deletedAt: null,
      },
      {
        orderBy: version === undefined ? { snapshotVersion: "desc" } : undefined,
      },
    );

    if (!snapshotEntity) {
      return null;
    }

    // 使用应用层定义的 EventSnapshot 构造函数
    return new EventSnapshot(aggregateId, snapshotEntity.snapshotVersion, snapshotEntity.data, snapshotEntity.snapshotType, snapshotEntity.metadata || {}, snapshotEntity.timestamp);
  }

  private entityToDomainEvent(entity: EventEntity): DomainEvent {
    // 使用应用层定义的 DomainEvent 构造函数
    return new DomainEvent(EntityId.fromString(entity.aggregateId), entity.eventType, this.deserializeEventData(entity.data), entity.metadata || {}, EntityId.fromString(entity.eventId), entity.timestamp, entity.eventVersion);
  }
}
```

**应用层支持点**:

1. ✅ `IEventStore` 接口：定义事件存储契约
2. ✅ `DomainEvent` 类型：事件类型定义
3. ✅ `EventStoreResult` 类型：结果类型定义
4. ✅ `EventSnapshot` 类型：快照类型定义

---

### 示例 2: 配置驱动的存储实现

```typescript
// 应用层：定义配置接口
// @hl8/application-kernel
export interface ApplicationKernelModuleOptions {
  eventStore?: {
    type: "postgresql" | "mongodb" | "hybrid";
    postgresql?: string;
    mongodb?: string;
  };
}

// 基础设施层：根据配置选择实现
// @hl8/infrastructure-kernel
import { ApplicationKernelModuleOptions } from "@hl8/application-kernel";

export class EventStoreFactory {
  static create(options: ApplicationKernelModuleOptions["eventStore"], em: EntityManager): IEventStore {
    if (!options || !options.type) {
      throw new Error("事件存储配置不能为空");
    }

    // 根据应用层定义的配置类型选择实现
    switch (options.type) {
      case "postgresql":
        return new PostgreSQLEventStore(em, {
          connectionString: options.postgresql!,
        });

      case "mongodb":
        return new MongoDBEventStore(em, {
          connectionString: options.mongodb!,
        });

      case "hybrid":
        return new HybridEventStore(em, {
          postgresql: options.postgresql,
          mongodb: options.mongodb,
        });

      default:
        throw new Error(`不支持的存储类型: ${options.type}`);
    }
  }
}
```

**应用层支持点**:

1. ✅ `ApplicationKernelModuleOptions` 接口：定义模块配置
2. ✅ 存储类型枚举：`"postgresql" | "mongodb" | "hybrid"`

---

## 最佳实践

### 1. 接口实现

**✅ 正确做法**:

```typescript
// 基础设施层完整实现应用层定义的接口
import { IEventStore, DomainEvent } from "@hl8/application-kernel";

export class MikroORMEventStore implements IEventStore {
  async saveEvents(
    aggregateId: EntityId,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<EventStoreResult> {
    // 完整实现接口方法
  }

  // 实现所有必需的方法
  async getEvents(...): Promise<DomainEvent[]> { /* ... */ }
  async getEventStream(...): Promise<EventStream> { /* ... */ }
  // ... 其他方法
}
```

**❌ 错误做法**:

```typescript
// 不要部分实现接口
export class MikroORMEventStore implements IEventStore {
  async saveEvents(...) { /* ... */ }
  // ❌ 缺少其他必需的方法
}
```

### 2. 类型使用

**✅ 正确做法**:

```typescript
// 使用应用层定义的类型
import { DomainEvent, EventSnapshot } from "@hl8/application-kernel";

private entityToDomainEvent(entity: EventEntity): DomainEvent {
  return new DomainEvent(/* ... */); // 使用应用层构造函数
}

async getSnapshot(...): Promise<EventSnapshot | null> {
  // 返回应用层定义的 EventSnapshot 类型
}
```

**❌ 错误做法**:

```typescript
// 不要创建自己的类型或绕过应用层类型
class MyDomainEvent {
  /* ... */
} // ❌
type MySnapshot = {
  /* ... */
}; // ❌
```

### 3. 配置使用

**✅ 正确做法**:

```typescript
// 使用应用层定义的配置接口
import { EventStoreConfig } from "@hl8/application-kernel";

constructor(
  private readonly config: EventStoreConfig
) {
  // 根据配置进行初始化
  if (config.type === "postgresql") {
    // ...
  }
}
```

**❌ 错误做法**:

```typescript
// 不要定义自己的配置类型
interface MyEventStoreConfig {
  /* ... */
} // ❌
```

### 4. 错误处理

**✅ 正确做法**:

```typescript
// 返回应用层定义的结果类型
async saveEvents(...): Promise<EventStoreResult> {
  try {
    // ...
    return {
      success: true,
      eventsCount: events.length,
      newVersion: nextVersion,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      eventsCount: 0,
      newVersion: expectedVersion,
      timestamp: new Date(),
    };
  }
}
```

**❌ 错误做法**:

```typescript
// 不要抛出异常或返回自定义格式
async saveEvents(...) {
  throw new Error("..."); // ❌ 应该返回 EventStoreResult
  return { custom: "format" }; // ❌ 应该返回标准格式
}
```

### 5. 版本控制

**✅ 正确做法**:

```typescript
// 遵守应用层定义的乐观并发控制
async saveEvents(
  aggregateId: EntityId,
  events: DomainEvent[],
  expectedVersion: number, // 使用应用层定义的版本参数
): Promise<EventStoreResult> {
  const currentVersion = await this.getCurrentVersion(aggregateId);
  if (currentVersion !== expectedVersion) {
    // 返回失败结果，而不是抛出异常
    return {
      success: false,
      error: "版本冲突",
      // ...
    };
  }
  // ...
}
```

**❌ 错误做法**:

```typescript
// 不要忽略版本控制
async saveEvents(...) {
  // ❌ 直接保存，不检查版本
  await this.em.persist(entity);
}
```

---

## 总结

### 核心支持作用总结

| 应用层组件                         | 基础设施层使用场景 | 关键支持作用                     |
| ---------------------------------- | ------------------ | -------------------------------- |
| **IEventStore**                    | 事件存储实现       | 定义事件存储契约，确保实现一致性 |
| **DomainEvent**                    | 事件类型和序列化   | 统一事件结构，版本管理           |
| **EventSnapshot**                  | 快照存储和恢复     | 优化事件重放性能                 |
| **EventStream**                    | 事件流查询         | 提供事件流的标准化结构           |
| **EventStoreResult**               | 操作结果返回       | 统一操作结果格式                 |
| **EventStoreStatistics**           | 统计信息返回       | 标准化的监控和性能分析           |
| **EventStoreConfig**               | 配置管理           | 技术选型和性能调优               |
| **ApplicationKernelModuleOptions** | 模块配置           | 统一的模块配置接口               |

### 设计原则体现

1. **依赖倒置原则 (DIP)**:
   - ✅ 基础设施层依赖应用层的抽象接口
   - ✅ 应用层定义接口，基础设施层实现接口

2. **接口隔离原则 (ISP)**:
   - ✅ 应用层提供细粒度的接口（如 `IEventStore`）
   - ✅ 基础设施层可以选择性地实现接口

3. **单一职责原则 (SRP)**:
   - ✅ 应用层：定义接口和架构模式
   - ✅ 基础设施层：实现接口和技术适配

4. **开放封闭原则 (OCP)**:
   - ✅ 应用层接口对扩展开放（可以添加新方法）
   - ✅ 基础设施层实现对修改封闭（只需实现接口）

### 关键收益

1. **接口契约明确**:
   - 应用层定义的接口明确了基础设施层的实现要求
   - 确保不同实现（PostgreSQL、MongoDB）的一致性

2. **类型安全保证**:
   - 应用层提供完整的类型定义
   - 基础设施层实现时获得类型检查和自动补全

3. **技术无关性**:
   - 通过接口抽象，基础设施层可以切换不同的技术栈
   - 配置驱动模式支持灵活的技术选型

4. **架构模式支持**:
   - 应用层提供 CQRS、事件溯源等架构模式的标准化接口
   - 基础设施层只需关注技术实现，不需要理解业务逻辑

5. **可测试性**:
   - 基础设施层可以通过 Mock 应用层接口进行测试
   - 应用层接口可以独立测试

6. **版本兼容性**:
   - 应用层定义的版本控制机制确保数据一致性
   - 基础设施层只需遵守版本控制接口即可

---

## 下一步学习

1. **深入学习应用层**:
   - 阅读应用层的 API 文档了解完整的接口定义
   - 学习 CQRS 和事件溯源模式

2. **深入学习基础设施层**:
   - 阅读 `@hl8/infrastructure-kernel` 的文档了解实现细节
   - 学习 MikroORM 的使用和最佳实践

3. **实践项目**:
   - 根据本文档的示例实现一个完整的事件存储
   - 体验应用层对基础设施层的支持作用

**祝你开发顺利！** 🚀
