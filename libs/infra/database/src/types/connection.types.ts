/**
 * 连接类型定义
 *
 * @description 定义数据库连接相关的类型
 *
 * @since 1.0.0
 */

/**
 * 连接状态枚举
 */
export enum ConnectionStatus {
  /** 已连接 */
  CONNECTED = "connected",
  /** 已断开 */
  DISCONNECTED = "disconnected",
  /** 连接中 */
  CONNECTING = "connecting",
  /** 错误状态 */
  ERROR = "error",
}

/**
 * 连接配置
 */
export interface ConnectionConfig {
  /** 主机地址 */
  host: string;
  /** 端口号 */
  port: number;
  /** 数据库名 */
  database: string;
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
}

/**
 * 连接池配置
 */
export interface PoolConfig {
  /** 最小连接数 */
  min: number;
  /** 最大连接数 */
  max: number;
  /** 空闲超时时间（毫秒） */
  idleTimeoutMillis: number;
  /** 获取连接超时时间（毫秒） */
  acquireTimeoutMillis: number;
  /** 创建连接超时时间（毫秒） */
  createTimeoutMillis: number;
}

/**
 * 连接信息
 */
export interface ConnectionInfo {
  /** 主机地址 */
  host: string;
  /** 端口号 */
  port: number;
  /** 数据库名 */
  database: string;
  /** 数据库类型 */
  type: "postgresql" | "mongodb";
  /** 连接状态 */
  status: "connected" | "disconnected" | "connecting" | "error";
  /** 连接时间 */
  connectedAt: Date;
  /** 运行时间（毫秒） */
  uptime: number;
  /** 最后活动时间 */
  lastActivityAt?: Date;
  /** 连接池统计 */
  poolStats?: PoolStats;
}

/**
 * 连接池统计
 */
export interface PoolStats {
  /** 总连接数 */
  total: number;
  /** 活跃连接数 */
  active: number;
  /** 空闲连接数 */
  idle: number;
  /** 等待连接数 */
  waiting: number;
  /** 最大连接数 */
  max: number;
  /** 最小连接数 */
  min: number;
}

/**
 * 数据库状态
 */
export interface DatabaseStatus {
  /** 是否连接 */
  connected: boolean;
  /** 连接信息 */
  connectionInfo: ConnectionInfo;
  /** 连接池统计 */
  poolStats: PoolStats;
  /** 最后活动时间 */
  lastActivityAt: Date | null;
}
