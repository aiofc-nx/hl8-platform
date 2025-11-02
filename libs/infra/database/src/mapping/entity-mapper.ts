/**
 * 实体映射适配器
 *
 * @description 提供跨数据库类型的实体映射和转换功能
 *
 * @since 1.0.0
 */

import { Injectable } from "@nestjs/common";
import { Logger } from "@hl8/logger";

/**
 * 实体映射配置
 */
export interface EntityMappingConfig {
  /** 源数据库类型 */
  sourceType: "postgresql" | "mongodb";
  /** 目标数据库类型 */
  targetType: "postgresql" | "mongodb";
  /** 映射规则 */
  mappingRules: EntityMappingRule[];
  /** 是否启用自动映射 */
  autoMapping: boolean;
  /** 是否保留原始数据 */
  preserveOriginal: boolean;
}

/**
 * 实体映射规则
 */
export interface EntityMappingRule {
  /** 源字段名 */
  sourceField: string;
  /** 目标字段名 */
  targetField: string;
  /** 字段类型 */
  fieldType: "string" | "number" | "boolean" | "date" | "object" | "array";
  /** 转换函数 */
  transform?: (value: any) => any;
  /** 是否必需 */
  required: boolean;
  /** 默认值 */
  defaultValue?: any;
}

/**
 * 实体映射结果
 */
export interface EntityMappingResult {
  /** 映射是否成功 */
  success: boolean;
  /** 映射后的实体 */
  mappedEntity: any;
  /** 映射统计 */
  statistics: {
    totalFields: number;
    mappedFields: number;
    skippedFields: number;
    errorFields: number;
  };
  /** 错误信息 */
  errors: string[];
  /** 警告信息 */
  warnings: string[];
}

/**
 * 实体映射适配器
 *
 * @description 提供跨数据库类型的实体映射和转换功能
 */
@Injectable()
export class EntityMapper {
  constructor(private readonly logger: Logger) {}

  /**
   * 映射实体
   *
   * @description 将实体从一个数据库类型映射到另一个数据库类型
   *
   * @param entity 源实体
   * @param config 映射配置
   * @returns 映射结果
   */
  mapEntity(entity: any, config: EntityMappingConfig): EntityMappingResult {
    const startTime = Date.now();

    // Handle null or undefined entities
    if (!entity) {
      return {
        success: false,
        mappedEntity: {},
        statistics: {
          totalFields: 0,
          mappedFields: 0,
          skippedFields: 0,
          errorFields: 1,
        },
        errors: ["Entity is null or undefined"],
        warnings: [],
      };
    }

    this.logger.log("开始实体映射", {
      sourceType: config.sourceType,
      targetType: config.targetType,
      entityKeys: Object.keys(entity),
    });

    const result: EntityMappingResult = {
      success: false,
      mappedEntity: {},
      statistics: {
        totalFields: 0,
        mappedFields: 0,
        skippedFields: 0,
        errorFields: 0,
      },
      errors: [],
      warnings: [],
    };

    try {
      // 统计总字段数
      result.statistics.totalFields = Object.keys(entity).length;

      // 应用映射规则
      for (const rule of config.mappingRules) {
        try {
          const sourceValue = entity[rule.sourceField];

          if (sourceValue === undefined && rule.required) {
            if (rule.defaultValue !== undefined) {
              result.mappedEntity[rule.targetField] = rule.defaultValue;
              result.statistics.mappedFields++;
              result.warnings.push(`字段 ${rule.sourceField} 缺失，使用默认值`);
            } else {
              result.errors.push(`必需字段 ${rule.sourceField} 缺失`);
              result.statistics.errorFields++;
              continue;
            }
          } else if (sourceValue !== undefined) {
            // 应用转换函数
            const transformedValue = rule.transform
              ? rule.transform(sourceValue)
              : this.defaultTransform(sourceValue, rule.fieldType);

            result.mappedEntity[rule.targetField] = transformedValue;
            result.statistics.mappedFields++;
          } else {
            result.statistics.skippedFields++;
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "未知错误";
          result.errors.push(
            `字段 ${rule.sourceField} 映射失败: ${errorMessage}`,
          );
          result.statistics.errorFields++;
        }
      }

      // 自动映射未配置的字段
      if (config.autoMapping) {
        this.autoMapFields(entity, result, config);
      }

      result.success = result.errors.length === 0;

      const duration = Date.now() - startTime;
      this.logger.log("实体映射完成", {
        success: result.success,
        duration,
        statistics: result.statistics,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      result.errors.push(`实体映射失败: ${errorMessage}`);
      this.logger.error(error as Error);
      return result;
    }
  }

  /**
   * 批量映射实体
   *
   * @description 批量映射多个实体
   *
   * @param entities 实体数组
   * @param config 映射配置
   * @returns 映射结果数组
   */
  mapEntities(
    entities: any[],
    config: EntityMappingConfig,
  ): EntityMappingResult[] {
    this.logger.log("开始批量实体映射", {
      count: entities.length,
      sourceType: config.sourceType,
      targetType: config.targetType,
    });

    return entities.map((entity, _index) => {
      try {
        return this.mapEntity(entity, config);
      } catch (error) {
        this.logger.error(error as Error);
        return {
          success: false,
          mappedEntity: {},
          statistics: {
            totalFields: 0,
            mappedFields: 0,
            skippedFields: 0,
            errorFields: 1,
          },
          errors: [
            `批量映射失败: ${
              error instanceof Error ? error.message : "未知错误"
            }`,
          ],
          warnings: [],
        };
      }
    });
  }

  /**
   * 创建 PostgreSQL 到 MongoDB 映射配置
   *
   * @description 创建从 PostgreSQL 到 MongoDB 的映射配置
   *
   * @param entitySchema 实体模式
   * @returns 映射配置
   */
  createPostgreSQLToMongoDBConfig(entitySchema: any): EntityMappingConfig {
    const mappingRules: EntityMappingRule[] = [];

    // 处理主键
    if (entitySchema.id) {
      mappingRules.push({
        sourceField: "id",
        targetField: "_id",
        fieldType: "string",
        required: true,
        transform: (value) => value.toString(),
      });
    }

    // 处理时间字段
    if (entitySchema.createdAt) {
      mappingRules.push({
        sourceField: "createdAt",
        targetField: "createdAt",
        fieldType: "date",
        required: false,
        transform: (value) => new Date(value),
      });
    }

    if (entitySchema.updatedAt) {
      mappingRules.push({
        sourceField: "updatedAt",
        targetField: "updatedAt",
        fieldType: "date",
        required: false,
        transform: (value) => new Date(value),
      });
    }

    // 处理其他字段
    Object.keys(entitySchema).forEach((field) => {
      if (!["id", "createdAt", "updatedAt"].includes(field)) {
        mappingRules.push({
          sourceField: field,
          targetField: field,
          fieldType: this.inferFieldType(entitySchema[field]) as
            | "string"
            | "number"
            | "boolean"
            | "date"
            | "object"
            | "array",
          required: false,
        });
      }
    });

    return {
      sourceType: "postgresql",
      targetType: "mongodb",
      mappingRules,
      autoMapping: true,
      preserveOriginal: true,
    };
  }

  /**
   * 创建 MongoDB 到 PostgreSQL 映射配置
   *
   * @description 创建从 MongoDB 到 PostgreSQL 的映射配置
   *
   * @param entitySchema 实体模式
   * @returns 映射配置
   */
  createMongoDBToPostgreSQLConfig(entitySchema: any): EntityMappingConfig {
    const mappingRules: EntityMappingRule[] = [];

    // 处理主键
    if (entitySchema._id) {
      mappingRules.push({
        sourceField: "_id",
        targetField: "id",
        fieldType: "string",
        required: true,
        transform: (value) => value.toString(),
      });
    }

    // 处理时间字段
    if (entitySchema.createdAt) {
      mappingRules.push({
        sourceField: "createdAt",
        targetField: "createdAt",
        fieldType: "date",
        required: false,
        transform: (value) => new Date(value),
      });
    }

    if (entitySchema.updatedAt) {
      mappingRules.push({
        sourceField: "updatedAt",
        targetField: "updatedAt",
        fieldType: "date",
        required: false,
        transform: (value) => new Date(value),
      });
    }

    // 处理其他字段
    Object.keys(entitySchema).forEach((field) => {
      if (!["_id", "createdAt", "updatedAt"].includes(field)) {
        mappingRules.push({
          sourceField: field,
          targetField: field,
          fieldType: this.inferFieldType(entitySchema[field]) as
            | "string"
            | "number"
            | "boolean"
            | "date"
            | "object"
            | "array",
          required: false,
        });
      }
    });

    return {
      sourceType: "mongodb",
      targetType: "postgresql",
      mappingRules,
      autoMapping: true,
      preserveOriginal: true,
    };
  }

  /**
   * 验证映射配置
   *
   * @description 验证映射配置的有效性
   *
   * @param config 映射配置
   * @returns 验证结果
   */
  validateMappingConfig(config: EntityMappingConfig): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证数据库类型
    if (!["postgresql", "mongodb"].includes(config.sourceType)) {
      errors.push("无效的源数据库类型");
    }

    if (!["postgresql", "mongodb"].includes(config.targetType)) {
      errors.push("无效的目标数据库类型");
    }

    // 验证映射规则
    if (!config.mappingRules || config.mappingRules.length === 0) {
      errors.push("映射规则不能为空");
    }

    // 验证字段类型
    config.mappingRules?.forEach((rule, index) => {
      if (
        !["string", "number", "boolean", "date", "object", "array"].includes(
          rule.fieldType,
        )
      ) {
        errors.push(`规则 ${index}: 无效的字段类型 ${rule.fieldType}`);
      }

      if (!rule.sourceField || !rule.targetField) {
        errors.push(`规则 ${index}: 源字段和目标字段不能为空`);
      }
    });

    // 检查重复的目标字段
    const targetFields =
      config.mappingRules?.map((rule) => rule.targetField) || [];
    const duplicateFields = targetFields.filter(
      (field, index) => targetFields.indexOf(field) !== index,
    );

    if (duplicateFields.length > 0) {
      errors.push(`重复的目标字段: ${duplicateFields.join(", ")}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 获取映射统计
   *
   * @description 获取映射操作的统计信息
   *
   * @param results 映射结果数组
   * @returns 统计信息
   */
  getMappingStatistics(results: EntityMappingResult[]): {
    totalEntities: number;
    successfulMappings: number;
    failedMappings: number;
    averageFieldsMapped: number;
    totalErrors: number;
    totalWarnings: number;
  } {
    const totalEntities = results.length;
    const successfulMappings = results.filter((r) => r.success).length;
    const failedMappings = totalEntities - successfulMappings;

    const totalFieldsMapped = results.reduce(
      (sum, r) => sum + r.statistics.mappedFields,
      0,
    );
    const averageFieldsMapped =
      totalEntities > 0 ? totalFieldsMapped / totalEntities : 0;

    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce(
      (sum, r) => sum + r.warnings.length,
      0,
    );

    return {
      totalEntities,
      successfulMappings,
      failedMappings,
      averageFieldsMapped: Math.round(averageFieldsMapped * 100) / 100,
      totalErrors,
      totalWarnings,
    };
  }

  /**
   * 自动映射字段
   *
   * @private
   */
  private autoMapFields(
    entity: any,
    result: EntityMappingResult,
    config: EntityMappingConfig,
  ): void {
    const mappedFields = new Set(Object.keys(result.mappedEntity));
    const configuredFields = new Set(
      config.mappingRules.map((rule) => rule.sourceField),
    );

    Object.keys(entity).forEach((field) => {
      if (!mappedFields.has(field) && !configuredFields.has(field)) {
        // 自动映射未配置的字段
        const targetField = this.generateTargetFieldName(field, config);
        const fieldType = this.inferFieldType(entity[field]);

        result.mappedEntity[targetField] = this.defaultTransform(
          entity[field],
          fieldType,
        );
        result.statistics.mappedFields++;
        result.warnings.push(`字段 ${field} 自动映射为 ${targetField}`);
      }
    });
  }

  /**
   * 默认转换函数
   *
   * @private
   */
  private defaultTransform(value: any, fieldType: string): any {
    switch (fieldType) {
      case "string":
        return value?.toString() || "";
      case "number":
        return Number(value) || 0;
      case "boolean":
        return Boolean(value);
      case "date":
        return new Date(value);
      case "object":
        return typeof value === "object" ? value : {};
      case "array":
        return Array.isArray(value) ? value : [];
      default:
        return value;
    }
  }

  /**
   * 推断字段类型
   *
   * @private
   */
  private inferFieldType(value: any): string {
    if (value === null || value === undefined) {
      return "string";
    }

    if (Array.isArray(value)) {
      return "array";
    }

    if (value instanceof Date) {
      return "date";
    }

    if (typeof value === "object") {
      return "object";
    }

    if (typeof value === "boolean") {
      return "boolean";
    }

    if (typeof value === "number") {
      return "number";
    }

    return "string";
  }

  /**
   * 生成目标字段名
   *
   * @private
   */
  private generateTargetFieldName(
    sourceField: string,
    config: EntityMappingConfig,
  ): string {
    // 简单的字段名转换逻辑
    if (config.sourceType === "postgresql" && config.targetType === "mongodb") {
      // PostgreSQL 到 MongoDB 的字段名转换
      return sourceField.toLowerCase();
    } else if (
      config.sourceType === "mongodb" &&
      config.targetType === "postgresql"
    ) {
      // MongoDB 到 PostgreSQL 的字段名转换
      return sourceField.toLowerCase();
    }

    return sourceField;
  }
}
