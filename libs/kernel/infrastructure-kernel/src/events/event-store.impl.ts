/**
 * @fileoverview MikroORM事件存储实现
 * @description 实现 application-kernel 的 IEventStore 接口，提供事件存储的数据库持久化支持
 */

import { EntityManager } from "@mikro-orm/core";
import { EntityId } from "@hl8/domain-kernel";
import {
  IEventStore,
  EventStoreResult,
  EventStream,
  EventStoreStatistics,
  DomainEvent as ApplicationDomainEvent,
  EventSnapshot,
} from "@hl8/application-kernel";
import { EventEntity } from "./event-entity.js";
import { EventSnapshotEntity } from "./event-snapshot-entity.js";

/**
 * MikroORM事件存储实现
 * @description 使用MikroORM实现事件存储，支持PostgreSQL和MongoDB
 */
export class MikroORMEventStore implements IEventStore {
  /**
   * 创建事件存储实例
   * @param em MikroORM EntityManager实例
   * @param eventEntityClass 事件实体类（用于类型安全的查询）
   * @param snapshotEntityClass 快照实体类（用于类型安全的查询）
   */
  constructor(
    private readonly em: EntityManager,
    private readonly eventEntityClass: typeof EventEntity = EventEntity,
    private readonly snapshotEntityClass: typeof EventSnapshotEntity = EventSnapshotEntity,
  ) {
    if (!em) {
      throw new Error("EntityManager不能为空");
    }
  }

  /**
   * 保存事件
   * @description 将领域事件保存到数据库，支持乐观并发控制
   * @param aggregateId 聚合根ID
   * @param events 事件列表
   * @param expectedVersion 期望版本号，用于乐观并发控制
   * @returns 保存结果
   * @throws {Error} 当版本冲突或保存失败时抛出
   */
  async saveEvents(
    aggregateId: EntityId,
    events: ApplicationDomainEvent[],
    expectedVersion: number,
  ): Promise<EventStoreResult> {
    if (!events || events.length === 0) {
      throw new Error("事件列表不能为空");
    }

    try {
      // 验证版本号
      const currentVersion = await this.getCurrentVersion(aggregateId);
      if (currentVersion !== expectedVersion) {
        throw new Error(
          `版本冲突：期望版本 ${expectedVersion}，实际版本 ${currentVersion}`,
        );
      }

      // 创建事件实体并保存
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
        eventEntity.aggregateType = event.metadata?.aggregateType as
          | string
          | undefined;

        eventEntities.push(eventEntity);
        this.em.persist(eventEntity);
      }

      await this.em.flush();

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

  /**
   * 获取聚合根的所有事件
   * @description 获取指定聚合根的事件列表，支持版本范围过滤
   * @param aggregateId 聚合根ID
   * @param fromVersion 起始版本号，可选
   * @param toVersion 结束版本号，可选
   * @returns 事件列表
   */
  async getEvents(
    aggregateId: EntityId,
    fromVersion?: number,
    toVersion?: number,
  ): Promise<ApplicationDomainEvent[]> {
    try {
      const where: Record<string, any> = {
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

      return eventEntities.map((entity) => this.entityToDomainEvent(entity));
    } catch (error) {
      throw new Error(
        `获取事件失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 获取聚合根的事件流
   * @description 获取包含元数据的事件流
   * @param aggregateId 聚合根ID
   * @param fromVersion 起始版本号，可选
   * @param toVersion 结束版本号，可选
   * @returns 事件流
   */
  async getEventStream(
    aggregateId: EntityId,
    fromVersion?: number,
    toVersion?: number,
  ): Promise<EventStream> {
    const events = await this.getEvents(aggregateId, fromVersion, toVersion);

    const firstVersion =
      events.length > 0 ? events[0].version : fromVersion || 0;
    const lastVersion =
      events.length > 0 ? events[events.length - 1].version : toVersion || 0;

    return {
      aggregateId,
      events,
      fromVersion: firstVersion,
      toVersion: lastVersion,
      totalEvents: events.length,
      hasMore: false, // 暂时不支持分页，返回全部事件
    };
  }

  /**
   * 获取所有事件
   * @description 获取系统中的所有事件，支持时间范围和数量限制
   * @param fromTimestamp 起始时间戳，可选
   * @param toTimestamp 结束时间戳，可选
   * @param limit 限制数量，可选
   * @returns 事件列表
   */
  async getAllEvents(
    fromTimestamp?: Date,
    toTimestamp?: Date,
    limit?: number,
  ): Promise<ApplicationDomainEvent[]> {
    try {
      const where: Record<string, any> = {
        deletedAt: null,
      };

      if (fromTimestamp) {
        where.timestamp = { $gte: fromTimestamp };
      }

      if (toTimestamp) {
        where.timestamp = {
          ...where.timestamp,
          $lte: toTimestamp,
        };
      }

      const options: any = {
        orderBy: { timestamp: "asc" },
      };

      if (limit) {
        options.limit = limit;
      }

      const eventEntities = await this.em.find(
        this.eventEntityClass,
        where,
        options,
      );

      return eventEntities.map((entity) => this.entityToDomainEvent(entity));
    } catch (error) {
      throw new Error(
        `获取所有事件失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 获取事件快照
   * @description 获取指定聚合根的快照，用于优化事件重放性能
   * @param aggregateId 聚合根ID
   * @param version 版本号，可选，默认最新版本
   * @returns 事件快照
   */
  async getSnapshot(
    aggregateId: EntityId,
    version?: number,
  ): Promise<EventSnapshot | null> {
    try {
      const where: Record<string, any> = {
        aggregateId: aggregateId.value,
        deletedAt: null,
      };

      if (version !== undefined) {
        where.snapshotVersion = version;
      }

      const snapshotEntity = await this.em.findOne(
        this.snapshotEntityClass,
        where,
        {
          orderBy:
            version === undefined ? { snapshotVersion: "desc" } : undefined,
        },
      );

      if (!snapshotEntity) {
        return null;
      }

      // 创建 EventSnapshot 实例
      return new EventSnapshot(
        aggregateId,
        snapshotEntity.snapshotVersion,
        snapshotEntity.data,
        snapshotEntity.snapshotType,
        snapshotEntity.metadata || {},
        snapshotEntity.timestamp,
      );
    } catch (error) {
      throw new Error(
        `获取快照失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 保存事件快照
   * @description 保存事件快照，用于优化事件重放性能
   * @param snapshot 事件快照
   * @returns 保存结果
   */
  async saveSnapshot(snapshot: EventSnapshot): Promise<EventStoreResult> {
    try {
      // 检查是否已存在相同版本的快照
      const existing = await this.em.findOne(this.snapshotEntityClass, {
        aggregateId: snapshot.aggregateId.value,
        snapshotVersion: snapshot.version,
        deletedAt: null,
      });

      if (existing) {
        // 更新现有快照
        existing.data = snapshot.data;
        existing.metadata = snapshot.metadata;
        existing.timestamp = snapshot.timestamp;
        existing.snapshotType = snapshot.type;
        this.em.persist(existing);
      } else {
        // 创建新快照
        const snapshotEntity = new EventSnapshotEntity();
        snapshotEntity.aggregateId = snapshot.aggregateId.value;
        snapshotEntity.snapshotVersion = snapshot.version;
        snapshotEntity.data = snapshot.data;
        snapshotEntity.snapshotType = snapshot.type;
        snapshotEntity.metadata = snapshot.metadata;
        snapshotEntity.timestamp = snapshot.timestamp;
        this.em.persist(snapshotEntity);
      }

      await this.em.flush();

      return {
        success: true,
        eventsCount: 1,
        newVersion: snapshot.version,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        eventsCount: 0,
        newVersion: snapshot.version,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 删除事件快照
   * @description 删除指定聚合根的快照
   * @param aggregateId 聚合根ID
   * @param version 版本号，可选，默认删除所有版本
   * @returns 删除结果
   */
  async deleteSnapshot(
    aggregateId: EntityId,
    version?: number,
  ): Promise<EventStoreResult> {
    try {
      const where: Record<string, any> = {
        aggregateId: aggregateId.value,
        deletedAt: null,
      };

      if (version !== undefined) {
        where.snapshotVersion = version;
      }

      const snapshotEntities = await this.em.find(
        this.snapshotEntityClass,
        where,
      );

      for (const entity of snapshotEntities) {
        entity.softDelete();
        this.em.persist(entity);
      }

      await this.em.flush();

      return {
        success: true,
        eventsCount: snapshotEntities.length,
        newVersion: version || 0,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        eventsCount: 0,
        newVersion: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 获取聚合根的当前版本
   * @description 获取指定聚合根的最新事件版本号
   * @param aggregateId 聚合根ID
   * @returns 当前版本号
   */
  async getCurrentVersion(aggregateId: EntityId): Promise<number> {
    try {
      const latestEvent = await this.em.findOne(
        this.eventEntityClass,
        {
          aggregateId: aggregateId.value,
          deletedAt: null,
        },
        {
          orderBy: { eventVersion: "desc" },
        },
      );

      return latestEvent ? latestEvent.eventVersion : 0;
    } catch (error) {
      throw new Error(
        `获取当前版本失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 检查聚合根是否存在
   * @description 检查指定聚合根是否有事件记录
   * @param aggregateId 聚合根ID
   * @returns 是否存在
   */
  async exists(aggregateId: EntityId): Promise<boolean> {
    try {
      const count = await this.em.count(this.eventEntityClass, {
        aggregateId: aggregateId.value,
        deletedAt: null,
      });

      return count > 0;
    } catch (error) {
      throw new Error(
        `检查聚合根是否存在失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 获取事件统计信息
   * @description 获取事件存储的统计信息
   * @param aggregateId 聚合根ID，可选
   * @returns 统计信息
   */
  async getStatistics(aggregateId?: EntityId): Promise<EventStoreStatistics> {
    try {
      const where: Record<string, any> = {
        deletedAt: null,
      };

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
        // 使用原生查询获取不同的聚合根ID
        // 对于PostgreSQL和MongoDB，使用不同的查询方式
        try {
          // 先尝试使用find方法获取所有事件的aggregateId，然后去重
          const allEvents = await this.em.find(
            this.eventEntityClass,
            {
              deletedAt: null,
            },
            {
              fields: ["aggregateId"],
            },
          );
          const distinctAggregateIds = new Set<string>();
          for (const event of allEvents) {
            distinctAggregateIds.add(event.aggregateId);
          }
          aggregateCount = distinctAggregateIds.size;
        } catch (_error) {
          // 如果查询失败，使用更简单的方法：统计总数作为估算
          aggregateCount = totalEvents > 0 ? 1 : 0;
        }
      }

      // 统计快照数量
      const snapshotWhere: Record<string, any> = {
        deletedAt: null,
      };
      if (aggregateId) {
        snapshotWhere.aggregateId = aggregateId.value;
      }
      const snapshotCount = await this.em.count(
        this.snapshotEntityClass,
        snapshotWhere,
      );

      // 按类型分组统计（简化实现）
      const byType: Record<string, number> = {};
      if (aggregateId) {
        const events = await this.em.find(this.eventEntityClass, where);
        for (const event of events) {
          byType[event.eventType] = (byType[event.eventType] || 0) + 1;
        }
      }

      // 按聚合根分组统计（仅当不指定聚合根时）
      const byAggregate: Record<string, number> = {};
      if (!aggregateId) {
        const events = await this.em.find(this.eventEntityClass, where);
        for (const event of events) {
          byAggregate[event.aggregateId] =
            (byAggregate[event.aggregateId] || 0) + 1;
        }
      }

      // 存储大小估算（简化实现，实际可能需要更精确的计算）
      const storageSize = totalEvents * 1024; // 粗略估算，每个事件约1KB

      return {
        totalEvents,
        aggregateCount,
        snapshotCount,
        storageSize,
        lastUpdated: new Date(),
        byType,
        byAggregate,
      };
    } catch (error) {
      throw new Error(
        `获取统计信息失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 将事件实体转换为领域事件
   * @private
   * @param entity 事件实体
   * @returns 领域事件
   */
  private entityToDomainEvent(entity: EventEntity): ApplicationDomainEvent {
    // 创建领域事件实例
    // 使用 ApplicationDomainEvent 的构造函数来创建实例
    return new ApplicationDomainEvent(
      new EntityId(entity.aggregateId),
      entity.eventType,
      this.deserializeEventData(entity.data),
      entity.metadata || {},
      new EntityId(entity.eventId),
      entity.timestamp,
      entity.eventVersion,
    );
  }

  /**
   * 序列化事件数据
   * @private
   * @param data 事件数据
   * @returns 序列化后的数据
   */
  private serializeEventData(data: unknown): Record<string, unknown> {
    if (data === null || data === undefined) {
      return {};
    }

    if (typeof data === "object") {
      return data as Record<string, unknown>;
    }

    // 基本类型包装为对象
    return { value: data };
  }

  /**
   * 反序列化事件数据
   * @private
   * @param data 序列化后的数据
   * @returns 原始事件数据
   */
  private deserializeEventData(data: Record<string, unknown>): unknown {
    if (!data || Object.keys(data).length === 0) {
      return {};
    }

    // 如果是包装的基本类型，解包
    if (Object.keys(data).length === 1 && "value" in data) {
      return (data as { value: unknown }).value;
    }

    return data;
  }
}
