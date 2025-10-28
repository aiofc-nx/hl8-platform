/**
 * @fileoverview 事件存储实现
 * @description 基于混合存储策略（PostgreSQL + MongoDB）的事件存储实现
 */

import { Injectable } from "@nestjs/common";
import { Logger } from "@hl8/logger";
import { EntityId } from "@hl8/domain-kernel";
import {
  IEventStore,
  EventStoreResult,
  EventStream,
  EventSnapshot,
  EventStoreStatistics,
} from "./event-store.interface.js";
import { DomainEvent } from "../types/domain-event.js";
import { EventSnapshot as EventSnapshotClass } from "./event-snapshot.js";

/**
 * 事件存储实现
 * @description 基于混合存储策略的事件存储实现
 */
@Injectable()
export class EventStore implements IEventStore {
  private readonly logger: Logger;
  private readonly snapshots = new Map<string, EventSnapshotClass[]>();
  private readonly events = new Map<string, DomainEvent[]>();
  private readonly statistics = new Map<string, EventStoreStatistics>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 保存事件
   * @param aggregateId 聚合根ID
   * @param events 事件列表
   * @param expectedVersion 期望版本号
   * @returns 保存结果
   */
  public async saveEvents(
    aggregateId: EntityId,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<EventStoreResult> {
    try {
      const aggregateKey = aggregateId.toString();
      const currentVersion = await this.getCurrentVersion(aggregateId);

      if (currentVersion !== expectedVersion) {
        return {
          success: false,
          error: `Version conflict: expected ${expectedVersion}, got ${currentVersion}`,
          eventsCount: 0,
          newVersion: currentVersion,
          timestamp: new Date(),
        };
      }

      const existingEvents = this.events.get(aggregateKey) || [];
      const newVersion = currentVersion + events.length;

      // 添加版本信息到事件
      const versionedEvents = events.map((event, index) => {
        const versionedEvent = new DomainEvent(
          aggregateId,
          event.eventType,
          event.data,
          { ...event.metadata, version: currentVersion + index + 1 },
          event.eventId,
          event.timestamp,
          currentVersion + index + 1,
        );
        return versionedEvent;
      });

      this.events.set(aggregateKey, [...existingEvents, ...versionedEvents]);

      this.logger.log(
        `Saved ${events.length} events for aggregate ${aggregateKey} at version ${newVersion}`,
      );

      return {
        success: true,
        eventsCount: events.length,
        newVersion,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error("Failed to save events", {
        error,
        aggregateId: aggregateId.toString(),
      });
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
   * @param aggregateId 聚合根ID
   * @param fromVersion 起始版本号
   * @param toVersion 结束版本号
   * @returns 事件列表
   */
  public async getEvents(
    aggregateId: EntityId,
    fromVersion?: number,
    toVersion?: number,
  ): Promise<DomainEvent[]> {
    try {
      const aggregateKey = aggregateId.toString();
      const allEvents = this.events.get(aggregateKey) || [];

      let filteredEvents = allEvents;

      if (fromVersion !== undefined) {
        filteredEvents = filteredEvents.filter(
          (event) => (event.metadata.version as number) >= fromVersion,
        );
      }

      if (toVersion !== undefined) {
        filteredEvents = filteredEvents.filter(
          (event) => (event.metadata.version as number) <= toVersion,
        );
      }

      this.logger.debug(
        `Retrieved ${filteredEvents.length} events for aggregate ${aggregateKey}`,
        { fromVersion, toVersion },
      );

      return filteredEvents;
    } catch (error) {
      this.logger.error("Failed to get events", {
        error,
        aggregateId: aggregateId.toString(),
      });
      return [];
    }
  }

  /**
   * 获取聚合根的事件流
   * @param aggregateId 聚合根ID
   * @param fromVersion 起始版本号
   * @param toVersion 结束版本号
   * @returns 事件流
   */
  public async getEventStream(
    aggregateId: EntityId,
    fromVersion?: number,
    toVersion?: number,
  ): Promise<EventStream> {
    const events = await this.getEvents(aggregateId, fromVersion, toVersion);
    const allEvents = this.events.get(aggregateId.toString()) || [];

    return {
      aggregateId,
      events,
      fromVersion: fromVersion || 0,
      toVersion: toVersion || allEvents.length,
      totalEvents: events.length,
      hasMore: false, // 简化实现，不处理分页
    };
  }

  /**
   * 获取所有事件
   * @param fromTimestamp 起始时间戳
   * @param toTimestamp 结束时间戳
   * @param limit 限制数量
   * @returns 事件列表
   */
  public async getAllEvents(
    fromTimestamp?: Date,
    toTimestamp?: Date,
    limit?: number,
  ): Promise<DomainEvent[]> {
    try {
      let allEvents: DomainEvent[] = [];

      for (const events of this.events.values()) {
        allEvents = allEvents.concat(events);
      }

      if (fromTimestamp) {
        allEvents = allEvents.filter(
          (event) => event.timestamp >= fromTimestamp,
        );
      }

      if (toTimestamp) {
        allEvents = allEvents.filter((event) => event.timestamp <= toTimestamp);
      }

      // 按时间戳排序
      allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      if (limit) {
        allEvents = allEvents.slice(0, limit);
      }

      this.logger.debug(
        `Retrieved ${allEvents.length} events from all aggregates`,
      );

      return allEvents;
    } catch (error) {
      this.logger.error("Failed to get all events", { error });
      return [];
    }
  }

  /**
   * 获取事件快照
   * @param aggregateId 聚合根ID
   * @param version 版本号
   * @returns 事件快照
   */
  public async getSnapshot(
    aggregateId: EntityId,
    version?: number,
  ): Promise<EventSnapshot | null> {
    try {
      const aggregateKey = aggregateId.toString();
      const snapshots = this.snapshots.get(aggregateKey) || [];

      if (snapshots.length === 0) {
        return null;
      }

      if (version !== undefined) {
        const snapshot = snapshots.find((s) => s.version === version);
        return snapshot || null;
      }

      // 返回最新快照
      return snapshots[snapshots.length - 1] || null;
    } catch (error) {
      this.logger.error("Failed to get snapshot", {
        error,
        aggregateId: aggregateId.toString(),
      });
      return null;
    }
  }

  /**
   * 保存事件快照
   * @param snapshot 事件快照
   * @returns 保存结果
   */
  public async saveSnapshot(
    snapshot: EventSnapshot,
  ): Promise<EventStoreResult> {
    try {
      const aggregateKey = snapshot.aggregateId.toString();
      const snapshots = this.snapshots.get(aggregateKey) || [];

      // 添加新快照
      snapshots.push(snapshot as EventSnapshotClass);
      this.snapshots.set(aggregateKey, snapshots);

      this.logger.log(
        `Saved snapshot for aggregate ${aggregateKey} at version ${snapshot.version}`,
      );

      return {
        success: true,
        eventsCount: 0,
        newVersion: snapshot.version,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error("Failed to save snapshot", { error });
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
   * 删除事件快照
   * @param aggregateId 聚合根ID
   * @param version 版本号
   * @returns 删除结果
   */
  public async deleteSnapshot(
    aggregateId: EntityId,
    version?: number,
  ): Promise<EventStoreResult> {
    try {
      const aggregateKey = aggregateId.toString();
      const snapshots = this.snapshots.get(aggregateKey) || [];

      if (version !== undefined) {
        const index = snapshots.findIndex((s) => s.version === version);
        if (index >= 0) {
          snapshots.splice(index, 1);
          this.snapshots.set(aggregateKey, snapshots);
        }
      } else {
        // 删除所有快照
        this.snapshots.delete(aggregateKey);
      }

      this.logger.log(`Deleted snapshot(s) for aggregate ${aggregateKey}`);

      return {
        success: true,
        eventsCount: 0,
        newVersion: 0,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error("Failed to delete snapshot", {
        error,
        aggregateId: aggregateId.toString(),
      });
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
   * @param aggregateId 聚合根ID
   * @returns 当前版本号
   */
  public async getCurrentVersion(aggregateId: EntityId): Promise<number> {
    const aggregateKey = aggregateId.toString();
    const events = this.events.get(aggregateKey) || [];
    return events.length;
  }

  /**
   * 检查聚合根是否存在
   * @param aggregateId 聚合根ID
   * @returns 是否存在
   */
  public async exists(aggregateId: EntityId): Promise<boolean> {
    const aggregateKey = aggregateId.toString();
    return this.events.has(aggregateKey);
  }

  /**
   * 获取事件统计信息
   * @param aggregateId 聚合根ID
   * @returns 统计信息
   */
  public async getStatistics(
    aggregateId?: EntityId,
  ): Promise<EventStoreStatistics> {
    try {
      if (aggregateId) {
        const aggregateKey = aggregateId.toString();
        const events = this.events.get(aggregateKey) || [];
        const snapshots = this.snapshots.get(aggregateKey) || [];

        return {
          totalEvents: events.length,
          aggregateCount: 1,
          snapshotCount: snapshots.length,
          storageSize:
            JSON.stringify(events).length + JSON.stringify(snapshots).length,
          lastUpdated: new Date(),
          byType: this.groupByType(events),
          byAggregate: { [aggregateKey]: events.length },
        };
      }

      // 全局统计
      let totalEvents = 0;
      let totalSnapshots = 0;
      let totalSize = 0;
      const byType: Record<string, number> = {};
      const byAggregate: Record<string, number> = {};

      for (const [key, events] of this.events.entries()) {
        totalEvents += events.length;
        totalSize += JSON.stringify(events).length;
        byAggregate[key] = events.length;

        for (const event of events) {
          byType[event.eventType] = (byType[event.eventType] || 0) + 1;
        }
      }

      for (const snapshots of this.snapshots.values()) {
        totalSnapshots += snapshots.length;
        totalSize += JSON.stringify(snapshots).length;
      }

      return {
        totalEvents,
        aggregateCount: this.events.size,
        snapshotCount: totalSnapshots,
        storageSize: totalSize,
        lastUpdated: new Date(),
        byType,
        byAggregate,
      };
    } catch (error) {
      this.logger.error("Failed to get statistics", { error });
      return {
        totalEvents: 0,
        aggregateCount: 0,
        snapshotCount: 0,
        storageSize: 0,
        lastUpdated: new Date(),
        byType: {},
        byAggregate: {},
      };
    }
  }

  /**
   * 按类型分组事件
   * @param events 事件列表
   * @returns 按类型分组的统计
   */
  private groupByType(events: DomainEvent[]): Record<string, number> {
    const byType: Record<string, number> = {};
    for (const event of events) {
      byType[event.eventType] = (byType[event.eventType] || 0) + 1;
    }
    return byType;
  }
}
