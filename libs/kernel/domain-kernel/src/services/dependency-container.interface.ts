/**
 * @fileoverview 依赖容器接口定义
 * @description 提供依赖注入和依赖管理功能，支持复杂的依赖关系解析
 */

import { ValidationResult } from "../validation/rules/validation-result.interface.js";

/**
 * 依赖容器接口
 * @description 负责管理服务依赖关系，提供依赖注入和解析功能
 * @template T 依赖类型
 */
export interface IDependencyContainer {
  /**
   * 注册依赖
   * @description 将依赖实例注册到容器中
   * @param name 依赖名称
   * @param dependency 依赖实例
   * @param metadata 依赖元数据，可选
   * @throws {DependencyContainerException} 当依赖名称已存在时抛出
   * @example
   * ```typescript
   * container.registerDependency('UserRepository', userRepository, {
   *   lifecycle: 'singleton',
   *   tags: ['repository', 'data-access']
   * });
   * ```
   */
  registerDependency<T>(
    name: string,
    dependency: T,
    metadata?: DependencyMetadata,
  ): void;

  /**
   * 获取依赖
   * @description 根据名称获取依赖实例
   * @param name 依赖名称
   * @returns 依赖实例，如果未找到则返回 null
   * @example
   * ```typescript
   * const repository = container.getDependency<UserRepository>('UserRepository');
   * ```
   */
  getDependency<T>(name: string): T | null;

  /**
   * 检查依赖是否存在
   * @description 验证指定名称的依赖是否已注册
   * @param name 依赖名称
   * @returns 如果依赖存在返回 true，否则返回 false
   * @example
   * ```typescript
   * if (container.hasDependency('UserRepository')) {
   *   // 依赖已注册
   * }
   * ```
   */
  hasDependency(name: string): boolean;

  /**
   * 验证依赖图
   * @description 检查所有依赖关系是否完整和有效，检测循环依赖
   * @returns 验证结果，包含依赖图验证的详细信息
   * @example
   * ```typescript
   * const result = container.validateDependencyGraph();
   * if (!result.isValid) {
   *   console.error('依赖图验证失败:', result.errors);
   * }
   * ```
   */
  validateDependencyGraph(): ValidationResult;

  /**
   * 解析依赖
   * @description 根据构造函数参数自动解析依赖
   * @param constructor 构造函数
   * @param dependencies 依赖名称列表
   * @returns 解析后的依赖实例数组
   * @example
   * ```typescript
   * const deps = container.resolveDependencies(UserService, ['UserRepository', 'EmailService']);
   * const userService = new UserService(...deps);
   * ```
   */
  resolveDependencies(
    constructor: new (...args: unknown[]) => unknown,
    dependencies: string[],
  ): unknown[];

  /**
   * 按类型获取依赖
   * @description 根据类型获取依赖实例
   * @param type 依赖类型
   * @returns 依赖实例，如果未找到则返回 null
   * @example
   * ```typescript
   * const repository = container.getDependencyByType<IRepository<User>>(IRepository);
   * ```
   */
  getDependencyByType<T>(type: new (...args: unknown[]) => T): T | null;

  /**
   * 按类型获取所有依赖
   * @description 根据类型获取所有匹配的依赖实例
   * @param type 依赖类型
   * @returns 依赖实例数组
   * @example
   * ```typescript
   * const handlers = container.getAllDependenciesByType<EventHandler>(EventHandler);
   * ```
   */
  getAllDependenciesByType<T>(type: new (...args: unknown[]) => T): T[];

  /**
   * 按标签获取依赖
   * @description 根据标签获取依赖实例
   * @param tag 依赖标签
   * @returns 依赖实例数组
   * @example
   * ```typescript
   * const repositories = container.getDependenciesByTag('repository');
   * ```
   */
  getDependenciesByTag<T>(tag: string): T[];

  /**
   * 获取依赖元数据
   * @description 获取指定依赖的元数据信息
   * @param name 依赖名称
   * @returns 依赖元数据，如果未找到则返回 null
   * @example
   * ```typescript
   * const metadata = container.getDependencyMetadata('UserRepository');
   * console.log(metadata?.lifecycle, metadata?.tags);
   * ```
   */
  getDependencyMetadata(name: string): DependencyMetadata | null;

  /**
   * 获取依赖图
   * @description 获取完整的依赖关系图
   * @returns 依赖图信息
   * @example
   * ```typescript
   * const graph = container.getDependencyGraph();
   * console.log('依赖图:', graph);
   * ```
   */
  getDependencyGraph(): DependencyGraph;

  /**
   * 移除依赖
   * @description 从容器中移除指定的依赖
   * @param name 依赖名称
   * @returns 如果依赖被成功移除返回 true，否则返回 false
   * @example
   * ```typescript
   * const removed = container.removeDependency('UserRepository');
   * ```
   */
  removeDependency(name: string): boolean;

  /**
   * 清空容器
   * @description 移除所有已注册的依赖
   * @example
   * ```typescript
   * container.clear();
   * ```
   */
  clear(): void;
}

/**
 * 依赖元数据接口
 * @description 描述依赖的元数据信息
 */
export interface DependencyMetadata {
  /** 依赖名称 */
  name: string;
  /** 依赖实例 */
  dependency: unknown;
  /** 依赖类型 */
  type: string;
  /** 生命周期 */
  lifecycle: DependencyLifecycle;
  /** 标签列表 */
  tags: string[];
  /** 依赖项列表 */
  dependencies: string[];
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
 * 依赖生命周期枚举
 * @description 定义依赖的生命周期类型
 */
export enum DependencyLifecycle {
  /** 单例模式 - 整个应用程序生命周期内只有一个实例 */
  SINGLETON = "singleton",
  /** 瞬态模式 - 每次请求都创建新实例 */
  TRANSIENT = "transient",
  /** 作用域模式 - 在特定作用域内只有一个实例 */
  SCOPED = "scoped",
  /** 工厂模式 - 通过工厂函数创建实例 */
  FACTORY = "factory",
}

/**
 * 依赖图接口
 * @description 描述依赖关系的图结构
 */
export interface DependencyGraph {
  /** 节点列表 */
  nodes: DependencyNode[];
  /** 边列表 */
  edges: DependencyEdge[];
  /** 循环依赖列表 */
  cycles: string[][];
  /** 根节点列表 */
  roots: string[];
  /** 叶子节点列表 */
  leaves: string[];
}

/**
 * 依赖节点接口
 * @description 描述依赖图中的节点
 */
export interface DependencyNode {
  /** 节点名称 */
  name: string;
  /** 节点类型 */
  type: string;
  /** 节点标签 */
  tags: string[];
  /** 节点元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 依赖边接口
 * @description 描述依赖图中的边（依赖关系）
 */
export interface DependencyEdge {
  /** 源节点名称 */
  from: string;
  /** 目标节点名称 */
  to: string;
  /** 依赖类型 */
  type: DependencyEdgeType;
  /** 是否必需 */
  required: boolean;
  /** 边元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 依赖边类型枚举
 * @description 定义依赖关系的类型
 */
export enum DependencyEdgeType {
  /** 直接依赖 */
  DIRECT = "direct",
  /** 间接依赖 */
  INDIRECT = "indirect",
  /** 可选依赖 */
  OPTIONAL = "optional",
  /** 循环依赖 */
  CIRCULAR = "circular",
}
