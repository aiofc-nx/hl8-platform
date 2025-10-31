/**
 * @fileoverview 领域服务注册表实现
 * @description 提供领域服务的注册、管理和发现功能的具体实现
 */

import { IDomainServiceRegistry } from "./domain-service-registry.interface.js";
import { ServiceRegistration } from "./service-registration.interface.js";
import { ServiceLifecycle } from "./service-lifecycle.enum.js";
import {
  ValidationResult,
  ValidationErrorLevel,
} from "../validation/rules/validation-result.interface.js";
import { ValidationError } from "../validation/rules/validation-error.interface.js";

/**
 * 领域服务注册表实现类
 * @description 负责管理领域服务的注册、获取和依赖验证
 */
export class DomainServiceRegistry implements IDomainServiceRegistry {
  private readonly services = new Map<string, ServiceRegistration>();
  private readonly dependencyGraph = new Map<string, string[]>();

  /**
   * 注册领域服务
   * @param serviceType 服务类型标识符
   * @param service 服务实例
   * @param dependencies 服务依赖列表，可选
   * @throws {ServiceRegistryException} 当服务类型已存在或依赖无效时抛出
   */
  register<T>(
    serviceType: string,
    service: T,
    dependencies: string[] = [],
  ): void {
    this.validateServiceType(serviceType);
    this.validateService(service);
    this.validateDependencyList(dependencies);

    if (this.services.has(serviceType)) {
      throw new ServiceRegistryException(
        `Service '${serviceType}' is already registered`,
        serviceType,
        "register",
      );
    }

    const registration: ServiceRegistration = {
      serviceType,
      service,
      dependencies,
      lifecycle: ServiceLifecycle.SINGLETON,
      tags: [],
      priority: 0,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: "1.0.0",
      description: `Service of type ${serviceType}`,
      metadata: {},
    };

    this.services.set(serviceType, registration);
    this.dependencyGraph.set(serviceType, dependencies);
  }

  /**
   * 获取领域服务
   * @param serviceType 服务类型标识符
   * @returns 服务实例，如果未找到则返回 null
   */
  get<T>(serviceType: string): T | null {
    const registration = this.services.get(serviceType);
    if (!registration || !registration.enabled) {
      return null;
    }

    return registration.service as T;
  }

  /**
   * 检查服务是否存在
   * @param serviceType 服务类型标识符
   * @returns 如果服务存在返回 true，否则返回 false
   */
  has(serviceType: string): boolean {
    const registration = this.services.get(serviceType);
    return registration !== undefined && registration.enabled;
  }

  /**
   * 验证所有依赖关系
   * @returns 验证结果，包含依赖验证的详细信息
   */
  validateDependencies(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 检查所有服务的依赖是否存在
    for (const [serviceType, dependencies] of this.dependencyGraph) {
      for (const dependency of dependencies) {
        if (!this.services.has(dependency)) {
          errors.push({
            message: `Service '${serviceType}' depends on '${dependency}' which is not registered`,
            code: "MISSING_DEPENDENCY",
            fieldName: "dependencies",
            value: dependency,
            level: ValidationErrorLevel.ERROR,
            timestamp: Date.now(),
          } as ValidationError);
        }
      }
    }

    // 检查循环依赖
    const cycles = this.detectCycles();
    for (const cycle of cycles) {
      errors.push({
        message: `Circular dependency detected: ${cycle.join(" -> ")}`,
        code: "CIRCULAR_DEPENDENCY",
        fieldName: "dependencies",
        value: cycle,
        level: ValidationErrorLevel.ERROR,
        timestamp: Date.now(),
      } as ValidationError);
    }

    // 检查未使用的服务
    const usedServices = new Set<string>();
    for (const dependencies of this.dependencyGraph.values()) {
      for (const dependency of dependencies) {
        usedServices.add(dependency);
      }
    }

    for (const serviceType of this.services.keys()) {
      if (!usedServices.has(serviceType)) {
        warnings.push({
          message: `Service '${serviceType}' is registered but not used by any other service`,
          code: "UNUSED_SERVICE",
          fieldName: "services",
          value: serviceType,
          level: ValidationErrorLevel.WARNING,
          timestamp: Date.now(),
        } as ValidationError);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info: [],
      executionTime: 0,
      rulesExecuted: 0,
      fieldsValidated: 0,
      hasErrors: () => errors.length > 0,
      hasWarnings: () => warnings.length > 0,
      hasInfo: () => false,
      getAllMessages: () => [...errors, ...warnings].map((e) => e.message),
      getMessagesByLevel: (level: ValidationErrorLevel) => {
        const allErrors = [...errors, ...warnings];
        return allErrors.filter((e) => e.level === level).map((e) => e.message);
      },
      getErrorsForField: (fieldName: string) => {
        return errors.filter((e) => e.fieldName === fieldName);
      },
      getErrorsForRule: (ruleName: string) => {
        return errors.filter((e) => e.ruleName === ruleName);
      },
      merge: (other: ValidationResult) => {
        return {
          isValid: errors.length === 0 && other.errors.length === 0,
          errors: [...errors, ...other.errors],
          warnings: [...warnings, ...other.warnings],
          info: [...[], ...other.info],
          executionTime: 0,
          rulesExecuted: 0,
          fieldsValidated: 0,
          hasErrors: () => errors.length > 0 || other.errors.length > 0,
          hasWarnings: () => warnings.length > 0 || other.warnings.length > 0,
          hasInfo: () => other.info.length > 0,
          getAllMessages: () =>
            [...errors, ...warnings, ...other.errors, ...other.warnings].map(
              (e) => e.message,
            ),
          getMessagesByLevel: (level: ValidationErrorLevel) => {
            const allErrors = [
              ...errors,
              ...warnings,
              ...other.errors,
              ...other.warnings,
            ];
            return allErrors
              .filter((e) => e.level === level)
              .map((e) => e.message);
          },
          getErrorsForField: (fieldName: string) => {
            return [...errors, ...other.errors].filter(
              (e) => e.fieldName === fieldName,
            );
          },
          getErrorsForRule: (ruleName: string) => {
            return [...errors, ...other.errors].filter(
              (e) => e.ruleName === ruleName,
            );
          },
          merge: (otherResult: ValidationResult) => {
            const mergedErrors = [
              ...errors,
              ...other.errors,
              ...otherResult.errors,
            ];
            const mergedWarnings = [
              ...warnings,
              ...other.warnings,
              ...otherResult.warnings,
            ];
            const mergedInfo = [...[], ...other.info, ...otherResult.info];
            return {
              isValid: mergedErrors.length === 0,
              errors: mergedErrors,
              warnings: mergedWarnings,
              info: mergedInfo,
              executionTime: 0,
              rulesExecuted: 0,
              fieldsValidated: 0,
              hasErrors: () => mergedErrors.length > 0,
              hasWarnings: () => mergedWarnings.length > 0,
              hasInfo: () => mergedInfo.length > 0,
              getAllMessages: () =>
                [...mergedErrors, ...mergedWarnings, ...mergedInfo].map(
                  (e) => e.message,
                ),
              getMessagesByLevel: (level: ValidationErrorLevel) => {
                const all = [...mergedErrors, ...mergedWarnings, ...mergedInfo];
                return all
                  .filter((e) => e.level === level)
                  .map((e) => e.message);
              },
              getErrorsForField: (fieldName: string) => {
                return mergedErrors.filter((e) => e.fieldName === fieldName);
              },
              getErrorsForRule: (ruleName: string) => {
                return mergedErrors.filter((e) => e.ruleName === ruleName);
              },
              merge: (otherResult: ValidationResult) => {
                return {
                  isValid:
                    mergedErrors.length === 0 &&
                    otherResult.errors.length === 0,
                  errors: [...mergedErrors, ...otherResult.errors],
                  warnings: [...mergedWarnings, ...otherResult.warnings],
                  info: [...mergedInfo, ...otherResult.info],
                  executionTime: 0,
                  rulesExecuted: 0,
                  fieldsValidated: 0,
                  hasErrors: () =>
                    mergedErrors.length > 0 || otherResult.errors.length > 0,
                  hasWarnings: () =>
                    mergedWarnings.length > 0 ||
                    otherResult.warnings.length > 0,
                  hasInfo: () =>
                    mergedInfo.length > 0 || otherResult.info.length > 0,
                  getAllMessages: () =>
                    [
                      ...mergedErrors,
                      ...mergedWarnings,
                      ...mergedInfo,
                      ...otherResult.errors,
                      ...otherResult.warnings,
                      ...otherResult.info,
                    ].map((e) => e.message),
                  getMessagesByLevel: (level: ValidationErrorLevel) => {
                    const all = [
                      ...mergedErrors,
                      ...mergedWarnings,
                      ...mergedInfo,
                      ...otherResult.errors,
                      ...otherResult.warnings,
                      ...otherResult.info,
                    ];
                    return all
                      .filter((e) => e.level === level)
                      .map((e) => e.message);
                  },
                  getErrorsForField: (fieldName: string) => {
                    return [...mergedErrors, ...otherResult.errors].filter(
                      (e) => e.fieldName === fieldName,
                    );
                  },
                  getErrorsForRule: (ruleName: string) => {
                    return [...mergedErrors, ...otherResult.errors].filter(
                      (e) => e.ruleName === ruleName,
                    );
                  },
                  merge: (otherResult: ValidationResult) => {
                    const result = {
                      isValid:
                        mergedErrors.length === 0 &&
                        otherResult.errors.length === 0,
                      errors: [...mergedErrors, ...otherResult.errors],
                      warnings: [...mergedWarnings, ...otherResult.warnings],
                      info: [...mergedInfo, ...otherResult.info],
                      executionTime: 0,
                      rulesExecuted: 0,
                      fieldsValidated: 0,
                      hasErrors: () =>
                        mergedErrors.length > 0 ||
                        otherResult.errors.length > 0,
                      hasWarnings: () =>
                        mergedWarnings.length > 0 ||
                        otherResult.warnings.length > 0,
                      hasInfo: () =>
                        mergedInfo.length > 0 || otherResult.info.length > 0,
                      getAllMessages: () =>
                        [
                          ...mergedErrors,
                          ...mergedWarnings,
                          ...mergedInfo,
                          ...otherResult.errors,
                          ...otherResult.warnings,
                          ...otherResult.info,
                        ].map((e) => e.message),
                      getMessagesByLevel: (level: ValidationErrorLevel) => {
                        const all = [
                          ...mergedErrors,
                          ...mergedWarnings,
                          ...mergedInfo,
                          ...otherResult.errors,
                          ...otherResult.warnings,
                          ...otherResult.info,
                        ];
                        return all
                          .filter((e) => e.level === level)
                          .map((e) => e.message);
                      },
                      getErrorsForField: (fieldName: string) => {
                        return [...mergedErrors, ...otherResult.errors].filter(
                          (e) => e.fieldName === fieldName,
                        );
                      },
                      getErrorsForRule: (ruleName: string) => {
                        return [...mergedErrors, ...otherResult.errors].filter(
                          (e) => e.ruleName === ruleName,
                        );
                      },
                      merge: (_otherResult: ValidationResult) =>
                        result as ValidationResult,
                      toJSON: () => ({
                        isValid:
                          mergedErrors.length === 0 &&
                          otherResult.errors.length === 0,
                        errorCount:
                          mergedErrors.length + otherResult.errors.length,
                        warningCount:
                          mergedWarnings.length + otherResult.warnings.length,
                        infoCount: mergedInfo.length + otherResult.info.length,
                        executionTime: 0,
                        rulesExecuted: 0,
                        fieldsValidated: 0,
                        errors: [...mergedErrors, ...otherResult.errors].map(
                          (e) => ({
                            message: e.message,
                            code: e.code,
                            fieldName: e.fieldName,
                            ruleName: e.ruleName,
                            level: e.level,
                          }),
                        ),
                        warnings: [
                          ...mergedWarnings,
                          ...otherResult.warnings,
                        ].map((w) => ({
                          message: w.message,
                          code: w.code,
                          fieldName: w.fieldName,
                          ruleName: w.ruleName,
                          level: w.level,
                        })),
                        info: [...mergedInfo, ...otherResult.info].map((i) => ({
                          message: i.message,
                          code: i.code,
                          fieldName: i.fieldName,
                          ruleName: i.ruleName,
                          level: i.level,
                        })),
                      }),
                      toString: () =>
                        `ValidationResult: ${mergedErrors.length + otherResult.errors.length} errors, ${mergedWarnings.length + otherResult.warnings.length} warnings`,
                    } as ValidationResult;
                    return result;
                  },
                  toJSON: () => ({
                    isValid:
                      mergedErrors.length === 0 &&
                      otherResult.errors.length === 0,
                    errorCount: mergedErrors.length + otherResult.errors.length,
                    warningCount:
                      mergedWarnings.length + otherResult.warnings.length,
                    infoCount: mergedInfo.length + otherResult.info.length,
                    executionTime: 0,
                    rulesExecuted: 0,
                    fieldsValidated: 0,
                    errors: [...mergedErrors, ...otherResult.errors].map(
                      (e) => ({
                        message: e.message,
                        code: e.code,
                        fieldName: e.fieldName,
                        ruleName: e.ruleName,
                        level: e.level,
                      }),
                    ),
                    warnings: [...mergedWarnings, ...otherResult.warnings].map(
                      (w) => ({
                        message: w.message,
                        code: w.code,
                        fieldName: w.fieldName,
                        ruleName: w.ruleName,
                        level: w.level,
                      }),
                    ),
                    info: [...mergedInfo, ...otherResult.info].map((i) => ({
                      message: i.message,
                      code: i.code,
                      fieldName: i.fieldName,
                      ruleName: i.ruleName,
                      level: i.level,
                    })),
                  }),
                  toString: () =>
                    `ValidationResult: ${mergedErrors.length + otherResult.errors.length} errors, ${mergedWarnings.length + otherResult.warnings.length} warnings`,
                } as ValidationResult;
              },
              toJSON: () => ({
                isValid: mergedErrors.length === 0,
                errorCount: mergedErrors.length,
                warningCount: mergedWarnings.length,
                infoCount: mergedInfo.length,
                executionTime: 0,
                rulesExecuted: 0,
                fieldsValidated: 0,
                errors: mergedErrors.map((e) => ({
                  message: e.message,
                  code: e.code,
                  fieldName: e.fieldName,
                  ruleName: e.ruleName,
                  level: e.level,
                })),
                warnings: mergedWarnings.map((w) => ({
                  message: w.message,
                  code: w.code,
                  fieldName: w.fieldName,
                  ruleName: w.ruleName,
                  level: w.level,
                })),
                info: mergedInfo.map((i) => ({
                  message: i.message,
                  code: i.code,
                  fieldName: i.fieldName,
                  ruleName: i.ruleName,
                  level: i.level,
                })),
              }),
              toString: () =>
                `ValidationResult: ${mergedErrors.length} errors, ${mergedWarnings.length} warnings`,
            } as ValidationResult;
          },
          toJSON: () => ({
            isValid: errors.length === 0 && other.errors.length === 0,
            errorCount: errors.length + other.errors.length,
            warningCount: warnings.length + other.warnings.length,
            infoCount: other.info.length,
            executionTime: 0,
            rulesExecuted: 0,
            fieldsValidated: 0,
            errors: [...errors, ...other.errors].map((e) => ({
              message: e.message,
              code: e.code,
              fieldName: e.fieldName,
              ruleName: e.ruleName,
              level: e.level,
              details: e.details,
            })),
            warnings: [...warnings, ...other.warnings].map((w) => ({
              message: w.message,
              code: w.code,
              fieldName: w.fieldName,
              ruleName: w.ruleName,
              level: w.level,
              details: w.details,
            })),
            info: [],
          }),
          toString: () =>
            `ValidationResult: ${errors.length + other.errors.length} errors, ${warnings.length + other.warnings.length} warnings`,
        } as ValidationResult;
      },
      toJSON: () => ({
        isValid: errors.length === 0,
        errorCount: errors.length,
        warningCount: warnings.length,
        infoCount: 0,
        executionTime: 0,
        rulesExecuted: 0,
        fieldsValidated: 0,
        errors: errors.map((e) => ({
          message: e.message,
          code: e.code,
          fieldName: e.fieldName,
          ruleName: e.ruleName,
          level: e.level,
          details: e.details,
        })),
        warnings: warnings.map((w) => ({
          message: w.message,
          code: w.code,
          fieldName: w.fieldName,
          ruleName: w.ruleName,
          level: w.level,
          details: w.details,
        })),
        info: [],
      }),
      toString: () =>
        `ValidationResult: ${errors.length} errors, ${warnings.length} warnings`,
    } as ValidationResult;
  }

  /**
   * 获取服务依赖列表
   * @param serviceType 服务类型标识符
   * @returns 依赖服务类型列表
   */
  getServiceDependencies(serviceType: string): string[] {
    return this.dependencyGraph.get(serviceType) || [];
  }

  /**
   * 注销服务
   * @param serviceType 服务类型标识符
   * @returns 如果服务被成功移除返回 true，否则返回 false
   */
  unregister(serviceType: string): boolean {
    const removed = this.services.delete(serviceType);
    this.dependencyGraph.delete(serviceType);
    return removed;
  }

  /**
   * 获取所有已注册的服务类型
   * @returns 服务类型列表
   */
  getAllServiceTypes(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * 清空注册表
   */
  clear(): void {
    this.services.clear();
    this.dependencyGraph.clear();
  }

  /**
   * 验证服务类型
   * @param serviceType 服务类型标识符
   * @throws {ServiceRegistryException} 当服务类型无效时抛出
   */
  private validateServiceType(serviceType: string): void {
    if (!serviceType || typeof serviceType !== "string") {
      throw new ServiceRegistryException(
        "Service type must be a non-empty string",
        serviceType,
        "validateServiceType",
      );
    }

    if (serviceType.trim().length === 0) {
      throw new ServiceRegistryException(
        "Service type cannot be empty or whitespace",
        serviceType,
        "validateServiceType",
      );
    }
  }

  /**
   * 验证服务实例
   * @param service 服务实例
   * @throws {ServiceRegistryException} 当服务实例无效时抛出
   */
  private validateService(service: unknown): void {
    if (service === null || service === undefined) {
      throw new ServiceRegistryException(
        "Service instance cannot be null or undefined",
        "unknown",
        "validateService",
      );
    }
  }

  /**
   * 验证依赖列表
   * @param dependencies 依赖列表
   * @throws {ServiceRegistryException} 当依赖列表无效时抛出
   */
  private validateDependencyList(dependencies: string[]): void {
    if (!Array.isArray(dependencies)) {
      throw new ServiceRegistryException(
        "Dependencies must be an array",
        "unknown",
        "validateDependencies",
      );
    }

    for (const dependency of dependencies) {
      if (!dependency || typeof dependency !== "string") {
        throw new ServiceRegistryException(
          "All dependencies must be non-empty strings",
          dependency,
          "validateDependencies",
        );
      }
    }
  }

  /**
   * 检测循环依赖
   * @returns 循环依赖列表
   */
  private detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        cycles.push(path.slice(cycleStart).concat(node));
        return;
      }

      if (visited.has(node)) {
        return;
      }

      visited.add(node);
      recursionStack.add(node);

      const dependencies = this.dependencyGraph.get(node) || [];
      for (const dependency of dependencies) {
        dfs(dependency, [...path, node]);
      }

      recursionStack.delete(node);
    };

    for (const serviceType of this.services.keys()) {
      if (!visited.has(serviceType)) {
        dfs(serviceType, []);
      }
    }

    return cycles;
  }
}

/**
 * 服务注册表异常类
 * @description 服务注册表操作相关的异常
 */
export class ServiceRegistryException extends Error {
  constructor(
    message: string,
    public readonly serviceType: string,
    public readonly operation: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = "ServiceRegistryException";
  }
}
