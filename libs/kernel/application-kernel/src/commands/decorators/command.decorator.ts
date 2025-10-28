/**
 * @fileoverview 命令装饰器
 * @description 提供命令的装饰器功能
 */

import { SetMetadata } from "@nestjs/common";

/**
 * 命令元数据键
 */
export const COMMAND_METADATA_KEY = "command";

/**
 * 命令配置接口
 */
export interface CommandConfig {
  /** 命令名称 */
  name: string;
  /** 命令描述 */
  description?: string;
  /** 命令版本 */
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
  /** 是否支持幂等性 */
  idempotent?: boolean;
  /** 业务键字段 */
  businessKeyFields?: string[];
}

/**
 * 命令装饰器
 * @description 标记类为命令并配置元数据
 * @param config 命令配置
 * @returns 装饰器函数
 */
export function Command(config: CommandConfig) {
  return function (target: new (...args: unknown[]) => unknown) {
    // 设置命令元数据
    SetMetadata(COMMAND_METADATA_KEY, {
      ...config,
      enabled: config.enabled !== false,
      version: config.version || "1.0.0",
      timeout: config.timeout || 30000, // 默认30秒
      retryCount: config.retryCount || 0,
      permissions: config.permissions || [],
      tags: config.tags || [],
      idempotent: config.idempotent || false,
      businessKeyFields: config.businessKeyFields || [],
    })(target);

    // 添加命令标识
    Reflect.defineProperty(target, "isCommand", {
      value: true,
      writable: false,
      enumerable: false,
      configurable: false,
    });

    return target;
  };
}

/**
 * 检查是否为命令
 * @param target 目标类
 * @returns 是否为命令
 */
export function isCommand(
  target: new (...args: unknown[]) => unknown,
): boolean {
  return Reflect.get(target, "isCommand") === true;
}

/**
 * 获取命令配置
 * @param target 目标类
 * @returns 命令配置
 */
export function getCommandConfig(
  target: new (...args: unknown[]) => unknown,
): CommandConfig | undefined {
  return Reflect.getMetadata(COMMAND_METADATA_KEY, target);
}
