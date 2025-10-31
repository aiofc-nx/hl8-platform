/**
 * @fileoverview 异常上下文接口定义
 * @description 定义异常上下文的数据结构和行为
 */

/**
 * 异常上下文接口
 * @description 提供异常发生时的上下文信息
 */
export interface ExceptionContext {
  /** 异常发生的时间戳 */
  readonly timestamp: Date;
  /** 异常发生的模块 */
  readonly module: string;
  /** 异常发生的操作 */
  readonly operation: string;
  /** 异常发生的用户ID */
  readonly userId?: string;
  /** 异常发生的会话ID */
  readonly sessionId?: string;
  /** 异常发生的请求ID */
  readonly requestId?: string;
  /** 异常发生的环境信息 */
  readonly environment: string;
  /** 异常发生的服务名称 */
  readonly serviceName: string;
  /** 异常发生的服务版本 */
  readonly serviceVersion: string;
  /** 异常发生的实例ID */
  readonly instanceId: string;
  /** 异常发生的线程ID */
  readonly threadId?: string;
  /** 异常发生的进程ID */
  readonly processId?: number;
  /** 异常发生的机器信息 */
  readonly machineInfo: MachineInfo;
  /** 异常发生的业务上下文 */
  readonly businessContext?: BusinessContext;
  /** 异常发生的技术上下文 */
  readonly technicalContext?: TechnicalContext;
  /** 异常发生的自定义数据 */
  readonly customData?: Record<string, unknown>;
}

/**
 * 机器信息接口
 * @description 描述异常发生时的机器信息
 */
export interface MachineInfo {
  /** 主机名 */
  readonly hostname: string;
  /** 操作系统 */
  readonly operatingSystem: string;
  /** 操作系统版本 */
  readonly osVersion: string;
  /** 架构 */
  readonly architecture: string;
  /** 内存信息 */
  readonly memory: MemoryInfo;
  /** CPU信息 */
  readonly cpu: CpuInfo;
  /** 网络信息 */
  readonly network: NetworkInfo;
}

/**
 * 内存信息接口
 * @description 描述内存使用情况
 */
export interface MemoryInfo {
  /** 总内存（字节） */
  readonly total: number;
  /** 可用内存（字节） */
  readonly available: number;
  /** 已使用内存（字节） */
  readonly used: number;
  /** 内存使用率（0-1） */
  readonly usageRate: number;
}

/**
 * CPU信息接口
 * @description 描述CPU使用情况
 */
export interface CpuInfo {
  /** CPU核心数 */
  readonly cores: number;
  /** CPU使用率（0-1） */
  readonly usageRate: number;
  /** CPU型号 */
  readonly model: string;
  /** CPU频率（MHz） */
  readonly frequency: number;
}

/**
 * 网络信息接口
 * @description 描述网络连接情况
 */
export interface NetworkInfo {
  /** 网络接口列表 */
  readonly interfaces: NetworkInterface[];
  /** 活动连接数 */
  readonly activeConnections: number;
  /** 网络延迟（毫秒） */
  readonly latency?: number;
}

/**
 * 网络接口接口
 * @description 描述单个网络接口
 */
export interface NetworkInterface {
  /** 接口名称 */
  readonly name: string;
  /** IP地址 */
  readonly ipAddress: string;
  /** MAC地址 */
  readonly macAddress: string;
  /** 是否启用 */
  readonly enabled: boolean;
}

/**
 * 业务上下文接口
 * @description 描述异常发生时的业务上下文
 */
export interface BusinessContext {
  /** 业务操作类型 */
  readonly operationType: string;
  /** 业务实体ID */
  readonly entityId?: string;
  /** 业务实体类型 */
  readonly entityType?: string;
  /** 业务规则 */
  readonly businessRules?: string[];
  /** 业务流程ID */
  readonly processId?: string;
  /** 业务流程步骤 */
  readonly processStep?: string;
  /** 业务优先级 */
  readonly priority?: number;
  /** 业务标签 */
  readonly tags?: string[];
}

/**
 * 技术上下文接口
 * @description 描述异常发生时的技术上下文
 */
export interface TechnicalContext {
  /** 技术栈信息 */
  readonly technologyStack: TechnologyStack;
  /** 依赖服务信息 */
  readonly dependencies: DependencyInfo[];
  /** 配置信息 */
  readonly configuration: ConfigurationInfo;
  /** 性能指标 */
  readonly performanceMetrics?: PerformanceMetrics;
  /** 日志级别 */
  readonly logLevel: string;
  /** 调试信息 */
  readonly debugInfo?: DebugInfo;
}

/**
 * 技术栈信息接口
 * @description 描述使用的技术栈
 */
export interface TechnologyStack {
  /** 编程语言 */
  readonly language: string;
  /** 语言版本 */
  readonly languageVersion: string;
  /** 框架 */
  readonly framework?: string;
  /** 框架版本 */
  readonly frameworkVersion?: string;
  /** 运行时环境 */
  readonly runtime: string;
  /** 运行时版本 */
  readonly runtimeVersion: string;
  /** 数据库 */
  readonly database?: string;
  /** 数据库版本 */
  readonly databaseVersion?: string;
}

/**
 * 依赖信息接口
 * @description 描述依赖的服务或组件
 */
export interface DependencyInfo {
  /** 依赖名称 */
  readonly name: string;
  /** 依赖类型 */
  readonly type: string;
  /** 依赖版本 */
  readonly version: string;
  /** 依赖状态 */
  readonly status: string;
  /** 依赖健康状态 */
  readonly health: string;
  /** 依赖响应时间（毫秒） */
  readonly responseTime?: number;
}

/**
 * 配置信息接口
 * @description 描述系统配置信息
 */
export interface ConfigurationInfo {
  /** 配置版本 */
  readonly version: string;
  /** 配置环境 */
  readonly environment: string;
  /** 配置区域 */
  readonly region?: string;
  /** 配置数据中心 */
  readonly dataCenter?: string;
  /** 配置集群 */
  readonly cluster?: string;
  /** 配置节点 */
  readonly node?: string;
}

/**
 * 性能指标接口
 * @description 描述系统性能指标
 */
export interface PerformanceMetrics {
  /** 响应时间（毫秒） */
  readonly responseTime: number;
  /** 吞吐量（请求/秒） */
  readonly throughput: number;
  /** 错误率（0-1） */
  readonly errorRate: number;
  /** 内存使用率（0-1） */
  readonly memoryUsage: number;
  /** CPU使用率（0-1） */
  readonly cpuUsage: number;
  /** 磁盘使用率（0-1） */
  readonly diskUsage: number;
}

/**
 * 调试信息接口
 * @description 描述调试相关信息
 */
export interface DebugInfo {
  /** 调试模式 */
  readonly debugMode: boolean;
  /** 日志级别 */
  readonly logLevel: string;
  /** 跟踪ID */
  readonly traceId?: string;
  /** 跨度ID */
  readonly spanId?: string;
  /** 父跨度ID */
  readonly parentSpanId?: string;
  /** 调试标签 */
  readonly tags?: Record<string, string>;
}
