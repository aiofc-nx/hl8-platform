/**
 * @fileoverview 业务规则违反实现
 * @description 提供业务规则违反的具体实现和功能
 */

import type {
  BusinessRuleViolation as IBusinessRuleViolation,
  BusinessRuleViolationJSON,
  BusinessRuleViolationData,
  BusinessRuleViolationPosition,
} from "./business-rule-violation.interface.js";
import { BusinessRuleSeverity } from "./business-rule.interface.js";
import { BusinessRuleViolationException } from "../exceptions/business-rule-exceptions.js";

/**
 * 业务规则违反实现类
 * @description 提供业务规则违反的完整实现
 */
export class BusinessRuleViolation implements IBusinessRuleViolation {
  /**
   * 违反消息
   */
  public readonly message: string;

  /**
   * 违反代码
   */
  public readonly code: string;

  /**
   * 规则名称
   */
  public readonly ruleName: string;

  /**
   * 规则类型
   */
  public readonly ruleType?: string;

  /**
   * 严重程度
   */
  public readonly severity: BusinessRuleSeverity;

  /**
   * 详细信息
   */
  public readonly details?: Record<string, unknown>;

  /**
   * 时间戳
   */
  public readonly timestamp: Date;

  /**
   * 属性路径
   */
  public readonly path?: string[];

  /**
   * 违反的值
   */
  public readonly value?: unknown;

  /**
   * 位置信息
   */
  public readonly position?: BusinessRuleViolationPosition;

  /**
   * 实体类型
   */
  public readonly entityType?: string;

  /**
   * 实体ID
   */
  public readonly entityId?: string;

  /**
   * 操作类型
   */
  public readonly operationType?: string;

  /**
   * 创建业务规则违反
   * @param options 违反选项
   */
  constructor(options: BusinessRuleViolationData) {
    this.message = options.message;
    this.code = options.code;
    this.ruleName = options.ruleName;
    this.ruleType = options.ruleType;
    this.severity = options.severity ?? BusinessRuleSeverity.ERROR;
    this.details = options.details;
    this.timestamp = options.timestamp ?? new Date();
    this.path = options.path;
    this.value = options.value;
    this.position = options.position;
    this.entityType = options.entityType;
    this.entityId = options.entityId;
    this.operationType = options.operationType;
  }

  /**
   * 检查是否为错误
   * @returns 是否为错误
   */
  public isError(): boolean {
    return this.severity === BusinessRuleSeverity.ERROR;
  }

  /**
   * 检查是否为警告
   * @returns 是否为警告
   */
  public isWarning(): boolean {
    return this.severity === BusinessRuleSeverity.WARNING;
  }

  /**
   * 检查是否为信息
   * @returns 是否为信息
   */
  public isInfo(): boolean {
    return this.severity === BusinessRuleSeverity.INFO;
  }

  /**
   * 检查是否为严重错误
   * @returns 是否为严重错误
   */
  public isCritical(): boolean {
    return this.severity === BusinessRuleSeverity.CRITICAL;
  }

  /**
   * 获取完整路径
   * @returns 完整路径字符串
   */
  public getFullPath(): string {
    if (!this.path || this.path.length === 0) {
      return this.ruleName;
    }
    return [...this.path, this.ruleName].join(".");
  }

  /**
   * 获取格式化的消息
   * @returns 格式化的消息
   */
  public getFormattedMessage(): string {
    const path = this.getFullPath();
    const severity = this.getSeverityDisplayName();
    const timestamp = this.timestamp.toISOString();

    return `[${severity}] ${path}: ${this.message} (${timestamp})`;
  }

  /**
   * 获取严重程度显示名称
   * @returns 严重程度显示名称
   */
  public getSeverityDisplayName(): string {
    switch (this.severity) {
      case BusinessRuleSeverity.INFO:
        return "INFO";
      case BusinessRuleSeverity.WARNING:
        return "WARNING";
      case BusinessRuleSeverity.ERROR:
        return "ERROR";
      case BusinessRuleSeverity.CRITICAL:
        return "CRITICAL";
      default:
        return "UNKNOWN";
    }
  }

  /**
   * 获取严重程度数值
   * @returns 严重程度数值
   */
  public getSeverityValue(): number {
    switch (this.severity) {
      case BusinessRuleSeverity.INFO:
        return 1;
      case BusinessRuleSeverity.WARNING:
        return 2;
      case BusinessRuleSeverity.ERROR:
        return 3;
      case BusinessRuleSeverity.CRITICAL:
        return 4;
      default:
        return 0;
    }
  }

  /**
   * 检查是否比指定严重程度更严重
   * @param severity 要比较的严重程度
   * @returns 是否更严重
   */
  public isMoreSevereThan(severity: BusinessRuleSeverity): boolean {
    return this.getSeverityValue() > this.getSeverityValueForSeverity(severity);
  }

  /**
   * 检查是否比指定严重程度更轻
   * @param severity 要比较的严重程度
   * @returns 是否更轻
   */
  public isLessSevereThan(severity: BusinessRuleSeverity): boolean {
    return this.getSeverityValue() < this.getSeverityValueForSeverity(severity);
  }

  /**
   * 获取指定严重程度的数值
   * @param severity 严重程度
   * @returns 严重程度数值
   */
  private getSeverityValueForSeverity(severity: BusinessRuleSeverity): number {
    switch (severity) {
      case BusinessRuleSeverity.INFO:
        return 1;
      case BusinessRuleSeverity.WARNING:
        return 2;
      case BusinessRuleSeverity.ERROR:
        return 3;
      case BusinessRuleSeverity.CRITICAL:
        return 4;
      default:
        return 0;
    }
  }

  /**
   * 获取详细信息
   * @param key 信息键
   * @returns 信息值
   */
  public getDetail(key: string): unknown {
    return this.details?.[key];
  }

  /**
   * 检查是否有详细信息
   * @param key 信息键
   * @returns 是否有详细信息
   */
  public hasDetail(key: string): boolean {
    return this.details !== undefined && key in this.details;
  }

  /**
   * 获取所有详细信息键
   * @returns 详细信息键数组
   */
  public getDetailKeys(): string[] {
    return this.details ? Object.keys(this.details) : [];
  }

  /**
   * 获取位置信息
   * @returns 位置信息
   */
  public getPosition(): BusinessRuleViolationPosition | undefined {
    return this.position;
  }

  /**
   * 获取行号
   * @returns 行号
   */
  public getLine(): number | undefined {
    return this.position?.line;
  }

  /**
   * 获取列号
   * @returns 列号
   */
  public getColumn(): number | undefined {
    return this.position?.column;
  }

  /**
   * 获取开始位置
   * @returns 开始位置
   */
  public getStart(): number | undefined {
    return this.position?.offset;
  }

  /**
   * 获取结束位置
   * @returns 结束位置
   */
  public getEnd(): number | undefined {
    return this.position?.offset && this.position?.length
      ? this.position.offset + this.position.length
      : undefined;
  }

  /**
   * 获取路径
   * @returns 路径数组
   */
  public getPath(): string[] {
    return this.path ?? [];
  }

  /**
   * 获取路径字符串
   * @returns 路径字符串
   */
  public getPathString(): string {
    return this.path ? this.path.join(".") : "";
  }

  /**
   * 获取值
   * @returns 值
   */
  public getValue(): unknown {
    return this.value;
  }

  /**
   * 获取值类型
   * @returns 值类型
   */
  public getValueType(): string {
    return this.value !== null && this.value !== undefined
      ? typeof this.value
      : "null";
  }

  /**
   * 获取值字符串表示
   * @returns 值字符串表示
   */
  public getValueString(): string {
    if (this.value === null) return "null";
    if (this.value === undefined) return "undefined";
    if (typeof this.value === "string") return `"${this.value}"`;
    if (typeof this.value === "object") return JSON.stringify(this.value);
    return String(this.value);
  }

  /**
   * 转换为JSON格式
   * @returns JSON格式的业务规则违反
   */
  public toJSON(): BusinessRuleViolationJSON {
    return {
      message: this.message,
      code: this.code,
      ruleName: this.ruleName,
      ruleType: this.ruleType,
      severity: this.severity,
      details: this.details,
      timestamp: this.timestamp.getTime(),
      path: this.path,
      value: this.value,
      position: this.position,
      entityType: this.entityType,
      entityId: this.entityId,
      operationType: this.operationType,
    };
  }

  /**
   * 转换为字符串格式
   * @returns 字符串格式的业务规则违反
   */
  public toString(): string {
    return this.message;
  }

  /**
   * 克隆业务规则违反
   * @param overrides 覆盖选项
   * @returns 克隆的业务规则违反
   */
  public clone(
    overrides?: Partial<BusinessRuleViolationData>,
  ): BusinessRuleViolation {
    return new BusinessRuleViolation({
      message: this.message,
      code: this.code,
      ruleName: this.ruleName,
      ruleType: this.ruleType,
      severity: this.severity,
      details: this.details,
      timestamp: this.timestamp,
      path: this.path,
      value: this.value,
      position: this.position,
      entityType: this.entityType,
      entityId: this.entityId,
      operationType: this.operationType,
      ...overrides,
    });
  }

  /**
   * 创建业务规则违反
   * @param options 违反选项
   * @returns 业务规则违反实例
   */
  public static create(
    options: BusinessRuleViolationData,
  ): BusinessRuleViolation {
    return new BusinessRuleViolation(options);
  }

  /**
   * 从JSON创建业务规则违反
   * @param json JSON数据
   * @returns 业务规则违反实例
   */
  public static fromJSON(
    json: BusinessRuleViolationJSON,
  ): BusinessRuleViolation {
    try {
      return new BusinessRuleViolation({
        message: json.message,
        code: json.code,
        ruleName: json.ruleName,
        ruleType: json.ruleType,
        severity: json.severity as BusinessRuleSeverity,
        details: json.details,
        timestamp: new Date(json.timestamp),
        path: json.path,
        value: json.value,
        position: json.position,
        entityType: json.entityType,
        entityId: json.entityId,
        operationType: json.operationType,
      });
    } catch (error) {
      throw new BusinessRuleViolationException(
        "Unknown",
        "Unknown",
        "Unknown",
        `Failed to create BusinessRuleViolation from JSON: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error, json },
      );
    }
  }

  /**
   * 创建错误级别的业务规则违反
   * @param message 消息
   * @param code 代码
   * @param ruleName 规则名称
   * @param options 其他选项
   * @returns 业务规则违反实例
   */
  public static error(
    message: string,
    code: string,
    ruleName: string,
    options?: Partial<BusinessRuleViolationData>,
  ): BusinessRuleViolation {
    return new BusinessRuleViolation({
      message,
      code,
      ruleName,
      severity: BusinessRuleSeverity.ERROR,
      ...options,
    });
  }

  /**
   * 创建警告级别的业务规则违反
   * @param message 消息
   * @param code 代码
   * @param ruleName 规则名称
   * @param options 其他选项
   * @returns 业务规则违反实例
   */
  public static warning(
    message: string,
    code: string,
    ruleName: string,
    options?: Partial<BusinessRuleViolationData>,
  ): BusinessRuleViolation {
    return new BusinessRuleViolation({
      message,
      code,
      ruleName,
      severity: BusinessRuleSeverity.WARNING,
      ...options,
    });
  }

  /**
   * 创建信息级别的业务规则违反
   * @param message 消息
   * @param code 代码
   * @param ruleName 规则名称
   * @param options 其他选项
   * @returns 业务规则违反实例
   */
  public static info(
    message: string,
    code: string,
    ruleName: string,
    options?: Partial<BusinessRuleViolationData>,
  ): BusinessRuleViolation {
    return new BusinessRuleViolation({
      message,
      code,
      ruleName,
      severity: BusinessRuleSeverity.INFO,
      ...options,
    });
  }

  /**
   * 创建严重错误级别的业务规则违反
   * @param message 消息
   * @param code 代码
   * @param ruleName 规则名称
   * @param options 其他选项
   * @returns 业务规则违反实例
   */
  public static critical(
    message: string,
    code: string,
    ruleName: string,
    options?: Partial<BusinessRuleViolationData>,
  ): BusinessRuleViolation {
    return new BusinessRuleViolation({
      message,
      code,
      ruleName,
      severity: BusinessRuleSeverity.CRITICAL,
      ...options,
    });
  }

  /**
   * 创建业务规则违反构建器
   * @returns 业务规则违反构建器实例
   */
  public static builder(): BusinessRuleViolationBuilder {
    return new BusinessRuleViolationBuilder();
  }
}

/**
 * 业务规则违反构建器
 * @description 用于构建业务规则违反的构建器类
 */
export class BusinessRuleViolationBuilder {
  private message: string = "";
  private code: string = "";
  private ruleName: string = "";
  private ruleType?: string;
  private severity: BusinessRuleSeverity = BusinessRuleSeverity.ERROR;
  private details?: Record<string, unknown>;
  private timestamp: Date = new Date();
  private path?: string[];
  private value?: unknown;
  private position?: BusinessRuleViolationPosition;
  private entityType?: string;
  private entityId?: string;
  private operationType?: string;

  /**
   * 设置消息
   * @param message 消息
   * @returns 构建器实例
   */
  public setMessage(message: string): BusinessRuleViolationBuilder {
    this.message = message;
    return this;
  }

  /**
   * 设置代码
   * @param code 代码
   * @returns 构建器实例
   */
  public setCode(code: string): BusinessRuleViolationBuilder {
    this.code = code;
    return this;
  }

  /**
   * 设置规则名称
   * @param ruleName 规则名称
   * @returns 构建器实例
   */
  public setRuleName(ruleName: string): BusinessRuleViolationBuilder {
    this.ruleName = ruleName;
    return this;
  }

  /**
   * 设置规则类型
   * @param ruleType 规则类型
   * @returns 构建器实例
   */
  public setRuleType(ruleType: string): BusinessRuleViolationBuilder {
    this.ruleType = ruleType;
    return this;
  }

  /**
   * 设置严重程度
   * @param severity 严重程度
   * @returns 构建器实例
   */
  public setSeverity(
    severity: BusinessRuleSeverity,
  ): BusinessRuleViolationBuilder {
    this.severity = severity;
    return this;
  }

  /**
   * 设置为错误级别
   * @returns 构建器实例
   */
  public asError(): BusinessRuleViolationBuilder {
    this.severity = BusinessRuleSeverity.ERROR;
    return this;
  }

  /**
   * 设置为警告级别
   * @returns 构建器实例
   */
  public asWarning(): BusinessRuleViolationBuilder {
    this.severity = BusinessRuleSeverity.WARNING;
    return this;
  }

  /**
   * 设置为信息级别
   * @returns 构建器实例
   */
  public asInfo(): BusinessRuleViolationBuilder {
    this.severity = BusinessRuleSeverity.INFO;
    return this;
  }

  /**
   * 设置为严重错误级别
   * @returns 构建器实例
   */
  public asCritical(): BusinessRuleViolationBuilder {
    this.severity = BusinessRuleSeverity.CRITICAL;
    return this;
  }

  /**
   * 设置详细信息
   * @param details 详细信息
   * @returns 构建器实例
   */
  public setDetails(
    details: Record<string, unknown>,
  ): BusinessRuleViolationBuilder {
    this.details = details;
    return this;
  }

  /**
   * 添加详细信息
   * @param key 键
   * @param value 值
   * @returns 构建器实例
   */
  public addDetail(key: string, value: unknown): BusinessRuleViolationBuilder {
    if (!this.details) {
      this.details = {};
    }
    this.details[key] = value;
    return this;
  }

  /**
   * 设置时间戳
   * @param timestamp 时间戳
   * @returns 构建器实例
   */
  public setTimestamp(timestamp: Date): BusinessRuleViolationBuilder {
    this.timestamp = timestamp;
    return this;
  }

  /**
   * 设置路径
   * @param path 路径
   * @returns 构建器实例
   */
  public setPath(path: string[]): BusinessRuleViolationBuilder {
    this.path = path;
    return this;
  }

  /**
   * 添加路径段
   * @param segment 路径段
   * @returns 构建器实例
   */
  public addPathSegment(segment: string): BusinessRuleViolationBuilder {
    if (!this.path) {
      this.path = [];
    }
    this.path.push(segment);
    return this;
  }

  /**
   * 设置值
   * @param value 值
   * @returns 构建器实例
   */
  public setValue(value: unknown): BusinessRuleViolationBuilder {
    this.value = value;
    return this;
  }

  /**
   * 设置位置信息
   * @param position 位置信息
   * @returns 构建器实例
   */
  public setPosition(
    position: BusinessRuleViolationPosition,
  ): BusinessRuleViolationBuilder {
    this.position = position;
    return this;
  }

  /**
   * 设置行号
   * @param line 行号
   * @returns 构建器实例
   */
  public setLine(line: number): BusinessRuleViolationBuilder {
    if (!this.position) {
      this.position = {};
    }
    this.position.line = line;
    return this;
  }

  /**
   * 设置列号
   * @param column 列号
   * @returns 构建器实例
   */
  public setColumn(column: number): BusinessRuleViolationBuilder {
    if (!this.position) {
      this.position = {};
    }
    this.position.column = column;
    return this;
  }

  /**
   * 设置开始位置
   * @param start 开始位置
   * @returns 构建器实例
   */
  public setStart(start: number): BusinessRuleViolationBuilder {
    if (!this.position) {
      this.position = {};
    }
    this.position.offset = start;
    return this;
  }

  /**
   * 设置结束位置
   * @param end 结束位置
   * @returns 构建器实例
   */
  public setEnd(end: number): BusinessRuleViolationBuilder {
    if (!this.position) {
      this.position = {};
    }
    this.position.length = end - (this.position.offset || 0);
    return this;
  }

  /**
   * 设置实体信息
   * @param entityType 实体类型
   * @param entityId 实体ID
   * @returns 构建器实例
   */
  public setEntity(
    entityType: string,
    entityId: string,
  ): BusinessRuleViolationBuilder {
    this.entityType = entityType;
    this.entityId = entityId;
    return this;
  }

  /**
   * 设置操作类型
   * @param operationType 操作类型
   * @returns 构建器实例
   */
  public setOperationType(operationType: string): BusinessRuleViolationBuilder {
    this.operationType = operationType;
    return this;
  }

  /**
   * 构建业务规则违反
   * @returns 业务规则违反实例
   */
  public build(): BusinessRuleViolation {
    if (!this.message || !this.code || !this.ruleName) {
      throw new Error("Message, code, and rule name are required");
    }

    return new BusinessRuleViolation({
      message: this.message,
      code: this.code,
      ruleName: this.ruleName,
      ruleType: this.ruleType,
      severity: this.severity,
      details: this.details,
      timestamp: this.timestamp,
      path: this.path,
      value: this.value,
      position: this.position,
      entityType: this.entityType,
      entityId: this.entityId,
      operationType: this.operationType,
    });
  }

  /**
   * 重置构建器
   * @returns 构建器实例
   */
  public reset(): BusinessRuleViolationBuilder {
    this.message = "";
    this.code = "";
    this.ruleName = "";
    this.ruleType = undefined;
    this.severity = BusinessRuleSeverity.ERROR;
    this.details = undefined;
    this.timestamp = new Date();
    this.path = undefined;
    this.value = undefined;
    this.position = undefined;
    this.entityType = undefined;
    this.entityId = undefined;
    this.operationType = undefined;
    return this;
  }
}
