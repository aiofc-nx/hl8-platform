/**
 * @fileoverview 性能指标类
 * @description 提供性能数据的收集、计算和报告功能
 */

import type { Logger } from "@hl8/logger";

/**
 * 性能指标类型枚举
 * @description 定义支持的性能指标类型
 */
export enum PerformanceMetricType {
  /** 计数器 */
  COUNTER = "counter",
  /** 仪表盘 */
  GAUGE = "gauge",
  /** 直方图 */
  HISTOGRAM = "histogram",
  /** 摘要 */
  SUMMARY = "summary",
}

/**
 * 性能指标标签接口
 * @description 定义性能指标的标签结构
 */
export interface PerformanceMetricLabel {
  /** 标签名称 */
  name: string;
  /** 标签值 */
  value: string;
}

/**
 * 性能指标数据接口
 * @description 定义性能指标的数据结构
 */
export interface PerformanceMetricData {
  /** 指标名称 */
  name: string;
  /** 指标类型 */
  type: PerformanceMetricType;
  /** 指标值 */
  value: number;
  /** 标签列表 */
  labels: PerformanceMetricLabel[];
  /** 时间戳 */
  timestamp: Date;
  /** 描述 */
  description?: string;
  /** 单位 */
  unit?: string;
}

/**
 * 直方图桶接口
 * @description 定义直方图的分桶结构
 */
export interface HistogramBucket {
  /** 桶的上界 */
  upperBound: number;
  /** 桶的计数 */
  count: number;
}

/**
 * 直方图数据接口
 * @description 定义直方图指标的数据结构
 */
export interface HistogramData extends Omit<PerformanceMetricData, "value"> {
  /** 直方图桶 */
  buckets: HistogramBucket[];
  /** 总计数 */
  count: number;
  /** 总和 */
  sum: number;
}

/**
 * 摘要数据接口
 * @description 定义摘要指标的数据结构
 */
export interface SummaryData extends Omit<PerformanceMetricData, "value"> {
  /** 总计数 */
  count: number;
  /** 总和 */
  sum: number;
  /** 分位数 */
  quantiles: Map<number, number>;
}

/**
 * 性能指标配置接口
 * @description 定义性能指标的配置参数
 */
export interface PerformanceMetricConfig {
  /** 指标名称 */
  name: string;
  /** 指标类型 */
  type: PerformanceMetricType;
  /** 描述 */
  description?: string;
  /** 单位 */
  unit?: string;
  /** 标签列表 */
  labels?: PerformanceMetricLabel[];
  /** 直方图桶配置（仅用于直方图类型） */
  buckets?: number[];
  /** 摘要分位数配置（仅用于摘要类型） */
  quantiles?: number[];
}

/**
 * 性能指标类
 * @description 提供性能指标的收集和管理功能
 */
export class PerformanceMetric {
  private readonly config: PerformanceMetricConfig;
  private readonly logger: Logger;
  private readonly data: PerformanceMetricData[] = [];
  private readonly histogramBuckets: Map<string, number> = new Map();
  private readonly summaryQuantiles: Map<string, number> = new Map();

  constructor(config: PerformanceMetricConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.initializeBuckets();
  }

  /**
   * 记录指标值
   * @param value 指标值
   * @param labels 标签列表
   * @param timestamp 时间戳
   * @returns 记录结果
   */
  record(
    value: number,
    labels: PerformanceMetricLabel[] = [],
    timestamp: Date = new Date(),
  ): boolean {
    try {
      const metricData: PerformanceMetricData = {
        name: this.config.name,
        type: this.config.type,
        value,
        labels: [...labels, ...(this.config.labels || [])],
        timestamp,
        description: this.config.description,
        unit: this.config.unit,
      };

      this.data.push(metricData);

      // 更新直方图桶
      if (this.config.type === PerformanceMetricType.HISTOGRAM) {
        this.updateHistogramBuckets(value, labels);
      }

      // 更新摘要分位数
      if (this.config.type === PerformanceMetricType.SUMMARY) {
        this.updateSummaryQuantiles(value, labels);
      }

      this.logger.debug("记录性能指标", {
        name: this.config.name,
        value,
        labels,
        timestamp,
      });

      return true;
    } catch (error) {
      this.logger.error("记录性能指标失败", {
        name: this.config.name,
        value,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 增加计数器值
   * @param increment 增量值
   * @param labels 标签列表
   * @param timestamp 时间戳
   * @returns 增加结果
   */
  increment(
    increment: number = 1,
    labels: PerformanceMetricLabel[] = [],
    timestamp: Date = new Date(),
  ): boolean {
    if (this.config.type !== PerformanceMetricType.COUNTER) {
      this.logger.warn("只能在计数器类型指标上调用increment方法", {
        name: this.config.name,
        type: this.config.type,
      });
      return false;
    }

    return this.record(increment, labels, timestamp);
  }

  /**
   * 设置仪表盘值
   * @param value 指标值
   * @param labels 标签列表
   * @param timestamp 时间戳
   * @returns 设置结果
   */
  set(
    value: number,
    labels: PerformanceMetricLabel[] = [],
    timestamp: Date = new Date(),
  ): boolean {
    if (this.config.type !== PerformanceMetricType.GAUGE) {
      this.logger.warn("只能在仪表盘类型指标上调用set方法", {
        name: this.config.name,
        type: this.config.type,
      });
      return false;
    }

    return this.record(value, labels, timestamp);
  }

  /**
   * 记录直方图值
   * @param value 指标值
   * @param labels 标签列表
   * @param timestamp 时间戳
   * @returns 记录结果
   */
  observe(
    value: number,
    labels: PerformanceMetricLabel[] = [],
    timestamp: Date = new Date(),
  ): boolean {
    if (this.config.type !== PerformanceMetricType.HISTOGRAM) {
      this.logger.warn("只能在直方图类型指标上调用observe方法", {
        name: this.config.name,
        type: this.config.type,
      });
      return false;
    }

    return this.record(value, labels, timestamp);
  }

  /**
   * 获取指标数据
   * @param labels 标签过滤器
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 指标数据列表
   */
  getData(
    labels?: PerformanceMetricLabel[],
    startTime?: Date,
    endTime?: Date,
  ): PerformanceMetricData[] {
    let filteredData = [...this.data];

    // 按标签过滤
    if (labels && labels.length > 0) {
      filteredData = filteredData.filter((item) =>
        this.matchesLabels(item.labels, labels),
      );
    }

    // 按时间过滤
    if (startTime) {
      filteredData = filteredData.filter((item) => item.timestamp >= startTime);
    }

    if (endTime) {
      filteredData = filteredData.filter((item) => item.timestamp <= endTime);
    }

    return filteredData;
  }

  /**
   * 获取直方图数据
   * @param labels 标签过滤器
   * @returns 直方图数据
   */
  getHistogramData(
    labels?: PerformanceMetricLabel[],
  ): HistogramData | undefined {
    if (this.config.type !== PerformanceMetricType.HISTOGRAM) {
      return undefined;
    }

    const filteredData = this.getData(labels);
    if (filteredData.length === 0) {
      return undefined;
    }

    const buckets: HistogramBucket[] = [];
    const labelKey = this.getLabelKey(labels || []);

    for (const bucket of this.config.buckets || []) {
      const count = this.histogramBuckets.get(`${labelKey}:${bucket}`) || 0;
      buckets.push({ upperBound: bucket, count });
    }

    const sum = filteredData.reduce((acc, item) => acc + item.value, 0);

    return {
      name: this.config.name,
      type: this.config.type,
      labels: labels || [],
      timestamp: new Date(),
      description: this.config.description,
      unit: this.config.unit,
      buckets,
      count: filteredData.length,
      sum,
    };
  }

  /**
   * 获取摘要数据
   * @param labels 标签过滤器
   * @returns 摘要数据
   */
  getSummaryData(labels?: PerformanceMetricLabel[]): SummaryData | undefined {
    if (this.config.type !== PerformanceMetricType.SUMMARY) {
      return undefined;
    }

    const filteredData = this.getData(labels);
    if (filteredData.length === 0) {
      return undefined;
    }

    const labelKey = this.getLabelKey(labels || []);
    const quantiles = new Map<number, number>();

    const quantilesConfig = this.config.quantiles || [];
    for (const quantile of quantilesConfig) {
      const value = this.summaryQuantiles.get(`${labelKey}:${quantile}`) || 0;
      quantiles.set(quantile, value);
    }

    const sum = filteredData.reduce((acc, item) => acc + item.value, 0);

    return {
      name: this.config.name,
      type: this.config.type,
      labels: labels || [],
      timestamp: new Date(),
      description: this.config.description,
      unit: this.config.unit,
      count: filteredData.length,
      sum,
      quantiles,
    };
  }

  /**
   * 获取统计信息
   * @param labels 标签过滤器
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 统计信息
   */
  getStats(
    labels?: PerformanceMetricLabel[],
    startTime?: Date,
    endTime?: Date,
  ): {
    count: number;
    sum: number;
    average: number;
    min: number;
    max: number;
    lastValue: number;
    firstValue: number;
  } {
    const filteredData = this.getData(labels, startTime, endTime);
    if (filteredData.length === 0) {
      return {
        count: 0,
        sum: 0,
        average: 0,
        min: 0,
        max: 0,
        lastValue: 0,
        firstValue: 0,
      };
    }

    const values = filteredData.map((item) => item.value);
    const sum = values.reduce((acc, value) => acc + value, 0);

    return {
      count: values.length,
      sum,
      average: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      lastValue: values[values.length - 1],
      firstValue: values[0],
    };
  }

  /**
   * 清空指标数据
   * @returns 清空结果
   */
  clear(): boolean {
    try {
      this.data.length = 0;
      this.histogramBuckets.clear();
      this.summaryQuantiles.clear();

      this.logger.debug("清空性能指标数据", { name: this.config.name });
      return true;
    } catch (error) {
      this.logger.error("清空性能指标数据失败", {
        name: this.config.name,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 获取配置信息
   * @returns 配置信息
   */
  getConfig(): PerformanceMetricConfig {
    return { ...this.config };
  }

  // 私有方法

  /**
   * 初始化直方图桶
   */
  private initializeBuckets(): void {
    if (
      this.config.type === PerformanceMetricType.HISTOGRAM &&
      this.config.buckets
    ) {
      for (const bucket of this.config.buckets) {
        this.histogramBuckets.set(`:${bucket}`, 0);
      }
    }
  }

  /**
   * 更新直方图桶
   * @param value 指标值
   * @param labels 标签列表
   */
  private updateHistogramBuckets(
    value: number,
    labels: PerformanceMetricLabel[],
  ): void {
    const labelKey = this.getLabelKey(labels);

    for (const bucket of this.config.buckets || []) {
      if (value <= bucket) {
        const key = `${labelKey}:${bucket}`;
        const currentCount = this.histogramBuckets.get(key) || 0;
        this.histogramBuckets.set(key, currentCount + 1);
      }
    }
  }

  /**
   * 更新摘要分位数
   * @param value 指标值
   * @param labels 标签列表
   */
  private updateSummaryQuantiles(
    value: number,
    labels: PerformanceMetricLabel[],
  ): void {
    const labelKey = this.getLabelKey(labels);
    const values = this.getData(labels).map((item) => item.value);
    values.push(value);
    values.sort((a, b) => a - b);

    const quantilesConfig = this.config.quantiles || [];
    for (const quantile of quantilesConfig) {
      const index = Math.ceil(values.length * quantile) - 1;
      const quantileValue = values[Math.max(0, index)];
      this.summaryQuantiles.set(`${labelKey}:${quantile}`, quantileValue);
    }
  }

  /**
   * 检查标签是否匹配
   * @param itemLabels 指标标签
   * @param filterLabels 过滤标签
   * @returns 是否匹配
   */
  private matchesLabels(
    itemLabels: PerformanceMetricLabel[],
    filterLabels: PerformanceMetricLabel[],
  ): boolean {
    return filterLabels.every((filterLabel) =>
      itemLabels.some(
        (itemLabel) =>
          itemLabel.name === filterLabel.name &&
          itemLabel.value === filterLabel.value,
      ),
    );
  }

  /**
   * 获取标签键
   * @param labels 标签列表
   * @returns 标签键
   */
  private getLabelKey(labels: PerformanceMetricLabel[]): string {
    return labels
      .map((label) => `${label.name}=${label.value}`)
      .sort()
      .join(",");
  }
}
