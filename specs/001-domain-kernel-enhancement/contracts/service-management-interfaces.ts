/**
 * @fileoverview Service Management Interfaces - 服务管理接口定义
 * @description 定义领域服务注册、定位和依赖管理的接口
 */

import { ValidationResult } from "@hl8/domain-kernel";

/**
 * 领域服务注册表接口
 * @description 管理领域服务的注册和发现
 */
export interface IDomainServiceRegistry {
  /**
   * 注册服务
   * @param serviceType 服务类型标识符
   * @param service 服务实例
   * @param dependencies 依赖列表
   * @throws {ServiceRegistryException} 当注册失败时抛出
   */
  register<T>(serviceType: string, service: T, dependencies?: string[]): void;

  /**
   * 获取服务
   * @param serviceType 服务类型标识符
   * @returns 服务实例或null
   */
  get<T>(serviceType: string): T | null;

  /**
   * 检查服务是否存在
   * @param serviceType 服务类型标识符
   * @returns 是否存在
   */
  has(serviceType: string): boolean;

  /**
   * 验证所有依赖
   * @returns 验证结果
   */
  validateDependencies(): ValidationResult;

  /**
   * 获取服务依赖
   * @param serviceType 服务类型标识符
   * @returns 依赖列表
   */
  getServiceDependencies(serviceType: string): string[];

  /**
   * 注销服务
   * @param serviceType 服务类型标识符
   * @returns 是否注销成功
   */
  unregister(serviceType: string): boolean;

  /**
   * 获取所有注册的服务类型
   * @returns 服务类型列表
   */
  getRegisteredServiceTypes(): string[];

  /**
   * 清空所有服务
   * @returns 清空结果
   */
  clear(): boolean;
}

/**
 * 服务定位器接口
 * @description 服务定位和发现
 */
export interface IServiceLocator {
  /**
   * 定位服务
   * @param serviceType 服务类型标识符
   * @returns 服务实例或null
   */
  locate<T>(serviceType: string): T | null;

  /**
   * 定位所有服务
   * @param serviceType 服务类型标识符
   * @returns 服务实例列表
   */
  locateAll<T>(serviceType: string): T[];

  /**
   * 检查服务是否可用
   * @param serviceType 服务类型标识符
   * @returns 是否可用
   */
  isAvailable(serviceType: string): boolean;

  /**
   * 获取服务元数据
   * @param serviceType 服务类型标识符
   * @returns 服务元数据
   */
  getServiceMetadata(serviceType: string): ServiceMetadata | null;
}

/**
 * 依赖容器接口
 * @description 依赖管理和注入
 */
export interface IDependencyContainer {
  /**
   * 注册依赖
   * @param name 依赖名称
   * @param dependency 依赖实例
   * @throws {ServiceRegistryException} 当注册失败时抛出
   */
  registerDependency<T>(name: string, dependency: T): void;

  /**
   * 获取依赖
   * @param name 依赖名称
   * @returns 依赖实例或null
   */
  getDependency<T>(name: string): T | null;

  /**
   * 检查依赖是否存在
   * @param name 依赖名称
   * @returns 是否存在
   */
  hasDependency(name: string): boolean;

  /**
   * 验证依赖图
   * @returns 验证结果
   */
  validateDependencyGraph(): ValidationResult;

  /**
   * 获取依赖元数据
   * @param name 依赖名称
   * @returns 依赖元数据
   */
  getDependencyMetadata(name: string): DependencyMetadata | null;

  /**
   * 移除依赖
   * @param name 依赖名称
   * @returns 是否移除成功
   */
  removeDependency(name: string): boolean;

  /**
   * 清空所有依赖
   * @returns 清空结果
   */
  clear(): boolean;
}

/**
 * 服务注册信息
 * @description 服务注册的元数据
 */
export interface ServiceRegistration {
  /** 服务类型标识符 */
  serviceType: string;
  /** 服务实例 */
  service: unknown;
  /** 依赖列表 */
  dependencies: string[];
  /** 服务生命周期 */
  lifecycle: ServiceLifecycle;
  /** 注册元数据 */
  metadata: Record<string, unknown>;
  /** 注册时间 */
  registeredAt: Date;
  /** 服务版本 */
  version: string;
}

/**
 * 服务元数据
 * @description 服务的元数据信息
 */
export interface ServiceMetadata {
  /** 服务类型 */
  serviceType: string;
  /** 服务名称 */
  name: string;
  /** 服务描述 */
  description: string;
  /** 服务版本 */
  version: string;
  /** 服务标签 */
  tags: string[];
  /** 服务配置 */
  configuration: Record<string, unknown>;
  /** 健康检查函数 */
  healthCheck?: () => Promise<boolean>;
}

/**
 * 依赖元数据
 * @description 依赖的元数据信息
 */
export interface DependencyMetadata {
  /** 依赖名称 */
  name: string;
  /** 依赖类型 */
  type: string;
  /** 依赖描述 */
  description: string;
  /** 依赖版本 */
  version: string;
  /** 依赖配置 */
  configuration: Record<string, unknown>;
  /** 是否必需 */
  required: boolean;
  /** 默认值 */
  defaultValue?: unknown;
}

/**
 * 服务生命周期枚举
 * @description 服务的生命周期管理
 */
export enum ServiceLifecycle {
  /** 单例模式 - 整个应用生命周期内只有一个实例 */
  SINGLETON = "singleton",
  /** 瞬态模式 - 每次请求都创建新实例 */
  TRANSIENT = "transient",
  /** 作用域模式 - 每个作用域内只有一个实例 */
  SCOPED = "scoped",
}

/**
 * 服务状态枚举
 * @description 服务的运行状态
 */
export enum ServiceStatus {
  /** 未初始化 */
  UNINITIALIZED = "uninitialized",
  /** 初始化中 */
  INITIALIZING = "initializing",
  /** 已初始化 */
  INITIALIZED = "initialized",
  /** 运行中 */
  RUNNING = "running",
  /** 停止中 */
  STOPPING = "stopping",
  /** 已停止 */
  STOPPED = "stopped",
  /** 错误状态 */
  ERROR = "error",
}

/**
 * 服务健康检查结果
 * @description 服务健康检查的结果
 */
export interface ServiceHealthCheckResult {
  /** 服务类型 */
  serviceType: string;
  /** 是否健康 */
  healthy: boolean;
  /** 检查时间 */
  checkedAt: Date;
  /** 响应时间（毫秒） */
  responseTime: number;
  /** 错误信息 */
  error?: string;
  /** 详细信息 */
  details: Record<string, unknown>;
}

/**
 * 服务注册表配置
 * @description 服务注册表的配置选项
 */
export interface ServiceRegistryConfig {
  /** 是否启用自动依赖验证 */
  enableAutoValidation: boolean;
  /** 是否启用循环依赖检测 */
  enableCircularDependencyDetection: boolean;
  /** 是否启用服务健康检查 */
  enableHealthCheck: boolean;
  /** 健康检查间隔（毫秒） */
  healthCheckInterval: number;
  /** 最大服务数量 */
  maxServices: number;
  /** 是否启用服务缓存 */
  enableServiceCache: boolean;
  /** 缓存过期时间（毫秒） */
  cacheExpirationTime: number;
}

/**
 * 依赖注入上下文
 * @description 依赖注入的上下文信息
 */
export interface DependencyInjectionContext {
  /** 请求ID */
  requestId: string;
  /** 注入时间 */
  injectedAt: Date;
  /** 注入路径 */
  injectionPath: string[];
  /** 注入参数 */
  injectionParams: Record<string, unknown>;
  /** 注入结果 */
  injectionResult: unknown;
  /** 注入错误 */
  injectionError?: Error;
}
