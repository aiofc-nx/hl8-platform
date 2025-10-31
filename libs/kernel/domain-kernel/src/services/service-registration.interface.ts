/**
 * @fileoverview 服务注册接口定义
 * @description 提供服务注册的元数据和配置信息
 */

import { ServiceLifecycle } from "./service-locator.interface.js";

/**
 * 服务注册接口
 * @description 描述服务注册的完整信息
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
  /** 服务标签 */
  tags: string[];
  /** 服务优先级 */
  priority: number;
  /** 是否启用 */
  enabled: boolean;
  /** 创建时间 */
  createdAt: Date;
  /** 最后更新时间 */
  updatedAt: Date;
  /** 服务版本 */
  version: string;
  /** 服务描述 */
  description: string;
  /** 自定义元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 服务注册构建器接口
 * @description 提供链式API构建服务注册信息
 */
export interface IServiceRegistrationBuilder {
  /**
   * 设置服务类型
   * @param serviceType 服务类型标识符
   * @returns 构建器实例
   */
  withServiceType(serviceType: string): IServiceRegistrationBuilder;

  /**
   * 设置服务实例
   * @param service 服务实例
   * @returns 构建器实例
   */
  withService(service: unknown): IServiceRegistrationBuilder;

  /**
   * 添加依赖
   * @param dependency 依赖名称
   * @returns 构建器实例
   */
  withDependency(dependency: string): IServiceRegistrationBuilder;

  /**
   * 设置依赖列表
   * @param dependencies 依赖名称列表
   * @returns 构建器实例
   */
  withDependencies(dependencies: string[]): IServiceRegistrationBuilder;

  /**
   * 设置生命周期
   * @param lifecycle 服务生命周期
   * @returns 构建器实例
   */
  withLifecycle(lifecycle: ServiceLifecycle): IServiceRegistrationBuilder;

  /**
   * 添加标签
   * @param tag 标签名称
   * @returns 构建器实例
   */
  withTag(tag: string): IServiceRegistrationBuilder;

  /**
   * 设置标签列表
   * @param tags 标签列表
   * @returns 构建器实例
   */
  withTags(tags: string[]): IServiceRegistrationBuilder;

  /**
   * 设置优先级
   * @param priority 优先级数值
   * @returns 构建器实例
   */
  withPriority(priority: number): IServiceRegistrationBuilder;

  /**
   * 设置启用状态
   * @param enabled 是否启用
   * @returns 构建器实例
   */
  withEnabled(enabled: boolean): IServiceRegistrationBuilder;

  /**
   * 设置版本
   * @param version 版本号
   * @returns 构建器实例
   */
  withVersion(version: string): IServiceRegistrationBuilder;

  /**
   * 设置描述
   * @param description 服务描述
   * @returns 构建器实例
   */
  withDescription(description: string): IServiceRegistrationBuilder;

  /**
   * 添加元数据
   * @param key 元数据键
   * @param value 元数据值
   * @returns 构建器实例
   */
  withMetadata(key: string, value: unknown): IServiceRegistrationBuilder;

  /**
   * 设置元数据
   * @param metadata 元数据对象
   * @returns 构建器实例
   */
  withMetadataObject(
    metadata: Record<string, unknown>,
  ): IServiceRegistrationBuilder;

  /**
   * 构建服务注册对象
   * @returns 服务注册实例
   */
  build(): ServiceRegistration;
}

/**
 * 服务注册验证器接口
 * @description 提供服务注册信息的验证功能
 */
export interface IServiceRegistrationValidator {
  /**
   * 验证服务注册
   * @param registration 服务注册信息
   * @returns 验证结果
   */
  validate(
    registration: ServiceRegistration,
  ): ServiceRegistrationValidationResult;

  /**
   * 验证服务类型
   * @param serviceType 服务类型标识符
   * @returns 验证结果
   */
  validateServiceType(serviceType: string): ServiceRegistrationValidationResult;

  /**
   * 验证服务实例
   * @param service 服务实例
   * @returns 验证结果
   */
  validateService(service: unknown): ServiceRegistrationValidationResult;

  /**
   * 验证依赖列表
   * @param dependencies 依赖列表
   * @returns 验证结果
   */
  validateDependencies(
    dependencies: string[],
  ): ServiceRegistrationValidationResult;

  /**
   * 验证生命周期
   * @param lifecycle 服务生命周期
   * @returns 验证结果
   */
  validateLifecycle(
    lifecycle: ServiceLifecycle,
  ): ServiceRegistrationValidationResult;
}

/**
 * 服务注册验证结果接口
 * @description 描述服务注册验证的结果
 */
export interface ServiceRegistrationValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
  /** 验证时间 */
  validatedAt: Date;
  /** 验证详情 */
  details: Record<string, unknown>;
}
