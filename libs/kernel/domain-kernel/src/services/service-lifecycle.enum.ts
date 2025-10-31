/**
 * @fileoverview 服务生命周期枚举定义
 * @description 定义服务在容器中的生命周期管理类型
 */

/**
 * 服务生命周期枚举
 * @description 定义服务实例的生命周期管理策略
 */
export enum ServiceLifecycle {
  /**
   * 单例模式
   * @description 整个应用程序生命周期内只有一个实例，所有请求共享同一个实例
   * @example
   * ```typescript
   * // 配置服务通常使用单例模式
   * registry.register('ConfigService', configService, [], ServiceLifecycle.SINGLETON);
   * ```
   */
  SINGLETON = "singleton",

  /**
   * 瞬态模式
   * @description 每次请求都创建新实例，不共享状态
   * @example
   * ```typescript
   * // 临时处理器使用瞬态模式
   * registry.register('TempProcessor', TempProcessor, [], ServiceLifecycle.TRANSIENT);
   * ```
   */
  TRANSIENT = "transient",

  /**
   * 作用域模式
   * @description 在特定作用域内只有一个实例，不同作用域间隔离
   * @example
   * ```typescript
   * // 用户会话服务使用作用域模式
   * registry.register('UserSessionService', sessionService, [], ServiceLifecycle.SCOPED);
   * ```
   */
  SCOPED = "scoped",
}

/**
 * 服务生命周期管理器接口
 * @description 提供服务生命周期管理的功能
 */
export interface IServiceLifecycleManager {
  /**
   * 创建服务实例
   * @description 根据生命周期策略创建服务实例
   * @param serviceType 服务类型
   * @param factory 服务工厂函数
   * @param lifecycle 生命周期类型
   * @param scopeId 作用域ID（仅用于SCOPED生命周期）
   * @returns 服务实例
   */
  createInstance<T>(
    serviceType: string,
    factory: () => T,
    lifecycle: ServiceLifecycle,
    scopeId?: string,
  ): T;

  /**
   * 获取服务实例
   * @description 根据生命周期策略获取服务实例
   * @param serviceType 服务类型
   * @param lifecycle 生命周期类型
   * @param scopeId 作用域ID（仅用于SCOPED生命周期）
   * @returns 服务实例，如果不存在则返回 null
   */
  getInstance<T>(
    serviceType: string,
    lifecycle: ServiceLifecycle,
    scopeId?: string,
  ): T | null;

  /**
   * 销毁服务实例
   * @description 根据生命周期策略销毁服务实例
   * @param serviceType 服务类型
   * @param scopeId 作用域ID（仅用于SCOPED生命周期）
   * @returns 是否成功销毁
   */
  destroyInstance(serviceType: string, scopeId?: string): boolean;

  /**
   * 清理作用域
   * @description 清理指定作用域内的所有服务实例
   * @param scopeId 作用域ID
   * @returns 清理的服务数量
   */
  cleanupScope(scopeId: string): number;

  /**
   * 清理所有实例
   * @description 清理所有服务实例
   * @returns 清理的服务数量
   */
  cleanupAll(): number;

  /**
   * 获取实例统计信息
   * @description 获取服务实例的统计信息
   * @returns 统计信息
   */
  getInstanceStats(): ServiceInstanceStats;
}

/**
 * 服务实例统计信息接口
 * @description 描述服务实例的统计信息
 */
export interface ServiceInstanceStats {
  /** 总实例数 */
  totalInstances: number;
  /** 单例实例数 */
  singletonInstances: number;
  /** 瞬态实例数 */
  transientInstances: number;
  /** 作用域实例数 */
  scopedInstances: number;
  /** 作用域数量 */
  scopeCount: number;
  /** 内存使用情况 */
  memoryUsage: {
    /** 总内存使用（字节） */
    total: number;
    /** 单例内存使用（字节） */
    singleton: number;
    /** 瞬态内存使用（字节） */
    transient: number;
    /** 作用域内存使用（字节） */
    scoped: number;
  };
  /** 创建时间 */
  createdAt: Date;
  /** 最后更新时间 */
  updatedAt: Date;
}
