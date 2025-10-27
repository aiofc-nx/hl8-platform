/**
 * @fileoverview 领域服务基类
 * @description 提供无状态领域服务的基础功能，支持依赖注入和业务逻辑执行
 */

import { EntityId } from "../../identifiers/entity-id.js";

/**
 * 领域服务基类
 * @description 提供无状态领域服务的基础功能，遵循领域服务模式
 */
export abstract class DomainService {
  private readonly _serviceId: EntityId;
  private readonly _createdAt: Date;
  private readonly _version: number;
  private readonly _dependencies: Map<string, unknown>;

  /**
   * 创建领域服务
   * @param serviceId 服务标识符，可选，默认自动生成
   * @param version 版本号，默认为1
   */
  constructor(serviceId?: EntityId, version: number = 1) {
    this._serviceId = serviceId || new EntityId();
    this._createdAt = new Date();
    this._version = version;
    this._dependencies = new Map();

    // 在构造函数中直接验证
    if (serviceId === null || serviceId === undefined) {
      // 允许自动生成标识符，但拒绝显式传入null
      if (serviceId === null) {
        throw new Error("服务标识符不能为空");
      }
    }

    this.validateService();
  }

  /**
   * 获取服务标识符
   * @returns 服务标识符
   */
  public get serviceId(): EntityId {
    return this._serviceId.clone();
  }

  /**
   * 获取创建时间
   * @returns 创建时间
   */
  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  /**
   * 获取版本号
   * @returns 版本号
   */
  public get version(): number {
    return this._version;
  }

  /**
   * 获取依赖项
   * @returns 依赖项映射的副本
   */
  public get dependencies(): Map<string, unknown> {
    return new Map(this._dependencies);
  }

  /**
   * 注册依赖项
   * @param name 依赖项名称
   * @param dependency 依赖项实例
   */
  public registerDependency(name: string, dependency: unknown): void {
    this._dependencies.set(name, dependency);
  }

  /**
   * 获取依赖项
   * @param name 依赖项名称
   * @returns 依赖项实例，如果不存在则返回undefined
   */
  public getDependency<T = unknown>(name: string): T | undefined {
    return this._dependencies.get(name) as T | undefined;
  }

  /**
   * 检查依赖项是否存在
   * @param name 依赖项名称
   * @returns 是否存在
   */
  public hasDependency(name: string): boolean {
    return this._dependencies.has(name);
  }

  /**
   * 移除依赖项
   * @param name 依赖项名称
   * @returns 是否成功移除
   */
  public removeDependency(name: string): boolean {
    return this._dependencies.delete(name);
  }

  /**
   * 执行业务逻辑
   * @param operation 操作名称
   * @param params 操作参数
   * @returns 操作结果
   * @throws {Error} 当服务状态不允许执行业务操作时抛出异常
   */
  public executeBusinessLogic(operation: string, params: unknown): unknown {
    if (!this.canExecuteBusinessLogic()) {
      throw new Error("服务状态不允许执行业务操作");
    }

    this.validateDependencies();

    return this.performBusinessLogic(operation, params);
  }

  /**
   * 检查是否可以执行业务逻辑
   * @returns 是否可以执行业务逻辑
   */
  protected canExecuteBusinessLogic(): boolean {
    return true; // 领域服务默认总是可以执行业务逻辑
  }

  /**
   * 验证依赖项
   * @throws {Error} 当依赖项验证失败时抛出异常
   */
  protected validateDependencies(): void {
    const requiredDependencies = this.getRequiredDependencies();

    for (const dependencyName of requiredDependencies) {
      if (!this.hasDependency(dependencyName)) {
        throw new Error(`缺少必需的依赖项: ${dependencyName}`);
      }
    }
  }

  /**
   * 获取必需的依赖项列表
   * @returns 依赖项名称列表
   */
  protected abstract getRequiredDependencies(): string[];

  /**
   * 执行业务逻辑
   * @param operation 操作名称
   * @param params 操作参数
   * @returns 操作结果
   */
  protected abstract performBusinessLogic(
    operation: string,
    params: unknown,
  ): unknown;

  /**
   * 验证服务
   * @throws {Error} 当服务无效时抛出异常
   */
  protected abstract validateService(): void;

  /**
   * 比较两个服务是否相等
   * @param other 要比较的另一个服务
   * @returns 是否相等
   */
  public equals(other: DomainService | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof DomainService)) {
      return false;
    }

    return (
      this._serviceId.equals(other._serviceId) &&
      this._version === other._version &&
      this.constructor === other.constructor
    );
  }

  /**
   * 转换为字符串表示
   * @returns 字符串表示
   */
  public toString(): string {
    return `${this.constructor.name}[${this._serviceId.value}]@${this._createdAt.toISOString()}`;
  }

  /**
   * 转换为JSON表示
   * @returns JSON对象
   */
  public toJSON(): object {
    return {
      serviceId: this._serviceId.toJSON(),
      createdAt: this._createdAt.toISOString(),
      version: this._version,
      serviceType: this.constructor.name,
      dependencies: Array.from(this._dependencies.keys()),
    };
  }

  /**
   * 克隆服务
   * @returns 新的服务实例
   */
  public abstract clone(): DomainService;

  /**
   * 重置服务状态
   * @description 重置服务到初始状态，清除所有依赖项
   */
  public reset(): void {
    this._dependencies.clear();
  }

  /**
   * 获取服务统计信息
   * @returns 服务统计信息
   */
  public getStats(): {
    serviceId: string;
    serviceType: string;
    version: number;
    dependencyCount: number;
    createdAt: Date;
  } {
    return {
      serviceId: this._serviceId.value,
      serviceType: this.constructor.name,
      version: this._version,
      dependencyCount: this._dependencies.size,
      createdAt: this._createdAt,
    };
  }
}
