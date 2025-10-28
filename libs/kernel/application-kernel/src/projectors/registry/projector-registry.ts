/**
 * @fileoverview 投影器注册表
 * @description 管理投影器和投影器处理器的注册和发现
 */

import { Logger } from "@hl8/logger";
import { Projector, ProjectorStatus } from "../base/projector.base.js";
import { ProjectorHandler } from "../base/projector-handler.base.js";
import {
  ProjectorMetadata,
  ProjectorHandlerMetadata,
} from "../decorators/projector.decorator.js";

/**
 * 投影器注册信息
 * @description 投影器的注册信息
 */
export interface ProjectorRegistration {
  /** 投影器实例 */
  projector: Projector;
  /** 投影器元数据 */
  metadata: ProjectorMetadata;
  /** 注册时间 */
  registeredAt: Date;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 投影器处理器注册信息
 * @description 投影器处理器的注册信息
 */
export interface ProjectorHandlerRegistration {
  /** 处理器实例 */
  handler: ProjectorHandler;
  /** 处理器元数据 */
  metadata: ProjectorHandlerMetadata;
  /** 注册时间 */
  registeredAt: Date;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 投影器注册表
 * @description 管理投影器和投影器处理器的注册和发现
 */
export class ProjectorRegistry {
  private readonly logger: Logger;
  private readonly projectors: Map<string, ProjectorRegistration> = new Map();
  private readonly handlers: Map<string, ProjectorHandlerRegistration> =
    new Map();
  private readonly eventTypeToProjectors: Map<string, Set<string>> = new Map();
  private readonly eventTypeToHandlers: Map<string, Set<string>> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 注册投影器
   * @param projector 投影器实例
   * @param metadata 投影器元数据
   * @param enabled 是否启用
   * @returns 注册是否成功
   */
  public registerProjector(
    projector: Projector,
    metadata: ProjectorMetadata,
    enabled: boolean = true,
  ): boolean {
    try {
      const registration: ProjectorRegistration = {
        projector,
        metadata,
        registeredAt: new Date(),
        enabled,
      };

      this.projectors.set(metadata.name, registration);

      // 注册事件类型映射
      for (const eventType of metadata.supportedEventTypes) {
        if (!this.eventTypeToProjectors.has(eventType)) {
          this.eventTypeToProjectors.set(eventType, new Set());
        }
        this.eventTypeToProjectors.get(eventType)!.add(metadata.name);
      }

      this.logger.debug(`投影器注册成功: ${metadata.name}`, {
        supportedEventTypes: metadata.supportedEventTypes,
        enabled,
      });

      return true;
    } catch (error) {
      this.logger.error(`投影器注册失败: ${metadata.name}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 注册投影器处理器
   * @param handler 处理器实例
   * @param metadata 处理器元数据
   * @param enabled 是否启用
   * @returns 注册是否成功
   */
  public registerHandler(
    handler: ProjectorHandler,
    metadata: ProjectorHandlerMetadata,
    enabled: boolean = true,
  ): boolean {
    try {
      const registration: ProjectorHandlerRegistration = {
        handler,
        metadata,
        registeredAt: new Date(),
        enabled,
      };

      this.handlers.set(metadata.name, registration);

      // 注册事件类型映射
      for (const eventType of metadata.supportedEventTypes) {
        if (!this.eventTypeToHandlers.has(eventType)) {
          this.eventTypeToHandlers.set(eventType, new Set());
        }
        this.eventTypeToHandlers.get(eventType)!.add(metadata.name);
      }

      this.logger.debug(`投影器处理器注册成功: ${metadata.name}`, {
        supportedEventTypes: metadata.supportedEventTypes,
        priority: metadata.priority,
        enabled,
      });

      return true;
    } catch (error) {
      this.logger.error(`投影器处理器注册失败: ${metadata.name}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 注销投影器
   * @param name 投影器名称
   * @returns 注销是否成功
   */
  public unregisterProjector(name: string): boolean {
    try {
      const registration = this.projectors.get(name);
      if (!registration) {
        this.logger.warn(`投影器未找到: ${name}`);
        return false;
      }

      // 移除事件类型映射
      for (const eventType of registration.metadata.supportedEventTypes) {
        const projectors = this.eventTypeToProjectors.get(eventType);
        if (projectors) {
          projectors.delete(name);
          if (projectors.size === 0) {
            this.eventTypeToProjectors.delete(eventType);
          }
        }
      }

      this.projectors.delete(name);
      this.logger.debug(`投影器注销成功: ${name}`);
      return true;
    } catch (error) {
      this.logger.error(`投影器注销失败: ${name}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 注销投影器处理器
   * @param name 处理器名称
   * @returns 注销是否成功
   */
  public unregisterHandler(name: string): boolean {
    try {
      const registration = this.handlers.get(name);
      if (!registration) {
        this.logger.warn(`投影器处理器未找到: ${name}`);
        return false;
      }

      // 移除事件类型映射
      for (const eventType of registration.metadata.supportedEventTypes) {
        const handlers = this.eventTypeToHandlers.get(eventType);
        if (handlers) {
          handlers.delete(name);
          if (handlers.size === 0) {
            this.eventTypeToHandlers.delete(eventType);
          }
        }
      }

      this.handlers.delete(name);
      this.logger.debug(`投影器处理器注销成功: ${name}`);
      return true;
    } catch (error) {
      this.logger.error(`投影器处理器注销失败: ${name}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 获取投影器
   * @param name 投影器名称
   * @returns 投影器注册信息
   */
  public getProjector(name: string): ProjectorRegistration | undefined {
    return this.projectors.get(name);
  }

  /**
   * 获取投影器处理器
   * @param name 处理器名称
   * @returns 处理器注册信息
   */
  public getHandler(name: string): ProjectorHandlerRegistration | undefined {
    return this.handlers.get(name);
  }

  /**
   * 获取所有投影器
   * @returns 投影器注册信息列表
   */
  public getAllProjectors(): ProjectorRegistration[] {
    return Array.from(this.projectors.values());
  }

  /**
   * 获取所有投影器处理器
   * @returns 处理器注册信息列表
   */
  public getAllHandlers(): ProjectorHandlerRegistration[] {
    return Array.from(this.handlers.values());
  }

  /**
   * 获取支持事件类型的投影器
   * @param eventType 事件类型
   * @returns 投影器注册信息列表
   */
  public getProjectorsForEventType(eventType: string): ProjectorRegistration[] {
    const projectorNames = this.eventTypeToProjectors.get(eventType);
    if (!projectorNames) {
      return [];
    }

    return Array.from(projectorNames)
      .map((name) => this.projectors.get(name))
      .filter(
        (registration): registration is ProjectorRegistration =>
          registration !== undefined,
      );
  }

  /**
   * 获取支持事件类型的投影器处理器
   * @param eventType 事件类型
   * @returns 处理器注册信息列表
   */
  public getHandlersForEventType(
    eventType: string,
  ): ProjectorHandlerRegistration[] {
    const handlerNames = this.eventTypeToHandlers.get(eventType);
    if (!handlerNames) {
      return [];
    }

    return Array.from(handlerNames)
      .map((name) => this.handlers.get(name))
      .filter(
        (registration): registration is ProjectorHandlerRegistration =>
          registration !== undefined,
      )
      .sort((a, b) => (b.metadata.priority || 0) - (a.metadata.priority || 0));
  }

  /**
   * 获取启用的投影器
   * @returns 启用的投影器注册信息列表
   */
  public getEnabledProjectors(): ProjectorRegistration[] {
    return this.getAllProjectors().filter(
      (registration) => registration.enabled,
    );
  }

  /**
   * 获取启用的投影器处理器
   * @returns 启用的处理器注册信息列表
   */
  public getEnabledHandlers(): ProjectorHandlerRegistration[] {
    return this.getAllHandlers().filter((registration) => registration.enabled);
  }

  /**
   * 获取运行中的投影器
   * @returns 运行中的投影器注册信息列表
   */
  public getRunningProjectors(): ProjectorRegistration[] {
    return this.getAllProjectors().filter(
      (registration) =>
        registration.projector.getStatus() === ProjectorStatus.RUNNING,
    );
  }

  /**
   * 启用投影器
   * @param name 投影器名称
   * @returns 启用是否成功
   */
  public enableProjector(name: string): boolean {
    const registration = this.projectors.get(name);
    if (!registration) {
      this.logger.warn(`投影器未找到: ${name}`);
      return false;
    }

    registration.enabled = true;
    this.logger.debug(`投影器已启用: ${name}`);
    return true;
  }

  /**
   * 禁用投影器
   * @param name 投影器名称
   * @returns 禁用是否成功
   */
  public disableProjector(name: string): boolean {
    const registration = this.projectors.get(name);
    if (!registration) {
      this.logger.warn(`投影器未找到: ${name}`);
      return false;
    }

    registration.enabled = false;
    this.logger.debug(`投影器已禁用: ${name}`);
    return true;
  }

  /**
   * 启用投影器处理器
   * @param name 处理器名称
   * @returns 启用是否成功
   */
  public enableHandler(name: string): boolean {
    const registration = this.handlers.get(name);
    if (!registration) {
      this.logger.warn(`投影器处理器未找到: ${name}`);
      return false;
    }

    registration.enabled = true;
    this.logger.debug(`投影器处理器已启用: ${name}`);
    return true;
  }

  /**
   * 禁用投影器处理器
   * @param name 处理器名称
   * @returns 禁用是否成功
   */
  public disableHandler(name: string): boolean {
    const registration = this.handlers.get(name);
    if (!registration) {
      this.logger.warn(`投影器处理器未找到: ${name}`);
      return false;
    }

    registration.enabled = false;
    this.logger.debug(`投影器处理器已禁用: ${name}`);
    return true;
  }

  /**
   * 检查投影器是否注册
   * @param name 投影器名称
   * @returns 是否已注册
   */
  public isProjectorRegistered(name: string): boolean {
    return this.projectors.has(name);
  }

  /**
   * 检查投影器处理器是否注册
   * @param name 处理器名称
   * @returns 是否已注册
   */
  public isHandlerRegistered(name: string): boolean {
    return this.handlers.has(name);
  }

  /**
   * 获取注册表统计信息
   * @returns 统计信息
   */
  public getStatistics(): {
    totalProjectors: number;
    enabledProjectors: number;
    runningProjectors: number;
    totalHandlers: number;
    enabledHandlers: number;
    supportedEventTypes: number;
  } {
    const allProjectors = this.getAllProjectors();
    const enabledProjectors = this.getEnabledProjectors();
    const runningProjectors = this.getRunningProjectors();
    const allHandlers = this.getAllHandlers();
    const enabledHandlers = this.getEnabledHandlers();

    return {
      totalProjectors: allProjectors.length,
      enabledProjectors: enabledProjectors.length,
      runningProjectors: runningProjectors.length,
      totalHandlers: allHandlers.length,
      enabledHandlers: enabledHandlers.length,
      supportedEventTypes:
        this.eventTypeToProjectors.size + this.eventTypeToHandlers.size,
    };
  }

  /**
   * 清空注册表
   * @description 清空所有注册的投影器和处理器
   */
  public clear(): void {
    this.projectors.clear();
    this.handlers.clear();
    this.eventTypeToProjectors.clear();
    this.eventTypeToHandlers.clear();
    this.logger.debug("投影器注册表已清空");
  }
}
