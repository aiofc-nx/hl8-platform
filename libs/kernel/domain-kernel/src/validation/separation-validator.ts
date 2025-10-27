/**
 * @fileoverview 实体分离验证器
 * @description 验证实体和聚合根分离原则的遵守情况
 */

import { Entity } from "../entities/base/entity.base.js";
import { InternalEntity } from "../entities/internal/internal-entity.base.js";
import { AggregateRoot } from "../aggregates/base/aggregate-root.base.js";
import { EntityId } from "../identifiers/entity-id.js";

/**
 * 分离验证结果
 * @description 表示分离原则验证的结果
 */
export interface SeparationValidationResult {
  /** 是否通过验证 */
  isValid: boolean;
  /** 验证错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
  /** 验证时间戳 */
  timestamp: Date;
}

/**
 * 实体分离验证器
 * @description 验证实体和聚合根分离原则的遵守情况
 */
export class SeparationValidator {
  private static readonly VALIDATION_RULES = {
    /** 聚合根不能直接执行业务逻辑 */
    AGGREGATE_ROOT_NO_DIRECT_BUSINESS_LOGIC: "聚合根不能直接执行业务逻辑",
    /** 内部实体只能通过聚合根访问 */
    INTERNAL_ENTITY_ACCESS_THROUGH_AGGREGATE: "内部实体只能通过聚合根访问",
    /** 实体不能直接操作其他实体的内部状态 */
    NO_DIRECT_ENTITY_STATE_MANIPULATION: "实体不能直接操作其他实体的内部状态",
    /** 聚合根必须协调所有业务操作 */
    AGGREGATE_ROOT_MUST_COORDINATE: "聚合根必须协调所有业务操作",
  };

  /**
   * 验证聚合根的分离原则
   * @param aggregateRoot 聚合根实例
   * @returns 验证结果
   */
  public static validateAggregateRoot(
    aggregateRoot: AggregateRoot,
  ): SeparationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 验证聚合根不能直接执行业务逻辑
      this.validateNoDirectBusinessLogic(aggregateRoot, errors);

      // 验证聚合根必须协调业务操作
      this.validateCoordinationRequirement(aggregateRoot, errors);

      // 验证内部实体访问控制
      this.validateInternalEntityAccess(aggregateRoot, errors);
    } catch (error) {
      errors.push(
        `验证过程中发生错误: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date(),
    };
  }

  /**
   * 验证内部实体的分离原则
   * @param internalEntity 内部实体实例
   * @param aggregateRootId 所属聚合根ID
   * @returns 验证结果
   */
  public static validateInternalEntity(
    internalEntity: InternalEntity,
    aggregateRootId: EntityId,
  ): SeparationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 验证内部实体属于指定的聚合根
      this.validateEntityOwnership(internalEntity, aggregateRootId, errors);

      // 验证内部实体不能直接操作其他实体
      this.validateNoCrossEntityManipulation(internalEntity, errors);
    } catch (error) {
      errors.push(
        `验证过程中发生错误: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date(),
    };
  }

  /**
   * 验证实体集合的分离原则
   * @param entities 实体集合
   * @param aggregateRoots 聚合根集合
   * @returns 验证结果
   */
  public static validateEntityCollection(
    entities: Entity[],
    aggregateRoots: AggregateRoot[],
  ): SeparationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 验证所有实体都有对应的聚合根
      this.validateEntityAggregateMapping(entities, aggregateRoots, errors);

      // 验证实体间没有直接引用
      this.validateNoDirectEntityReferences(entities, errors);
    } catch (error) {
      errors.push(
        `验证过程中发生错误: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date(),
    };
  }

  /**
   * 验证聚合根不能直接执行业务逻辑
   * @param aggregateRoot 聚合根实例
   * @param errors 错误列表
   */
  private static validateNoDirectBusinessLogic(
    aggregateRoot: AggregateRoot,
    errors: string[],
  ): void {
    // 检查聚合根是否有直接执行业务逻辑的方法
    const hasDirectBusinessLogic =
      this.hasDirectBusinessLogicMethods(aggregateRoot);

    if (hasDirectBusinessLogic) {
      errors.push(
        this.VALIDATION_RULES.AGGREGATE_ROOT_NO_DIRECT_BUSINESS_LOGIC,
      );
    }
  }

  /**
   * 验证聚合根必须协调业务操作
   * @param aggregateRoot 聚合根实例
   * @param errors 错误列表
   */
  private static validateCoordinationRequirement(
    aggregateRoot: AggregateRoot,
    errors: string[],
  ): void {
    // 检查聚合根是否有协调方法
    const hasCoordinationMethod =
      typeof aggregateRoot.coordinateBusinessOperation === "function";

    if (!hasCoordinationMethod) {
      errors.push(this.VALIDATION_RULES.AGGREGATE_ROOT_MUST_COORDINATE);
    }
  }

  /**
   * 验证内部实体访问控制
   * @param aggregateRoot 聚合根实例
   * @param errors 错误列表
   */
  private static validateInternalEntityAccess(
    aggregateRoot: AggregateRoot,
    errors: string[],
  ): void {
    // 检查内部实体是否只能通过聚合根访问
    const internalEntities = aggregateRoot.internalEntities;

    for (const entity of internalEntities.values()) {
      if (!entity.belongsTo(aggregateRoot.id)) {
        errors.push(
          this.VALIDATION_RULES.INTERNAL_ENTITY_ACCESS_THROUGH_AGGREGATE,
        );
        break;
      }
    }
  }

  /**
   * 验证实体所有权
   * @param internalEntity 内部实体实例
   * @param aggregateRootId 聚合根ID
   * @param errors 错误列表
   */
  private static validateEntityOwnership(
    internalEntity: InternalEntity,
    aggregateRootId: EntityId,
    errors: string[],
  ): void {
    if (!internalEntity.belongsTo(aggregateRootId)) {
      errors.push(`内部实体不属于指定的聚合根: ${aggregateRootId.value}`);
    }
  }

  /**
   * 验证没有跨实体操作
   * @param _internalEntity 内部实体实例（占位符参数，待实现）
   * @param _errors 错误列表（占位符参数，待实现）
   * @description 当前为占位符实现，未来将添加更复杂的验证逻辑
   */
  private static validateNoCrossEntityManipulation(
    _internalEntity: InternalEntity,
    _errors: string[],
  ): void {
    // 这里可以添加更复杂的验证逻辑
    // 例如检查实体是否直接引用了其他实体
    // 目前这是一个占位符实现
  }

  /**
   * 验证实体聚合根映射
   * @param entities 实体集合
   * @param aggregateRoots 聚合根集合
   * @param errors 错误列表
   */
  private static validateEntityAggregateMapping(
    entities: Entity[],
    aggregateRoots: AggregateRoot[],
    errors: string[],
  ): void {
    const aggregateRootIds = new Set(aggregateRoots.map((ar) => ar.id.value));

    for (const entity of entities) {
      if (entity instanceof InternalEntity) {
        if (!aggregateRootIds.has(entity.aggregateRootId.value)) {
          errors.push(`内部实体没有对应的聚合根: ${entity.id.value}`);
        }
      }
    }
  }

  /**
   * 验证没有直接实体引用
   * @param _entities 实体集合（占位符参数，待实现）
   * @param _errors 错误列表（占位符参数，待实现）
   * @description 当前为占位符实现，未来将添加更复杂的验证逻辑
   */
  private static validateNoDirectEntityReferences(
    _entities: Entity[],
    _errors: string[],
  ): void {
    // 这里可以添加更复杂的验证逻辑
    // 例如检查实体之间是否有直接引用
    // 目前这是一个占位符实现
  }

  /**
   * 检查是否有直接执行业务逻辑的方法
   * @param aggregateRoot 聚合根实例
   * @returns 是否有直接执行业务逻辑的方法
   */
  private static hasDirectBusinessLogicMethods(
    aggregateRoot: AggregateRoot,
  ): boolean {
    // 检查聚合根是否有不应该存在的直接业务逻辑方法
    const prototype = Object.getPrototypeOf(aggregateRoot);
    const methods = Object.getOwnPropertyNames(prototype);

    // 检查是否有直接执行业务逻辑的方法（不是协调方法）
    const directBusinessLogicMethods = methods.filter((method) => {
      if (
        method === "constructor" ||
        method === "coordinateBusinessOperation"
      ) {
        return false;
      }

      const descriptor = Object.getOwnPropertyDescriptor(prototype, method);
      if (!descriptor || typeof descriptor.value !== "function") {
        return false;
      }

      // 检查方法名是否暗示直接业务逻辑
      const methodName = method.toLowerCase();
      const businessLogicIndicators = [
        "update",
        "create",
        "delete",
        "modify",
        "change",
        "process",
        "calculate",
        "compute",
        "validate",
        "check",
        "execute",
      ];

      return businessLogicIndicators.some(
        (indicator) =>
          methodName.includes(indicator) && !methodName.includes("coordinate"),
      );
    });

    return directBusinessLogicMethods.length > 0;
  }

  /**
   * 获取验证规则
   * @returns 验证规则映射
   */
  public static getValidationRules(): Record<string, string> {
    return { ...this.VALIDATION_RULES };
  }

  /**
   * 创建验证报告
   * @param results 验证结果列表
   * @returns 验证报告
   */
  public static createValidationReport(results: SeparationValidationResult[]): {
    totalValidations: number;
    passedValidations: number;
    failedValidations: number;
    allErrors: string[];
    allWarnings: string[];
    overallStatus: "PASS" | "FAIL";
  } {
    const totalValidations = results.length;
    const passedValidations = results.filter((r) => r.isValid).length;
    const failedValidations = totalValidations - passedValidations;

    const allErrors = results.flatMap((r) => r.errors);
    const allWarnings = results.flatMap((r) => r.warnings);

    return {
      totalValidations,
      passedValidations,
      failedValidations,
      allErrors,
      allWarnings,
      overallStatus: failedValidations === 0 ? "PASS" : "FAIL",
    };
  }

  /**
   * 增强分离验证器，添加编译时检查
   * @param aggregateRoot 聚合根实例
   * @returns 验证结果
   */
  public static enhanceWithCompileTimeChecks(
    aggregateRoot: AggregateRoot,
  ): SeparationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 检查聚合根是否有直接执行业务逻辑的方法
      const hasDirectBusinessLogic =
        this.hasDirectBusinessLogicMethods(aggregateRoot);

      if (hasDirectBusinessLogic) {
        errors.push(
          this.VALIDATION_RULES.AGGREGATE_ROOT_NO_DIRECT_BUSINESS_LOGIC,
        );
      }

      // 检查聚合根是否有协调方法
      const hasCoordinationMethod =
        typeof aggregateRoot.coordinateBusinessOperation === "function";

      if (!hasCoordinationMethod) {
        errors.push(this.VALIDATION_RULES.AGGREGATE_ROOT_MUST_COORDINATE);
      }

      // 检查聚合根是否实现了必要的抽象方法
      this.validateAbstractMethodImplementation(aggregateRoot, errors);
    } catch (error) {
      errors.push(
        `验证过程中发生错误: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date(),
    };
  }

  /**
   * 添加运行时验证
   * @param aggregateRoot 聚合根实例
   * @param operation 操作名称
   * @param params 操作参数
   * @returns 验证结果
   */
  public static addRuntimeValidation(
    aggregateRoot: AggregateRoot,
    operation: string,
    params: unknown,
  ): SeparationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 验证操作是否通过协调方法执行
      this.validateOperationThroughCoordination(
        aggregateRoot,
        operation,
        params,
        errors,
      );

      // 验证内部实体访问控制
      this.validateInternalEntityAccessControl(aggregateRoot, errors);

      // 验证业务不变量
      this.validateBusinessInvariants(aggregateRoot, errors);
    } catch (error) {
      errors.push(
        `运行时验证过程中发生错误: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date(),
    };
  }

  /**
   * 验证抽象方法实现
   * @param aggregateRoot 聚合根实例
   * @param errors 错误列表
   */
  private static validateAbstractMethodImplementation(
    aggregateRoot: AggregateRoot,
    errors: string[],
  ): void {
    // 检查是否实现了必要的抽象方法
    // 使用类型守卫检查抽象方法实现，避免使用 any
    const hasPerformCoordination = SeparationValidator.hasMethod(
      aggregateRoot,
      "performCoordination",
    );
    if (!hasPerformCoordination) {
      errors.push("聚合根必须实现 performCoordination 方法");
    }

    const hasPerformBusinessInvariantValidation = SeparationValidator.hasMethod(
      aggregateRoot,
      "performBusinessInvariantValidation",
    );
    if (!hasPerformBusinessInvariantValidation) {
      errors.push("聚合根必须实现 performBusinessInvariantValidation 方法");
    }

    if (typeof aggregateRoot.clone !== "function") {
      errors.push("聚合根必须实现 clone 方法");
    }
  }

  /**
   * 检查对象是否具有指定的方法
   * @description 安全地检查对象原型链上是否存在指定方法
   * @param obj 要检查的对象
   * @param methodName 方法名称
   * @returns 是否存在该方法
   */
  private static hasMethod(obj: unknown, methodName: string): boolean {
    if (obj === null || obj === undefined) {
      return false;
    }

    const prototype = Object.getPrototypeOf(obj);
    if (!prototype) {
      return false;
    }

    const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
    return descriptor !== undefined && typeof descriptor.value === "function";
  }

  /**
   * 验证操作通过协调执行
   * @param _aggregateRoot 聚合根实例（占位符参数，待实现）
   * @param _operation 操作名称（占位符参数，待实现）
   * @param _params 操作参数（占位符参数，待实现）
   * @param _errors 错误列表（占位符参数，待实现）
   * @description 当前为占位符实现，未来将添加更复杂的验证逻辑
   */
  private static validateOperationThroughCoordination(
    _aggregateRoot: AggregateRoot,
    _operation: string,
    _params: unknown,
    _errors: string[],
  ): void {
    // 检查操作是否通过协调方法执行
    // 这里可以添加更复杂的验证逻辑
    // 目前这是一个占位符实现
  }

  /**
   * 验证内部实体访问控制
   * @param aggregateRoot 聚合根实例
   * @param errors 错误列表
   */
  private static validateInternalEntityAccessControl(
    aggregateRoot: AggregateRoot,
    errors: string[],
  ): void {
    // 检查内部实体是否只能通过聚合根访问
    const internalEntities = aggregateRoot.internalEntities;

    for (const entity of internalEntities.values()) {
      if (!entity.belongsTo(aggregateRoot.id)) {
        errors.push(
          this.VALIDATION_RULES.INTERNAL_ENTITY_ACCESS_THROUGH_AGGREGATE,
        );
        break;
      }
    }
  }

  /**
   * 验证业务不变量
   * @param aggregateRoot 聚合根实例
   * @param errors 错误列表
   */
  private static validateBusinessInvariants(
    aggregateRoot: AggregateRoot,
    errors: string[],
  ): void {
    try {
      const isValid = aggregateRoot.validateBusinessInvariants();
      if (!isValid) {
        errors.push("业务不变量验证失败");
      }
    } catch (error) {
      errors.push(
        `业务不变量验证过程中发生错误: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
