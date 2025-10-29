/**
 * @fileoverview Aggregate Snapshot Interface - 聚合快照接口
 * @description 聚合根快照的通用接口定义
 */

import { EntityId } from "../identifiers/entity-id.js";

/**
 * 聚合快照接口
 * @description 聚合根的状态快照
 */
export interface AggregateSnapshot {
  /** 聚合根标识符 */
  aggregateId: EntityId;
  /** 聚合根类型 */
  aggregateType: string;
  /** 快照版本号 */
  version: number;
  /** 快照数据 */
  data: unknown;
  /** 快照元数据 */
  metadata: SnapshotMetadata;
  /** 创建时间 */
  createdAt: Date;
  /** 快照标识符 */
  snapshotId: string;
}

/**
 * 快照元数据接口
 * @description 聚合快照的元数据信息
 */
export interface SnapshotMetadata {
  /** 快照类型 */
  snapshotType: SnapshotType;
  /** 快照原因 */
  reason: string;
  /** 快照来源 */
  source?: string;
  /** 创建者 */
  createdBy?: string;
  /** 标签 */
  tags?: string[];
  /** 相关性标识符 */
  correlationId?: string;
  /** 因果关系标识符 */
  causationId?: string;
  /** 用户标识符 */
  userId?: string;
  /** 会话标识符 */
  sessionId?: string;
  /** 请求标识符 */
  requestId?: string;
  /** 快照大小（字节） */
  size?: number;
  /** 压缩信息 */
  compression?: CompressionInfo;
  /** 加密信息 */
  encryption?: EncryptionInfo;
  /** 自定义元数据 */
  customData?: Record<string, unknown>;
}

/**
 * 快照类型枚举
 * @description 聚合快照的类型
 */
export enum SnapshotType {
  /** 完整快照 */
  FULL = "FULL",
  /** 增量快照 */
  INCREMENTAL = "INCREMENTAL",
  /** 差异快照 */
  DIFFERENTIAL = "DIFFERENTIAL",
  /** 压缩快照 */
  COMPRESSED = "COMPRESSED",
  /** 加密快照 */
  ENCRYPTED = "ENCRYPTED",
  /** 临时快照 */
  TEMPORARY = "TEMPORARY",
  /** 持久快照 */
  PERSISTENT = "PERSISTENT",
}

/**
 * 压缩信息接口
 * @description 快照压缩的相关信息
 */
export interface CompressionInfo {
  /** 压缩算法 */
  algorithm: CompressionAlgorithm;
  /** 压缩级别 */
  level: number;
  /** 原始大小 */
  originalSize: number;
  /** 压缩后大小 */
  compressedSize: number;
  /** 压缩比 */
  compressionRatio: number;
  /** 压缩时间（毫秒） */
  compressionTime: number;
}

/**
 * 压缩算法枚举
 * @description 支持的压缩算法
 */
export enum CompressionAlgorithm {
  /** GZIP压缩 */
  GZIP = "GZIP",
  /** DEFLATE压缩 */
  DEFLATE = "DEFLATE",
  /** LZ4压缩 */
  LZ4 = "LZ4",
  /** ZSTD压缩 */
  ZSTD = "ZSTD",
  /** BROTLI压缩 */
  BROTLI = "BROTLI",
}

/**
 * 加密信息接口
 * @description 快照加密的相关信息
 */
export interface EncryptionInfo {
  /** 加密算法 */
  algorithm: EncryptionAlgorithm;
  /** 密钥标识符 */
  keyId: string;
  /** 初始化向量 */
  iv?: string;
  /** 加密时间（毫秒） */
  encryptionTime: number;
  /** 加密模式 */
  mode?: EncryptionMode;
  /** 填充方式 */
  padding?: PaddingMode;
}

/**
 * 加密算法枚举
 * @description 支持的加密算法
 */
export enum EncryptionAlgorithm {
  /** AES加密 */
  AES = "AES",
  /** RSA加密 */
  RSA = "RSA",
  /** ChaCha20加密 */
  CHACHA20 = "CHACHA20",
  /** XChaCha20加密 */
  XCHACHA20 = "XCHACHA20",
}

/**
 * 加密模式枚举
 * @description 支持的加密模式
 */
export enum EncryptionMode {
  /** CBC模式 */
  CBC = "CBC",
  /** GCM模式 */
  GCM = "GCM",
  /** CTR模式 */
  CTR = "CTR",
  /** OFB模式 */
  OFB = "OFB",
}

/**
 * 填充方式枚举
 * @description 支持的填充方式
 */
export enum PaddingMode {
  /** PKCS7填充 */
  PKCS7 = "PKCS7",
  /** PKCS1填充 */
  PKCS1 = "PKCS1",
  /** OAEP填充 */
  OAEP = "OAEP",
  /** 无填充 */
  NONE = "NONE",
}

/**
 * 快照创建参数接口
 * @description 创建聚合快照时的参数
 */
export interface SnapshotCreationParams {
  /** 聚合根标识符 */
  aggregateId: EntityId;
  /** 聚合根类型 */
  aggregateType: string;
  /** 聚合根数据 */
  aggregateData: unknown;
  /** 版本号 */
  version: number;
  /** 创建选项 */
  options?: SnapshotCreationOptions;
  /** 元数据 */
  metadata?: Partial<SnapshotMetadata>;
}

/**
 * 快照创建选项接口
 * @description 创建聚合快照时的选项
 */
export interface SnapshotCreationOptions {
  /** 快照类型 */
  snapshotType?: SnapshotType;
  /** 是否压缩 */
  compress?: boolean;
  /** 压缩算法 */
  compressionAlgorithm?: CompressionAlgorithm;
  /** 压缩级别 */
  compressionLevel?: number;
  /** 是否加密 */
  encrypt?: boolean;
  /** 加密算法 */
  encryptionAlgorithm?: EncryptionAlgorithm;
  /** 密钥标识符 */
  keyId?: string;
  /** 是否验证数据完整性 */
  validateDataIntegrity?: boolean;
  /** 是否生成校验和 */
  generateChecksum?: boolean;
  /** 最大快照大小（字节） */
  maxSnapshotSize?: number;
  /** 快照过期时间 */
  expirationTime?: Date;
}

/**
 * 快照恢复参数接口
 * @description 从聚合快照恢复时的参数
 */
export interface SnapshotRestoreParams {
  /** 快照标识符 */
  snapshotId: string;
  /** 恢复选项 */
  options?: SnapshotRestoreOptions;
  /** 目标版本号 */
  targetVersion?: number;
}

/**
 * 快照恢复选项接口
 * @description 从聚合快照恢复时的选项
 */
export interface SnapshotRestoreOptions {
  /** 是否验证快照完整性 */
  validateIntegrity?: boolean;
  /** 是否验证版本兼容性 */
  validateVersionCompatibility?: boolean;
  /** 是否应用事件重放 */
  applyEventReplay?: boolean;
  /** 是否验证业务规则 */
  validateBusinessRules?: boolean;
  /** 恢复超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
}

/**
 * 快照恢复结果接口
 * @description 从聚合快照恢复的结果
 */
export interface SnapshotRestoreResult<T> {
  /** 恢复的聚合根 */
  aggregate: T;
  /** 恢复统计信息 */
  statistics: RestoreStatistics;
  /** 警告信息 */
  warnings: string[];
  /** 错误信息 */
  errors: string[];
}

/**
 * 恢复统计信息接口
 * @description 快照恢复过程的统计信息
 */
export interface RestoreStatistics {
  /** 恢复开始时间 */
  startTime: Date;
  /** 恢复结束时间 */
  endTime: Date;
  /** 恢复耗时（毫秒） */
  duration: number;
  /** 快照大小 */
  snapshotSize: number;
  /** 解压缩时间（毫秒） */
  decompressionTime?: number;
  /** 解密时间（毫秒） */
  decryptionTime?: number;
  /** 数据验证时间（毫秒） */
  validationTime: number;
  /** 最终版本号 */
  finalVersion: number;
}
