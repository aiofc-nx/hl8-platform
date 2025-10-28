/**
 * @fileoverview 投影器装饰器
 * @description 提供投影器相关的装饰器功能
 */

import type { ProjectorConfig } from "../base/projector.base.js";
import type { ProjectorHandlerConfig } from "../base/projector-handler.base.js";

/**
 * 投影器元数据
 * @description 投影器的元数据信息
 */
export interface ProjectorMetadata {
  /** 投影器名称 */
  name: string;
  /** 投影器描述 */
  description?: string;
  /** 投影器版本 */
  version?: string;
  /** 支持的事件类型 */
  supportedEventTypes: string[];
  /** 读模型类型 */
  readModelType?: string;
  /** 配置选项 */
  config?: Partial<ProjectorConfig>;
}

/**
 * 投影器处理器元数据
 * @description 投影器处理器的元数据信息
 */
export interface ProjectorHandlerMetadata {
  /** 处理器名称 */
  name: string;
  /** 处理器描述 */
  description?: string;
  /** 处理器版本 */
  version?: string;
  /** 支持的事件类型 */
  supportedEventTypes: string[];
  /** 优先级 */
  priority?: number;
  /** 配置选项 */
  config?: Partial<ProjectorHandlerConfig>;
}

/**
 * 投影器装饰器选项
 * @description 投影器装饰器的配置选项
 */
export interface ProjectorOptions {
  /** 投影器名称 */
  name: string;
  /** 投影器描述 */
  description?: string;
  /** 投影器版本 */
  version?: string;
  /** 支持的事件类型 */
  supportedEventTypes: string[];
  /** 读模型类型 */
  readModelType?: string;
  /** 配置选项 */
  config?: Partial<ProjectorConfig>;
}

/**
 * 投影器处理器装饰器选项
 * @description 投影器处理器装饰器的配置选项
 */
export interface ProjectorHandlerOptions {
  /** 处理器名称 */
  name: string;
  /** 处理器描述 */
  description?: string;
  /** 处理器版本 */
  version?: string;
  /** 支持的事件类型 */
  supportedEventTypes: string[];
  /** 优先级 */
  priority?: number;
  /** 配置选项 */
  config?: Partial<ProjectorHandlerConfig>;
}

/**
 * 投影器装饰器
 * @description 标记类为投影器并添加元数据
 * @param options 投影器选项
 */
export function Projector(options: ProjectorOptions) {
  return function <T extends { new (...args: unknown[]): unknown }>(
    constructor: T,
  ) {
    const metadata: ProjectorMetadata = {
      name: options.name,
      description: options.description,
      version: options.version,
      supportedEventTypes: options.supportedEventTypes,
      readModelType: options.readModelType,
      config: options.config,
    };

    // 将元数据添加到类的原型上
    Reflect.defineMetadata(
      "projector:metadata",
      metadata,
      constructor.prototype,
    );

    // 添加静态方法获取元数据
    (
      constructor as { getProjectorMetadata?: () => ProjectorMetadata }
    ).getProjectorMetadata = function (): ProjectorMetadata {
      return metadata;
    };

    return constructor;
  };
}

/**
 * 投影器处理器装饰器
 * @description 标记类为投影器处理器并添加元数据
 * @param options 处理器选项
 */
export function ProjectorHandler(options: ProjectorHandlerOptions) {
  return function <T extends { new (...args: unknown[]): unknown }>(
    constructor: T,
  ) {
    const metadata: ProjectorHandlerMetadata = {
      name: options.name,
      description: options.description,
      version: options.version,
      supportedEventTypes: options.supportedEventTypes,
      priority: options.priority,
      config: options.config,
    };

    // 将元数据添加到类的原型上
    Reflect.defineMetadata(
      "projector:handler:metadata",
      metadata,
      constructor.prototype,
    );

    // 添加静态方法获取元数据
    (
      constructor as {
        getProjectorHandlerMetadata?: () => ProjectorHandlerMetadata;
      }
    ).getProjectorHandlerMetadata = function (): ProjectorHandlerMetadata {
      return metadata;
    };

    return constructor;
  };
}

/**
 * 事件类型装饰器
 * @description 标记方法处理特定的事件类型
 * @param eventType 事件类型
 */
export function EventType(eventType: string) {
  return function (
    target: unknown,
    propertyKey: string,
    _descriptor: PropertyDescriptor,
  ) {
    const existingEventTypes =
      Reflect.getMetadata("projector:event:types", target) || [];
    existingEventTypes.push({
      eventType,
      methodName: propertyKey,
    });
    Reflect.defineMetadata("projector:event:types", existingEventTypes, target);
  };
}

/**
 * 投影器配置装饰器
 * @description 为投影器添加配置选项
 * @param config 配置选项
 */
export function ProjectorConfig(config: Partial<ProjectorConfig>) {
  return function (
    target: unknown,
    _propertyKey: string,
    _descriptor: PropertyDescriptor,
  ) {
    const existingConfig =
      Reflect.getMetadata("projector:config", target) || {};
    const mergedConfig = { ...existingConfig, ...config };
    Reflect.defineMetadata("projector:config", mergedConfig, target);
  };
}

/**
 * 投影器处理器配置装饰器
 * @description 为投影器处理器添加配置选项
 * @param config 配置选项
 */
export function ProjectorHandlerConfig(
  config: Partial<ProjectorHandlerConfig>,
) {
  return function (
    target: unknown,
    _propertyKey: string,
    _descriptor: PropertyDescriptor,
  ) {
    const existingConfig =
      Reflect.getMetadata("projector:handler:config", target) || {};
    const mergedConfig = { ...existingConfig, ...config };
    Reflect.defineMetadata("projector:handler:config", mergedConfig, target);
  };
}

/**
 * 投影器优先级装饰器
 * @description 设置投影器处理器的优先级
 * @param priority 优先级
 */
export function Priority(priority: number) {
  return function (
    target: unknown,
    _propertyKey: string,
    _descriptor: PropertyDescriptor,
  ) {
    Reflect.defineMetadata("projector:priority", priority, target);
  };
}

/**
 * 投影器启用装饰器
 * @description 设置投影器是否启用
 * @param enabled 是否启用
 */
export function Enabled(enabled: boolean) {
  return function (
    target: unknown,
    _propertyKey: string,
    _descriptor: PropertyDescriptor,
  ) {
    Reflect.defineMetadata("projector:enabled", enabled, target);
  };
}

/**
 * 投影器重试装饰器
 * @description 设置投影器的重试配置
 * @param retryConfig 重试配置
 */
export function Retry(retryConfig: {
  maxAttempts: number;
  backoffMs: number;
  maxBackoffMs: number;
}) {
  return function (
    target: unknown,
    _propertyKey: string,
    _descriptor: PropertyDescriptor,
  ) {
    Reflect.defineMetadata("projector:retry", retryConfig, target);
  };
}

/**
 * 投影器性能装饰器
 * @description 设置投影器的性能配置
 * @param performanceConfig 性能配置
 */
export function Performance(performanceConfig: {
  maxConcurrency: number;
  timeout: number;
}) {
  return function (
    target: unknown,
    _propertyKey: string,
    _descriptor: PropertyDescriptor,
  ) {
    Reflect.defineMetadata("projector:performance", performanceConfig, target);
  };
}

/**
 * 投影器批处理装饰器
 * @description 设置投影器的批处理配置
 * @param batchSize 批处理大小
 */
export function BatchSize(batchSize: number) {
  return function (
    target: unknown,
    _propertyKey: string,
    _descriptor: PropertyDescriptor,
  ) {
    Reflect.defineMetadata("projector:batchSize", batchSize, target);
  };
}

/**
 * 获取投影器元数据
 * @param target 目标类
 * @returns 投影器元数据
 */
export function getProjectorMetadata(
  target: unknown,
): ProjectorMetadata | undefined {
  return Reflect.getMetadata("projector:metadata", target);
}

/**
 * 获取投影器处理器元数据
 * @param target 目标类
 * @returns 投影器处理器元数据
 */
export function getProjectorHandlerMetadata(
  target: unknown,
): ProjectorHandlerMetadata | undefined {
  return Reflect.getMetadata("projector:handler:metadata", target);
}

/**
 * 获取事件类型映射
 * @param target 目标类
 * @returns 事件类型映射
 */
export function getEventTypeMapping(
  target: unknown,
): Array<{ eventType: string; methodName: string }> {
  return Reflect.getMetadata("projector:event:types", target) || [];
}

/**
 * 获取投影器配置
 * @param target 目标类
 * @returns 投影器配置
 */
export function getProjectorConfig(target: unknown): Partial<ProjectorConfig> {
  return Reflect.getMetadata("projector:config", target) || {};
}

/**
 * 获取投影器处理器配置
 * @param target 目标类
 * @returns 投影器处理器配置
 */
export function getProjectorHandlerConfig(
  target: unknown,
): Partial<ProjectorHandlerConfig> {
  return Reflect.getMetadata("projector:handler:config", target) || {};
}

/**
 * 获取投影器优先级
 * @param target 目标类
 * @returns 优先级
 */
export function getProjectorPriority(target: unknown): number | undefined {
  return Reflect.getMetadata("projector:priority", target);
}

/**
 * 获取投影器启用状态
 * @param target 目标类
 * @returns 是否启用
 */
export function getProjectorEnabled(target: unknown): boolean | undefined {
  return Reflect.getMetadata("projector:enabled", target);
}

/**
 * 获取投影器重试配置
 * @param target 目标类
 * @returns 重试配置
 */
export function getProjectorRetry(
  target: unknown,
):
  | { maxAttempts: number; backoffMs: number; maxBackoffMs: number }
  | undefined {
  return Reflect.getMetadata("projector:retry", target);
}

/**
 * 获取投影器性能配置
 * @param target 目标类
 * @returns 性能配置
 */
export function getProjectorPerformance(
  target: unknown,
): { maxConcurrency: number; timeout: number } | undefined {
  return Reflect.getMetadata("projector:performance", target);
}

/**
 * 获取投影器批处理大小
 * @param target 目标类
 * @returns 批处理大小
 */
export function getProjectorBatchSize(target: unknown): number | undefined {
  return Reflect.getMetadata("projector:batchSize", target);
}
