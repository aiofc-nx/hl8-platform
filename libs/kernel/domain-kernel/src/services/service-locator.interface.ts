/**
 * @fileoverview 服务定位器接口定义
 * @description 提供服务的定位和发现功能，支持多种服务查找策略
 */

/**
 * 服务定位器接口
 * @description 负责服务的定位和发现，提供灵活的服务查找机制
 * @template T 服务类型
 */
export interface IServiceLocator {
  /**
   * 定位单个服务
   * @description 根据服务类型定位单个服务实例
   * @param serviceType 服务类型标识符
   * @returns 服务实例，如果未找到则返回 null
   * @example
   * ```typescript
   * const userService = locator.locate<UserService>('UserService');
   * if (userService) {
   *   // 使用服务
   * }
   * ```
   */
  locate<T>(serviceType: string): T | null;

  /**
   * 定位所有匹配的服务
   * @description 根据服务类型定位所有匹配的服务实例
   * @param serviceType 服务类型标识符
   * @returns 服务实例数组
   * @example
   * ```typescript
   * const handlers = locator.locateAll<EventHandler>('EventHandler');
   * handlers.forEach(handler => handler.handle(event));
   * ```
   */
  locateAll<T>(serviceType: string): T[];

  /**
   * 检查服务是否可用
   * @description 验证指定类型的服务是否可用
   * @param serviceType 服务类型标识符
   * @returns 如果服务可用返回 true，否则返回 false
   * @example
   * ```typescript
   * if (locator.isAvailable('UserService')) {
   *   // 服务可用
   * }
   * ```
   */
  isAvailable(serviceType: string): boolean;

  /**
   * 按接口类型定位服务
   * @description 根据接口类型定位服务实例
   * @param interfaceType 接口类型标识符
   * @returns 服务实例，如果未找到则返回 null
   * @example
   * ```typescript
   * const repository = locator.locateByInterface<IRepository<User>>('IRepository');
   * ```
   */
  locateByInterface<T>(interfaceType: string): T | null;

  /**
   * 按接口类型定位所有服务
   * @description 根据接口类型定位所有匹配的服务实例
   * @param interfaceType 接口类型标识符
   * @returns 服务实例数组
   * @example
   * ```typescript
   * const repositories = locator.locateAllByInterface<IRepository<Entity>>('IRepository');
   * ```
   */
  locateAllByInterface<T>(interfaceType: string): T[];

  /**
   * 按标签定位服务
   * @description 根据标签定位服务实例
   * @param tag 服务标签
   * @returns 服务实例数组
   * @example
   * ```typescript
   * const services = locator.locateByTag('singleton');
   * ```
   */
  locateByTag<T>(tag: string): T[];

  /**
   * 获取服务元数据
   * @description 获取指定服务的元数据信息
   * @param serviceType 服务类型标识符
   * @returns 服务元数据，如果未找到则返回 null
   * @example
   * ```typescript
   * const metadata = locator.getServiceMetadata('UserService');
   * console.log(metadata?.lifecycle, metadata?.dependencies);
   * ```
   */
  getServiceMetadata(serviceType: string): ServiceMetadata | null;

  /**
   * 获取所有可用服务类型
   * @description 返回所有可用的服务类型列表
   * @returns 服务类型数组
   * @example
   * ```typescript
   * const types = locator.getAllAvailableTypes();
   * console.log('可用服务:', types);
   * ```
   */
  getAllAvailableTypes(): string[];

  /**
   * 刷新服务缓存
   * @description 刷新服务定位器的内部缓存
   * @example
   * ```typescript
   * locator.refreshCache();
   * ```
   */
  refreshCache(): void;
}

/**
 * 服务元数据接口
 * @description 描述服务的元数据信息
 */
export interface ServiceMetadata {
  /** 服务类型标识符 */
  serviceType: string;
  /** 服务实例 */
  service: unknown;
  /** 依赖列表 */
  dependencies: string[];
  /** 服务生命周期 */
  lifecycle: ServiceLifecycle;
  /** 服务标签 */
  tags: string[];
  /** 创建时间 */
  createdAt: Date;
  /** 最后访问时间 */
  lastAccessedAt: Date;
  /** 访问次数 */
  accessCount: number;
  /** 自定义元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 服务生命周期枚举
 * @description 定义服务的生命周期类型
 */
export enum ServiceLifecycle {
  /** 单例模式 - 整个应用程序生命周期内只有一个实例 */
  SINGLETON = "singleton",
  /** 瞬态模式 - 每次请求都创建新实例 */
  TRANSIENT = "transient",
  /** 作用域模式 - 在特定作用域内只有一个实例 */
  SCOPED = "scoped",
}
