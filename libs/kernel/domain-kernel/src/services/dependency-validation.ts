/**
 * @fileoverview 依赖验证逻辑实现
 * @description 提供依赖关系验证和循环依赖检测功能
 */

import {
  ValidationResult,
  ValidationErrorLevel,
} from "../validation/rules/validation-result.interface.js";
import { ValidationError } from "../validation/rules/validation-error.interface.js";

/**
 * 依赖验证器类
 * @description 负责验证服务依赖关系的完整性和有效性
 */
export class DependencyValidator {
  private readonly dependencyGraph = new Map<string, string[]>();
  private readonly serviceTypes = new Set<string>();

  /**
   * 添加服务依赖关系
   * @param serviceType 服务类型
   * @param dependencies 依赖列表
   */
  addDependency(serviceType: string, dependencies: string[]): void {
    this.serviceTypes.add(serviceType);
    this.dependencyGraph.set(serviceType, dependencies);
  }

  /**
   * 验证所有依赖关系
   * @returns 验证结果
   */
  validateAllDependencies(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 验证每个服务的依赖
    for (const [serviceType, dependencies] of this.dependencyGraph) {
      const serviceValidation = this.validateServiceDependencies(
        serviceType,
        dependencies,
      );
      errors.push(...serviceValidation.errors);
      warnings.push(...serviceValidation.warnings);
    }

    // 检测循环依赖
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

    // 检测未使用的服务
    const unusedServices = this.detectUnusedServices();
    for (const serviceType of unusedServices) {
      warnings.push({
        message: `Service '${serviceType}' is registered but not used by any other service`,
        code: "UNUSED_SERVICE",
        fieldName: "services",
        value: serviceType,
        level: ValidationErrorLevel.WARNING,
        timestamp: Date.now(),
      } as ValidationError);
    }

    // 检测孤立服务
    const orphanedServices = this.detectOrphanedServices();
    for (const serviceType of orphanedServices) {
      warnings.push({
        message: `Service '${serviceType}' has no dependencies and is not depended upon`,
        code: "ORPHANED_SERVICE",
        fieldName: "services",
        value: serviceType,
        level: ValidationErrorLevel.WARNING,
        timestamp: Date.now(),
      } as ValidationError);
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
      merge: (other: ValidationResult): ValidationResult => {
        const mergedErrors = [...errors, ...other.errors];
        const mergedWarnings = [...warnings, ...other.warnings];
        const mergedInfo = [...[], ...other.info];
        const current = {
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
            return allErrors
              .filter((e) => e.level === level)
              .map((e) => e.message);
          },
          getErrorsForField: (fieldName: string) => {
            return errors.filter((e) => e.fieldName === fieldName);
          },
          getErrorsForRule: (ruleName: string) => {
            return errors.filter((e) => e.ruleName === ruleName);
          },
          merge: (other: ValidationResult) => current.merge(other),
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
            })),
            warnings: warnings.map((w) => ({
              message: w.message,
              code: w.code,
              fieldName: w.fieldName,
              ruleName: w.ruleName,
              level: w.level,
            })),
            info: [],
          }),
          toString: () =>
            `ValidationResult: ${errors.length} errors, ${warnings.length} warnings`,
        };
        return {
          isValid: mergedErrors.length === 0,
          errors: mergedErrors,
          warnings: mergedWarnings,
          info: mergedInfo,
          executionTime: Math.max(
            current.executionTime,
            other.executionTime || 0,
          ),
          rulesExecuted: current.rulesExecuted + (other.rulesExecuted || 0),
          fieldsValidated:
            current.fieldsValidated + (other.fieldsValidated || 0),
          hasErrors: () => mergedErrors.length > 0,
          hasWarnings: () => mergedWarnings.length > 0,
          hasInfo: () => mergedInfo.length > 0,
          getAllMessages: () =>
            [...mergedErrors, ...mergedWarnings, ...mergedInfo].map(
              (e) => e.message,
            ),
          getMessagesByLevel: (level: ValidationErrorLevel) => {
            const all = [...mergedErrors, ...mergedWarnings, ...mergedInfo];
            return all.filter((e) => e.level === level).map((e) => e.message);
          },
          getErrorsForField: (fieldName: string) => {
            return mergedErrors.filter((e) => e.fieldName === fieldName);
          },
          getErrorsForRule: (ruleName: string) => {
            return mergedErrors.filter((e) => e.ruleName === ruleName);
          },
          merge: (otherResult: ValidationResult) =>
            current.merge(other).merge(otherResult),
          toJSON: () => ({
            isValid: mergedErrors.length === 0,
            errorCount: mergedErrors.length,
            warningCount: mergedWarnings.length,
            infoCount: mergedInfo.length,
            executionTime: Math.max(
              current.executionTime,
              other.executionTime || 0,
            ),
            rulesExecuted: current.rulesExecuted + (other.rulesExecuted || 0),
            fieldsValidated:
              current.fieldsValidated + (other.fieldsValidated || 0),
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
   * 验证单个服务的依赖
   * @param serviceType 服务类型
   * @param dependencies 依赖列表
   * @returns 验证结果
   */
  private validateServiceDependencies(
    serviceType: string,
    dependencies: string[],
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 检查依赖是否存在
    for (const dependency of dependencies) {
      if (!this.serviceTypes.has(dependency)) {
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

    // 检查自依赖
    if (dependencies.includes(serviceType)) {
      errors.push({
        message: `Service '${serviceType}' cannot depend on itself`,
        code: "SELF_DEPENDENCY",
        fieldName: "dependencies",
        value: serviceType,
        level: ValidationErrorLevel.ERROR,
        timestamp: Date.now(),
      } as ValidationError);
    }

    // 检查重复依赖
    const uniqueDependencies = new Set(dependencies);
    if (uniqueDependencies.size !== dependencies.length) {
      warnings.push({
        message: `Service '${serviceType}' has duplicate dependencies`,
        code: "DUPLICATE_DEPENDENCY",
        fieldName: "dependencies",
        value: serviceType,
        level: ValidationErrorLevel.WARNING,
        timestamp: Date.now(),
      } as ValidationError);
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
      merge: (other: ValidationResult): ValidationResult => {
        const mergedErrors = [...errors, ...other.errors];
        const mergedWarnings = [...warnings, ...other.warnings];
        const mergedInfo = [...[], ...other.info];
        const current = {
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
            return allErrors
              .filter((e) => e.level === level)
              .map((e) => e.message);
          },
          getErrorsForField: (fieldName: string) => {
            return errors.filter((e) => e.fieldName === fieldName);
          },
          getErrorsForRule: (ruleName: string) => {
            return errors.filter((e) => e.ruleName === ruleName);
          },
          merge: (other: ValidationResult) => current.merge(other),
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
            })),
            warnings: warnings.map((w) => ({
              message: w.message,
              code: w.code,
              fieldName: w.fieldName,
              ruleName: w.ruleName,
              level: w.level,
            })),
            info: [],
          }),
          toString: () =>
            `ValidationResult: ${errors.length} errors, ${warnings.length} warnings`,
        };
        return {
          isValid: mergedErrors.length === 0,
          errors: mergedErrors,
          warnings: mergedWarnings,
          info: mergedInfo,
          executionTime: Math.max(
            current.executionTime,
            other.executionTime || 0,
          ),
          rulesExecuted: current.rulesExecuted + (other.rulesExecuted || 0),
          fieldsValidated:
            current.fieldsValidated + (other.fieldsValidated || 0),
          hasErrors: () => mergedErrors.length > 0,
          hasWarnings: () => mergedWarnings.length > 0,
          hasInfo: () => mergedInfo.length > 0,
          getAllMessages: () =>
            [...mergedErrors, ...mergedWarnings, ...mergedInfo].map(
              (e) => e.message,
            ),
          getMessagesByLevel: (level: ValidationErrorLevel) => {
            const all = [...mergedErrors, ...mergedWarnings, ...mergedInfo];
            return all.filter((e) => e.level === level).map((e) => e.message);
          },
          getErrorsForField: (fieldName: string) => {
            return mergedErrors.filter((e) => e.fieldName === fieldName);
          },
          getErrorsForRule: (ruleName: string) => {
            return mergedErrors.filter((e) => e.ruleName === ruleName);
          },
          merge: (otherResult: ValidationResult) =>
            current.merge(other).merge(otherResult),
          toJSON: () => ({
            isValid: mergedErrors.length === 0,
            errorCount: mergedErrors.length,
            warningCount: mergedWarnings.length,
            infoCount: mergedInfo.length,
            executionTime: Math.max(
              current.executionTime,
              other.executionTime || 0,
            ),
            rulesExecuted: current.rulesExecuted + (other.rulesExecuted || 0),
            fieldsValidated:
              current.fieldsValidated + (other.fieldsValidated || 0),
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

    for (const serviceType of this.serviceTypes) {
      if (!visited.has(serviceType)) {
        dfs(serviceType, []);
      }
    }

    return cycles;
  }

  /**
   * 检测未使用的服务
   * @returns 未使用的服务列表
   */
  private detectUnusedServices(): string[] {
    const usedServices = new Set<string>();

    for (const dependencies of this.dependencyGraph.values()) {
      for (const dependency of dependencies) {
        usedServices.add(dependency);
      }
    }

    return Array.from(this.serviceTypes).filter(
      (serviceType) => !usedServices.has(serviceType),
    );
  }

  /**
   * 检测孤立服务
   * @returns 孤立服务列表
   */
  private detectOrphanedServices(): string[] {
    const orphanedServices: string[] = [];

    for (const serviceType of this.serviceTypes) {
      const dependencies = this.dependencyGraph.get(serviceType) || [];
      const isDependedUpon = Array.from(this.dependencyGraph.values()).some(
        (deps) => deps.includes(serviceType),
      );

      if (dependencies.length === 0 && !isDependedUpon) {
        orphanedServices.push(serviceType);
      }
    }

    return orphanedServices;
  }

  /**
   * 获取依赖图
   * @returns 依赖图信息
   */
  getDependencyGraph(): DependencyGraphInfo {
    const nodes = Array.from(this.serviceTypes).map((serviceType) => ({
      name: serviceType,
      dependencies: this.dependencyGraph.get(serviceType) || [],
      isRoot: this.isRootNode(serviceType),
      isLeaf: this.isLeafNode(serviceType),
    }));

    const edges: DependencyEdge[] = [];
    for (const [serviceType, dependencies] of this.dependencyGraph) {
      for (const dependency of dependencies) {
        edges.push({
          from: serviceType,
          to: dependency,
          type: "direct" as const,
          required: true,
          metadata: {},
        });
      }
    }

    return {
      nodes,
      edges,
      cycles: this.detectCycles(),
      roots: nodes.filter((node) => node.isRoot).map((node) => node.name),
      leaves: nodes.filter((node) => node.isLeaf).map((node) => node.name),
      totalNodes: nodes.length,
      totalEdges: edges.length,
    };
  }

  /**
   * 检查是否为根节点
   * @param serviceType 服务类型
   * @returns 是否为根节点
   */
  private isRootNode(serviceType: string): boolean {
    return Array.from(this.dependencyGraph.values()).every(
      (deps) => !deps.includes(serviceType),
    );
  }

  /**
   * 检查是否为叶子节点
   * @param serviceType 服务类型
   * @returns 是否为叶子节点
   */
  private isLeafNode(serviceType: string): boolean {
    const dependencies = this.dependencyGraph.get(serviceType) || [];
    return dependencies.length === 0;
  }

  /**
   * 清空验证器
   */
  clear(): void {
    this.dependencyGraph.clear();
    this.serviceTypes.clear();
  }
}

/**
 * 依赖图信息接口
 * @description 描述依赖图的完整信息
 */
export interface DependencyGraphInfo {
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
  /** 总节点数 */
  totalNodes: number;
  /** 总边数 */
  totalEdges: number;
}

/**
 * 依赖节点接口
 * @description 描述依赖图中的节点
 */
export interface DependencyNode {
  /** 节点名称 */
  name: string;
  /** 依赖列表 */
  dependencies: string[];
  /** 是否为根节点 */
  isRoot: boolean;
  /** 是否为叶子节点 */
  isLeaf: boolean;
}

/**
 * 依赖边接口
 * @description 描述依赖图中的边
 */
export interface DependencyEdge {
  /** 源节点 */
  from: string;
  /** 目标节点 */
  to: string;
  /** 边类型 */
  type: "direct" | "indirect" | "optional" | "circular";
  /** 是否必需 */
  required: boolean;
  /** 边元数据 */
  metadata: Record<string, unknown>;
}
