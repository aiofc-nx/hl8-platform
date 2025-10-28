/**
 * @fileoverview Saga装饰器
 * @description 提供Saga相关的装饰器功能
 */

import type { SagaConfig } from "../base/saga.base.js";
import type { StepConfig } from "../base/saga-step.js";

/**
 * Saga元数据
 * @description Saga的元数据信息
 */
export interface SagaMetadata {
  /** Saga名称 */
  name: string;
  /** Saga描述 */
  description?: string;
  /** Saga版本 */
  version?: string;
  /** 关联的聚合根类型 */
  aggregateType?: string;
  /** 配置选项 */
  config?: Partial<SagaConfig>;
}

/**
 * Saga步骤元数据
 * @description Saga步骤的元数据信息
 */
export interface SagaStepMetadata {
  /** 步骤名称 */
  name: string;
  /** 步骤描述 */
  description?: string;
  /** 步骤顺序 */
  order: number;
  /** 是否启用 */
  enabled?: boolean;
  /** 配置选项 */
  config?: Partial<StepConfig>;
}

/**
 * Saga装饰器选项
 * @description Saga装饰器的配置选项
 */
export interface SagaOptions {
  /** Saga名称 */
  name: string;
  /** Saga描述 */
  description?: string;
  /** Saga版本 */
  version?: string;
  /** 关联的聚合根类型 */
  aggregateType?: string;
  /** 配置选项 */
  config?: Partial<SagaConfig>;
}

/**
 * Saga步骤装饰器选项
 * @description Saga步骤装饰器的配置选项
 */
export interface SagaStepOptions {
  /** 步骤名称 */
  name: string;
  /** 步骤描述 */
  description?: string;
  /** 步骤顺序 */
  order: number;
  /** 是否启用 */
  enabled?: boolean;
  /** 配置选项 */
  config?: Partial<StepConfig>;
}

/**
 * Saga装饰器
 * @description 标记类为Saga并添加元数据
 * @param options Saga选项
 */
export function Saga(options: SagaOptions) {
  return function <T extends { new (...args: unknown[]): unknown }>(
    constructor: T,
  ) {
    const metadata: SagaMetadata = {
      name: options.name,
      description: options.description,
      version: options.version,
      aggregateType: options.aggregateType,
      config: options.config,
    };

    // 将元数据添加到类的原型上
    Reflect.defineMetadata("saga:metadata", metadata, constructor.prototype);

    // 添加静态方法获取元数据
    (constructor as { getSagaMetadata?: () => SagaMetadata }).getSagaMetadata =
      function (): SagaMetadata {
        return metadata;
      };

    return constructor;
  };
}

/**
 * Saga步骤装饰器
 * @description 标记方法为Saga步骤并添加元数据
 * @param options 步骤选项
 */
export function SagaStep(options: SagaStepOptions) {
  return function (
    target: unknown,
    propertyKey: string,
    _descriptor: PropertyDescriptor,
  ) {
    const metadata: SagaStepMetadata = {
      name: options.name,
      description: options.description,
      order: options.order,
      enabled: options.enabled,
      config: options.config,
    };

    // 将元数据添加到方法上
    Reflect.defineMetadata("saga:step:metadata", metadata, target, propertyKey);

    // 获取现有的步骤列表
    const existingSteps = Reflect.getMetadata("saga:steps", target) || [];
    existingSteps.push({
      methodName: propertyKey,
      metadata,
    });

    // 按顺序排序
    existingSteps.sort(
      (a: { metadata: SagaStepMetadata }, b: { metadata: SagaStepMetadata }) =>
        a.metadata.order - b.metadata.order,
    );

    Reflect.defineMetadata("saga:steps", existingSteps, target);
  };
}

/**
 * Saga前置步骤装饰器
 * @description 标记方法为Saga前置步骤
 * @param stepName 步骤名称
 */
export function BeforeStep(stepName: string) {
  return function (
    target: unknown,
    propertyKey: string,
    _descriptor: PropertyDescriptor,
  ) {
    const metadata = {
      type: "before",
      stepName,
      methodName: propertyKey,
    };

    const existingHooks = Reflect.getMetadata("saga:hooks", target) || [];
    existingHooks.push(metadata);
    Reflect.defineMetadata("saga:hooks", existingHooks, target);
  };
}

/**
 * Saga后置步骤装饰器
 * @description 标记方法为Saga后置步骤
 * @param stepName 步骤名称
 */
export function AfterStep(stepName: string) {
  return function (
    target: unknown,
    propertyKey: string,
    _descriptor: PropertyDescriptor,
  ) {
    const metadata = {
      type: "after",
      stepName,
      methodName: propertyKey,
    };

    const existingHooks = Reflect.getMetadata("saga:hooks", target) || [];
    existingHooks.push(metadata);
    Reflect.defineMetadata("saga:hooks", existingHooks, target);
  };
}

/**
 * Saga错误处理装饰器
 * @description 标记方法为Saga错误处理器
 * @param stepName 步骤名称（可选）
 */
export function OnError(stepName?: string) {
  return function (
    target: unknown,
    propertyKey: string,
    _descriptor: PropertyDescriptor,
  ) {
    const metadata = {
      type: "error",
      stepName,
      methodName: propertyKey,
    };

    const existingHooks = Reflect.getMetadata("saga:hooks", target) || [];
    existingHooks.push(metadata);
    Reflect.defineMetadata("saga:hooks", existingHooks, target);
  };
}

/**
 * Saga补偿装饰器
 * @description 标记方法为Saga补偿处理器
 * @param stepName 步骤名称（可选）
 */
export function OnCompensate(stepName?: string) {
  return function (
    target: unknown,
    propertyKey: string,
    _descriptor: PropertyDescriptor,
  ) {
    const metadata = {
      type: "compensate",
      stepName,
      methodName: propertyKey,
    };

    const existingHooks = Reflect.getMetadata("saga:hooks", target) || [];
    existingHooks.push(metadata);
    Reflect.defineMetadata("saga:hooks", existingHooks, target);
  };
}

/**
 * Saga条件装饰器
 * @description 标记方法为Saga条件检查器
 * @param stepName 步骤名称
 */
export function StepCondition(stepName: string) {
  return function (
    target: unknown,
    propertyKey: string,
    _descriptor: PropertyDescriptor,
  ) {
    const metadata = {
      type: "condition",
      stepName,
      methodName: propertyKey,
    };

    const existingHooks = Reflect.getMetadata("saga:hooks", target) || [];
    existingHooks.push(metadata);
    Reflect.defineMetadata("saga:hooks", existingHooks, target);
  };
}

/**
 * Saga超时装饰器
 * @description 设置Saga的超时时间
 * @param timeout 超时时间（毫秒）
 */
export function Timeout(timeout: number) {
  return function (
    target: unknown,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) {
    if (propertyKey && descriptor) {
      // 方法装饰器
      Reflect.defineMetadata("saga:timeout", timeout, target, propertyKey);
    } else {
      // 类装饰器
      Reflect.defineMetadata("saga:timeout", timeout, target);
    }
  };
}

/**
 * Saga重试装饰器
 * @description 设置Saga的重试配置
 * @param retryConfig 重试配置
 */
export function Retry(retryConfig: {
  maxAttempts: number;
  backoffMs: number;
  maxBackoffMs: number;
}) {
  return function (target: unknown) {
    Reflect.defineMetadata("saga:retry", retryConfig, target);
  };
}

/**
 * Saga补偿装饰器
 * @description 设置Saga的补偿配置
 * @param compensationConfig 补偿配置
 */
export function Compensation(compensationConfig: {
  enabled: boolean;
  timeout: number;
  maxAttempts: number;
}) {
  return function (target: unknown) {
    Reflect.defineMetadata("saga:compensation", compensationConfig, target);
  };
}

/**
 * Saga性能装饰器
 * @description 设置Saga的性能配置
 * @param performanceConfig 性能配置
 */
export function Performance(performanceConfig: {
  maxConcurrency: number;
  batchSize: number;
}) {
  return function (target: unknown) {
    Reflect.defineMetadata("saga:performance", performanceConfig, target);
  };
}

/**
 * 获取Saga元数据
 * @param target 目标类
 * @returns Saga元数据
 */
export function getSagaMetadata(target: unknown): SagaMetadata | undefined {
  return Reflect.getMetadata("saga:metadata", target);
}

/**
 * 获取Saga步骤列表
 * @param target 目标类
 * @returns 步骤列表
 */
export function getSagaSteps(target: unknown): Array<{
  methodName: string;
  metadata: SagaStepMetadata;
}> {
  return Reflect.getMetadata("saga:steps", target) || [];
}

/**
 * 获取Saga钩子列表
 * @param target 目标类
 * @returns 钩子列表
 */
export function getSagaHooks(target: unknown): Array<{
  type: string;
  stepName?: string;
  methodName: string;
}> {
  return Reflect.getMetadata("saga:hooks", target) || [];
}

/**
 * 获取Saga超时配置
 * @param target 目标类
 * @returns 超时时间
 */
export function getSagaTimeout(target: unknown): number | undefined {
  return Reflect.getMetadata("saga:timeout", target);
}

/**
 * 获取Saga重试配置
 * @param target 目标类
 * @returns 重试配置
 */
export function getSagaRetry(target: unknown):
  | {
      maxAttempts: number;
      backoffMs: number;
      maxBackoffMs: number;
    }
  | undefined {
  return Reflect.getMetadata("saga:retry", target);
}

/**
 * 获取Saga补偿配置
 * @param target 目标类
 * @returns 补偿配置
 */
export function getSagaCompensation(target: unknown):
  | {
      enabled: boolean;
      timeout: number;
      maxAttempts: number;
    }
  | undefined {
  return Reflect.getMetadata("saga:compensation", target);
}

/**
 * 获取Saga性能配置
 * @param target 目标类
 * @returns 性能配置
 */
export function getSagaPerformance(target: unknown):
  | {
      maxConcurrency: number;
      batchSize: number;
    }
  | undefined {
  return Reflect.getMetadata("saga:performance", target);
}

/**
 * 获取步骤元数据
 * @param target 目标类
 * @param methodName 方法名
 * @returns 步骤元数据
 */
export function getStepMetadata(
  target: unknown,
  methodName: string,
): SagaStepMetadata | undefined {
  return Reflect.getMetadata("saga:step:metadata", target, methodName);
}

/**
 * 获取步骤钩子
 * @param target 目标类
 * @param stepName 步骤名称
 * @param type 钩子类型
 * @returns 钩子方法名
 */
export function getStepHooks(
  target: unknown,
  stepName: string,
  type: string,
): string[] {
  const hooks = getSagaHooks(target);
  return hooks
    .filter((hook) => hook.stepName === stepName && hook.type === type)
    .map((hook) => hook.methodName);
}

/**
 * 获取全局钩子
 * @param target 目标类
 * @param type 钩子类型
 * @returns 钩子方法名
 */
export function getGlobalHooks(target: unknown, type: string): string[] {
  const hooks = getSagaHooks(target);
  return hooks
    .filter((hook) => !hook.stepName && hook.type === type)
    .map((hook) => hook.methodName);
}
