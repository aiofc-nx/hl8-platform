/**
 * @fileoverview 监控服务
 * @description 提供性能监控、指标收集和告警功能
 */

import type { Logger } from "@hl8/logger";
import type {
  PerformanceMetricConfig,
  PerformanceMetricData,
  PerformanceMetricLabel,
} from "./performance-metrics.js";
import { PerformanceMetric } from "./performance-metrics.js";

/**
 * 告警规则接口
 * @description 定义告警规则的配置
 */
export interface AlertRule {
  /** 规则ID */
  id: string;
  /** 指标名称 */
  metricName: string;
  /** 条件 */
  condition: string;
  /** 阈值 */
  threshold: number;
  /** 比较操作符 */
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "ne";
  /** 持续时间（毫秒） */
  duration: number;
  /** 严重级别 */
  severity: "low" | "medium" | "high" | "critical";
  /** 是否启用 */
  enabled: boolean;
  /** 标签过滤器 */
  labels?: PerformanceMetricLabel[];
}

/**
 * 告警事件接口
 * @description 定义告警事件的数据结构
 */
export interface AlertEvent {
  /** 告警ID */
  id: string;
  /** 规则ID */
  ruleId: string;
  /** 指标名称 */
  metricName: string;
  /** 当前值 */
  currentValue: number;
  /** 阈值 */
  threshold: number;
  /** 严重级别 */
  severity: string;
  /** 触发时间 */
  triggeredAt: Date;
  /** 恢复时间 */
  recoveredAt?: Date;
  /** 状态 */
  status: "active" | "recovered" | "suppressed";
  /** 标签 */
  labels: PerformanceMetricLabel[];
  /** 消息 */
  message: string;
}

/**
 * 监控配置接口
 * @description 定义监控服务的配置参数
 */
export interface MonitoringConfig {
  /** 是否启用监控 */
  enabled: boolean;
  /** 指标收集间隔（毫秒） */
  collectionInterval: number;
  /** 告警检查间隔（毫秒） */
  alertCheckInterval: number;
  /** 数据保留时间（毫秒） */
  dataRetentionTime: number;
  /** 最大指标数量 */
  maxMetrics: number;
  /** 是否启用自动清理 */
  enableAutoCleanup: boolean;
  /** 清理间隔（毫秒） */
  cleanupInterval: number;
}

/**
 * 监控服务类
 * @description 提供性能监控和告警功能
 */
export class MonitoringService {
  private readonly metrics = new Map<string, PerformanceMetric>();
  private readonly alertRules = new Map<string, AlertRule>();
  private readonly activeAlerts = new Map<string, AlertEvent>();
  private readonly config: MonitoringConfig;
  private readonly logger: Logger;
  private collectionTimer?: NodeJS.Timeout;
  private alertCheckTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: MonitoringConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;

    if (config.enabled) {
      this.startTimers();
    }
  }

  /**
   * 创建性能指标
   * @param config 指标配置
   * @returns 指标实例
   */
  createMetric(config: PerformanceMetricConfig): PerformanceMetric {
    const metric = new PerformanceMetric(config, this.logger);
    this.metrics.set(config.name, metric);

    this.logger.debug("创建性能指标", {
      name: config.name,
      type: config.type,
    });

    return metric;
  }

  /**
   * 获取性能指标
   * @param name 指标名称
   * @returns 指标实例
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * 删除性能指标
   * @param name 指标名称
   * @returns 删除结果
   */
  removeMetric(name: string): boolean {
    const metric = this.metrics.get(name);
    if (!metric) {
      return false;
    }

    this.metrics.delete(name);
    this.logger.debug("删除性能指标", { name });
    return true;
  }

  /**
   * 获取所有性能指标
   * @returns 指标列表
   */
  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * 添加告警规则
   * @param rule 告警规则
   * @returns 添加结果
   */
  addAlertRule(rule: AlertRule): boolean {
    try {
      this.alertRules.set(rule.id, rule);

      this.logger.debug("添加告警规则", {
        ruleId: rule.id,
        metricName: rule.metricName,
        condition: rule.condition,
        threshold: rule.threshold,
        severity: rule.severity,
      });

      return true;
    } catch (error) {
      this.logger.error("添加告警规则失败", {
        ruleId: rule.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 移除告警规则
   * @param ruleId 规则ID
   * @returns 移除结果
   */
  removeAlertRule(ruleId: string): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      return false;
    }

    this.alertRules.delete(ruleId);

    // 移除相关的活跃告警
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.ruleId === ruleId) {
        this.activeAlerts.delete(alertId);
      }
    }

    this.logger.debug("移除告警规则", { ruleId });
    return true;
  }

  /**
   * 获取告警规则
   * @param ruleId 规则ID
   * @returns 告警规则
   */
  getAlertRule(ruleId: string): AlertRule | undefined {
    return this.alertRules.get(ruleId);
  }

  /**
   * 获取所有告警规则
   * @returns 告警规则列表
   */
  getAllAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * 获取活跃告警
   * @returns 活跃告警列表
   */
  getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 获取告警历史
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param severity 严重级别过滤
   * @returns 告警历史
   */
  getAlertHistory(
    _startTime?: Date,
    _endTime?: Date,
    _severity?: string,
  ): AlertEvent[] {
    // 这里应该从持久化存储中获取历史告警
    // 为了简化，这里返回空数组
    return [];
  }

  /**
   * 手动触发告警检查
   * @returns 检查结果
   */
  async checkAlerts(): Promise<boolean> {
    try {
      for (const rule of this.alertRules.values()) {
        if (!rule.enabled) {
          continue;
        }

        const metric = this.metrics.get(rule.metricName);
        if (!metric) {
          continue;
        }

        const stats = metric.getStats(rule.labels);
        const currentValue = this.getCurrentValue(stats, rule.condition);

        if (
          this.evaluateCondition(currentValue, rule.operator, rule.threshold)
        ) {
          await this.triggerAlert(rule, currentValue);
        } else {
          await this.recoverAlert(rule.id);
        }
      }

      return true;
    } catch (error) {
      this.logger.error("检查告警失败", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 获取监控统计信息
   * @returns 统计信息
   */
  getStats(): {
    metricsCount: number;
    alertRulesCount: number;
    activeAlertsCount: number;
    enabledRulesCount: number;
  } {
    const enabledRulesCount = Array.from(this.alertRules.values()).filter(
      (rule) => rule.enabled,
    ).length;

    return {
      metricsCount: this.metrics.size,
      alertRulesCount: this.alertRules.size,
      activeAlertsCount: this.activeAlerts.size,
      enabledRulesCount,
    };
  }

  /**
   * 导出指标数据
   * @param format 导出格式
   * @returns 导出的数据
   */
  exportMetrics(format: "json" | "csv" = "json"): string {
    const data: Record<string, PerformanceMetricData[]> = {};

    for (const [name, metric] of this.metrics.entries()) {
      data[name] = metric.getData();
    }

    if (format === "json") {
      return JSON.stringify(data, null, 2);
    } else {
      // CSV格式导出
      const lines: string[] = [];
      lines.push("metric_name,timestamp,value,labels");

      for (const [name, metricData] of Object.entries(data)) {
        for (const item of metricData) {
          const labels = item.labels
            .map((label) => `${label.name}=${label.value}`)
            .join(";");
          lines.push(
            `${name},${item.timestamp.toISOString()},${item.value},"${labels}"`,
          );
        }
      }

      return lines.join("\n");
    }
  }

  /**
   * 清空所有数据
   * @returns 清空结果
   */
  clearAll(): boolean {
    try {
      // 清空所有指标
      for (const metric of this.metrics.values()) {
        metric.clear();
      }
      this.metrics.clear();

      // 清空告警规则
      this.alertRules.clear();

      // 清空活跃告警
      this.activeAlerts.clear();

      this.logger.debug("清空所有监控数据");
      return true;
    } catch (error) {
      this.logger.error("清空监控数据失败", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 销毁监控服务
   * @returns 销毁结果
   */
  destroy(): boolean {
    try {
      this.stopTimers();
      this.clearAll();

      this.logger.debug("监控服务已销毁");
      return true;
    } catch (error) {
      this.logger.error("销毁监控服务失败", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  // 私有方法

  /**
   * 启动定时器
   */
  private startTimers(): void {
    // 指标收集定时器
    this.collectionTimer = setInterval(async () => {
      await this.collectMetrics();
    }, this.config.collectionInterval);

    // 告警检查定时器
    this.alertCheckTimer = setInterval(async () => {
      await this.checkAlerts();
    }, this.config.alertCheckInterval);

    // 清理定时器
    if (this.config.enableAutoCleanup) {
      this.cleanupTimer = setInterval(async () => {
        await this.cleanup();
      }, this.config.cleanupInterval);
    }
  }

  /**
   * 停止定时器
   */
  private stopTimers(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = undefined;
    }

    if (this.alertCheckTimer) {
      clearInterval(this.alertCheckTimer);
      this.alertCheckTimer = undefined;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * 收集指标数据
   */
  private async collectMetrics(): Promise<void> {
    // 这里可以添加额外的指标收集逻辑
    this.logger.debug("收集指标数据", {
      metricsCount: this.metrics.size,
    });
  }

  /**
   * 清理过期数据
   */
  private async cleanup(): Promise<void> {
    const cutoffTime = new Date(Date.now() - this.config.dataRetentionTime);

    for (const metric of this.metrics.values()) {
      const data = metric.getData();
      const filteredData = data.filter((item) => item.timestamp > cutoffTime);

      // 清空并重新添加过滤后的数据
      metric.clear();
      for (const item of filteredData) {
        metric.record(item.value, item.labels, item.timestamp);
      }
    }

    this.logger.debug("清理过期数据完成", { cutoffTime });
  }

  /**
   * 获取当前值
   * @param stats 统计信息
   * @param condition 条件
   * @returns 当前值
   */
  private getCurrentValue(
    stats: {
      count: number;
      sum: number;
      average: number;
      min: number;
      max: number;
      lastValue: number;
      firstValue: number;
    },
    condition: string,
  ): number {
    switch (condition) {
      case "average":
        return stats.average;
      case "sum":
        return stats.sum;
      case "min":
        return stats.min;
      case "max":
        return stats.max;
      case "count":
        return stats.count;
      case "last":
        return stats.lastValue;
      default:
        return stats.average;
    }
  }

  /**
   * 评估条件
   * @param currentValue 当前值
   * @param operator 操作符
   * @param threshold 阈值
   * @returns 是否满足条件
   */
  private evaluateCondition(
    currentValue: number,
    operator: string,
    threshold: number,
  ): boolean {
    switch (operator) {
      case "gt":
        return currentValue > threshold;
      case "gte":
        return currentValue >= threshold;
      case "lt":
        return currentValue < threshold;
      case "lte":
        return currentValue <= threshold;
      case "eq":
        return currentValue === threshold;
      case "ne":
        return currentValue !== threshold;
      default:
        return false;
    }
  }

  /**
   * 触发告警
   * @param rule 告警规则
   * @param currentValue 当前值
   */
  private async triggerAlert(
    rule: AlertRule,
    currentValue: number,
  ): Promise<void> {
    const alertId = `${rule.id}-${Date.now()}`;

    // 检查是否已经存在活跃告警
    const existingAlert = Array.from(this.activeAlerts.values()).find(
      (alert) => alert.ruleId === rule.id && alert.status === "active",
    );

    if (existingAlert) {
      return; // 告警已经存在
    }

    const alert: AlertEvent = {
      id: alertId,
      ruleId: rule.id,
      metricName: rule.metricName,
      currentValue,
      threshold: rule.threshold,
      severity: rule.severity,
      triggeredAt: new Date(),
      status: "active",
      labels: rule.labels || [],
      message: `${rule.metricName} ${rule.operator} ${rule.threshold} (当前值: ${currentValue})`,
    };

    this.activeAlerts.set(alertId, alert);

    this.logger.warn("触发告警", {
      alertId,
      ruleId: rule.id,
      metricName: rule.metricName,
      currentValue,
      threshold: rule.threshold,
      severity: rule.severity,
    });
  }

  /**
   * 恢复告警
   * @param ruleId 规则ID
   */
  private async recoverAlert(ruleId: string): Promise<void> {
    const alerts = Array.from(this.activeAlerts.values()).filter(
      (alert) => alert.ruleId === ruleId && alert.status === "active",
    );

    for (const alert of alerts) {
      alert.status = "recovered";
      alert.recoveredAt = new Date();

      this.logger.debug("恢复告警", {
        alertId: alert.id,
        ruleId: alert.ruleId,
        metricName: alert.metricName,
      });
    }
  }
}
