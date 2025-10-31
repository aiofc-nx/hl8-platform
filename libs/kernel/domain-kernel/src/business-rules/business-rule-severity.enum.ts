/**
 * @fileoverview Business Rule Severity Enum - 业务规则严重性枚举
 * @description 业务规则违反的严重性级别定义
 */

/**
 * 业务规则严重性枚举
 * @description 定义业务规则违反的严重性级别
 */
export enum BusinessRuleSeverity {
  /** 信息级别 - 提供信息性反馈，不影响业务操作 */
  INFO = "INFO",
  /** 警告级别 - 需要注意但不阻止操作 */
  WARNING = "WARNING",
  /** 错误级别 - 阻止操作但可恢复 */
  ERROR = "ERROR",
  /** 严重错误级别 - 阻止操作且需要立即处理 */
  CRITICAL = "CRITICAL",
  /** 致命级别 - 系统级错误，可能导致数据损坏 */
  FATAL = "FATAL",
}

/**
 * 业务规则严重性级别信息
 * @description 提供每个严重性级别的详细信息
 */
export interface BusinessRuleSeverityInfo {
  /** 级别名称 */
  name: string;
  /** 级别描述 */
  description: string;
  /** 数值级别（用于排序和比较） */
  level: number;
  /** 是否阻止操作 */
  blocksOperation: boolean;
  /** 是否需要立即处理 */
  requiresImmediateAction: boolean;
  /** 是否可恢复 */
  recoverable: boolean;
  /** 建议的处理方式 */
  suggestedAction: string;
  /** 颜色代码（用于UI显示） */
  colorCode: string;
  /** 图标名称（用于UI显示） */
  iconName: string;
}

/**
 * 业务规则严重性级别信息映射
 * @description 提供每个严重性级别的详细信息
 */
export const BusinessRuleSeverityInfoMap: Record<
  BusinessRuleSeverity,
  BusinessRuleSeverityInfo
> = {
  [BusinessRuleSeverity.INFO]: {
    name: "信息",
    description: "提供信息性反馈，不影响业务操作",
    level: 1,
    blocksOperation: false,
    requiresImmediateAction: false,
    recoverable: true,
    suggestedAction: "记录日志，继续操作",
    colorCode: "#17a2b8",
    iconName: "info-circle",
  },
  [BusinessRuleSeverity.WARNING]: {
    name: "警告",
    description: "需要注意但不阻止操作",
    level: 2,
    blocksOperation: false,
    requiresImmediateAction: false,
    recoverable: true,
    suggestedAction: "显示警告信息，允许用户选择是否继续",
    colorCode: "#ffc107",
    iconName: "exclamation-triangle",
  },
  [BusinessRuleSeverity.ERROR]: {
    name: "错误",
    description: "阻止操作但可恢复",
    level: 3,
    blocksOperation: true,
    requiresImmediateAction: false,
    recoverable: true,
    suggestedAction: "显示错误信息，提供修复建议",
    colorCode: "#dc3545",
    iconName: "times-circle",
  },
  [BusinessRuleSeverity.CRITICAL]: {
    name: "严重错误",
    description: "阻止操作且需要立即处理",
    level: 4,
    blocksOperation: true,
    requiresImmediateAction: true,
    recoverable: true,
    suggestedAction: "立即停止操作，通知管理员",
    colorCode: "#e83e8c",
    iconName: "exclamation-circle",
  },
  [BusinessRuleSeverity.FATAL]: {
    name: "致命错误",
    description: "系统级错误，可能导致数据损坏",
    level: 5,
    blocksOperation: true,
    requiresImmediateAction: true,
    recoverable: false,
    suggestedAction: "立即停止系统，进行数据恢复",
    colorCode: "#6f42c1",
    iconName: "skull-crossbones",
  },
};

/**
 * 业务规则严重性工具类
 * @description 提供业务规则严重性相关的工具方法
 */
export class BusinessRuleSeverityUtils {
  /**
   * 获取严重性级别信息
   * @param severity 严重性级别
   * @returns 严重性级别信息
   */
  static getSeverityInfo(
    severity: BusinessRuleSeverity,
  ): BusinessRuleSeverityInfo {
    return BusinessRuleSeverityInfoMap[severity];
  }

  /**
   * 比较两个严重性级别
   * @param severity1 第一个严重性级别
   * @param severity2 第二个严重性级别
   * @returns 比较结果：-1表示severity1更轻，0表示相等，1表示severity1更重
   */
  static compare(
    severity1: BusinessRuleSeverity,
    severity2: BusinessRuleSeverity,
  ): number {
    const level1 = BusinessRuleSeverityInfoMap[severity1].level;
    const level2 = BusinessRuleSeverityInfoMap[severity2].level;
    return level1 - level2;
  }

  /**
   * 获取最严重的级别
   * @param severities 严重性级别列表
   * @returns 最严重的级别
   */
  static getMostSevere(
    severities: BusinessRuleSeverity[],
  ): BusinessRuleSeverity {
    if (severities.length === 0) {
      throw new Error("Severities list cannot be empty");
    }

    return severities.reduce((mostSevere, current) => {
      return this.compare(current, mostSevere) > 0 ? current : mostSevere;
    });
  }

  /**
   * 获取最轻的级别
   * @param severities 严重性级别列表
   * @returns 最轻的级别
   */
  static getLeastSevere(
    severities: BusinessRuleSeverity[],
  ): BusinessRuleSeverity {
    if (severities.length === 0) {
      throw new Error("Severities list cannot be empty");
    }

    return severities.reduce((leastSevere, current) => {
      return this.compare(current, leastSevere) < 0 ? current : leastSevere;
    });
  }

  /**
   * 检查是否阻止操作
   * @param severity 严重性级别
   * @returns 是否阻止操作
   */
  static blocksOperation(severity: BusinessRuleSeverity): boolean {
    return BusinessRuleSeverityInfoMap[severity].blocksOperation;
  }

  /**
   * 检查是否需要立即处理
   * @param severity 严重性级别
   * @returns 是否需要立即处理
   */
  static requiresImmediateAction(severity: BusinessRuleSeverity): boolean {
    return BusinessRuleSeverityInfoMap[severity].requiresImmediateAction;
  }

  /**
   * 检查是否可恢复
   * @param severity 严重性级别
   * @returns 是否可恢复
   */
  static isRecoverable(severity: BusinessRuleSeverity): boolean {
    return BusinessRuleSeverityInfoMap[severity].recoverable;
  }

  /**
   * 获取所有严重性级别
   * @returns 所有严重性级别列表
   */
  static getAllSeverities(): BusinessRuleSeverity[] {
    return Object.values(BusinessRuleSeverity);
  }

  /**
   * 获取阻止操作的严重性级别
   * @returns 阻止操作的严重性级别列表
   */
  static getBlockingSeverities(): BusinessRuleSeverity[] {
    return this.getAllSeverities().filter(
      (severity) => BusinessRuleSeverityInfoMap[severity].blocksOperation,
    );
  }

  /**
   * 获取需要立即处理的严重性级别
   * @returns 需要立即处理的严重性级别列表
   */
  static getImmediateActionSeverities(): BusinessRuleSeverity[] {
    return this.getAllSeverities().filter(
      (severity) =>
        BusinessRuleSeverityInfoMap[severity].requiresImmediateAction,
    );
  }

  /**
   * 验证严重性级别是否有效
   * @param severity 严重性级别
   * @returns 是否有效
   */
  static isValidSeverity(severity: string): severity is BusinessRuleSeverity {
    return Object.values(BusinessRuleSeverity).includes(
      severity as BusinessRuleSeverity,
    );
  }

  /**
   * 从字符串创建严重性级别
   * @param severityString 严重性级别字符串
   * @returns 严重性级别
   * @throws {Error} 当严重性级别无效时抛出
   */
  static fromString(severityString: string): BusinessRuleSeverity {
    if (!this.isValidSeverity(severityString)) {
      throw new Error(`Invalid severity level: ${severityString}`);
    }
    return severityString as BusinessRuleSeverity;
  }
}
