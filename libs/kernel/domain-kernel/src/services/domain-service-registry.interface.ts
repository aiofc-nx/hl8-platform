/**
 * @fileoverview 领域服务注册表接口定义
 * @description 提供领域服务的注册、管理和发现功能，支持依赖注入和服务生命周期管理
 */

import { ValidationResult } from "../validation/rules/validation-result.interface.js";

/**
 * 领域服务注册表接口
 * @description 负责注册和管理领域服务，提供服务的注册、获取和依赖验证功能
 * @template T 服务类型
 */
export interface IDomainServiceRegistry {
  /**
   * 注册领域服务
   * @description 将服务实例注册到注册表中，支持依赖关系管理
   * @param serviceType 服务类型标识符
   * @param service 服务实例
   * @param dependencies 服务依赖列表，可选
   * @throws {ServiceRegistryException} 当服务类型已存在或依赖无效时抛出
   * @example
   * ```typescript
   * registry.register('UserService', userService, ['UserRepository', 'EmailService']);
   * ```
   */
  register<T>(serviceType: string, service: T, dependencies?: string[]): void;

  /**
   * 获取领域服务
   * @description 根据服务类型获取已注册的服务实例
   * @param serviceType 服务类型标识符
   * @returns 服务实例，如果未找到则返回 null
   * @example
   * ```typescript
   * const userService = registry.get<UserService>('UserService');
   * ```
   */
  get<T>(serviceType: string): T | null;

  /**
   * 检查服务是否存在
   * @description 验证指定类型的服务是否已注册
   * @param serviceType 服务类型标识符
   * @returns 如果服务存在返回 true，否则返回 false
   * @example
   * ```typescript
   * if (registry.has('UserService')) {
   *   // 服务已注册
   * }
   * ```
   */
  has(serviceType: string): boolean;

  /**
   * 验证所有依赖关系
   * @description 检查所有已注册服务的依赖关系是否完整和有效
   * @returns 验证结果，包含依赖验证的详细信息
   * @example
   * ```typescript
   * const result = registry.validateDependencies();
   * if (!result.isValid) {
   *   console.error('依赖验证失败:', result.errors);
   * }
   * ```
   */
  validateDependencies(): ValidationResult;

  /**
   * 获取服务依赖列表
   * @description 获取指定服务的所有依赖项
   * @param serviceType 服务类型标识符
   * @returns 依赖服务类型列表
   * @example
   * ```typescript
   * const dependencies = registry.getServiceDependencies('UserService');
   * // 返回: ['UserRepository', 'EmailService']
   * ```
   */
  getServiceDependencies(serviceType: string): string[];

  /**
   * 注销服务
   * @description 从注册表中移除指定的服务
   * @param serviceType 服务类型标识符
   * @returns 如果服务被成功移除返回 true，否则返回 false
   * @example
   * ```typescript
   * const removed = registry.unregister('UserService');
   * ```
   */
  unregister(serviceType: string): boolean;

  /**
   * 获取所有已注册的服务类型
   * @description 返回注册表中所有服务的类型标识符
   * @returns 服务类型列表
   * @example
   * ```typescript
   * const serviceTypes = registry.getAllServiceTypes();
   * // 返回: ['UserService', 'OrderService', 'PaymentService']
   * ```
   */
  getAllServiceTypes(): string[];

  /**
   * 清空注册表
   * @description 移除所有已注册的服务
   * @example
   * ```typescript
   * registry.clear();
   * ```
   */
  clear(): void;
}
