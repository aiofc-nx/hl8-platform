/**
 * @fileoverview 用例装饰器
 * @description 提供用例的装饰器功能
 */

import { SetMetadata } from "@nestjs/common";

/**
 * 用例元数据键
 */
export const USE_CASE_METADATA_KEY = "useCase";

/**
 * 用例配置接口
 */
export interface UseCaseConfig {
  /** 用例名称 */
  name: string;
  /** 用例描述 */
  description?: string;
  /** 用例版本 */
  version?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 权限要求 */
  permissions?: string[];
  /** 标签 */
  tags?: string[];
}

/**
 * 用例装饰器
 * @description 标记类为用例并配置元数据
 * @param config 用例配置
 * @returns 装饰器函数
 */
export function UseCase(config: UseCaseConfig) {
  return function (target: new (...args: unknown[]) => unknown) {
    // 设置用例元数据
    SetMetadata(USE_CASE_METADATA_KEY, {
      ...config,
      enabled: config.enabled !== false,
      version: config.version || "1.0.0",
      timeout: config.timeout || 30000, // 默认30秒
      retryCount: config.retryCount || 0,
      permissions: config.permissions || [],
      tags: config.tags || [],
    })(target);

    // 添加用例标识
    Reflect.defineProperty(target, "isUseCase", {
      value: true,
      writable: false,
      enumerable: false,
      configurable: false,
    });

    return target;
  };
}

/**
 * 检查是否为用例
 * @param target 目标类
 * @returns 是否为用例
 */
export function isUseCase(
  target: new (...args: unknown[]) => unknown,
): boolean {
  return Reflect.get(target, "isUseCase") === true;
}

/**
 * 获取用例配置
 * @param target 目标类
 * @returns 用例配置
 */
export function getUseCaseConfig(
  target: new (...args: unknown[]) => unknown,
): UseCaseConfig | undefined {
  return Reflect.getMetadata(USE_CASE_METADATA_KEY, target);
}
