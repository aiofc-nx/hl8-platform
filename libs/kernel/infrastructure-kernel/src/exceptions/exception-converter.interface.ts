/**
 * @fileoverview 异常转换器接口
 * @description 定义将底层异常（MikroORM、数据库异常）转换为领域异常的接口
 */

import { DomainException } from "@hl8/domain-kernel";

/**
 * 异常转换器接口
 * @description 提供将底层异常转换为领域异常的标准化方法
 */
export interface IExceptionConverter {
  /**
   * 将错误转换为领域异常
   * @description 自动识别异常类型（乐观锁冲突、连接失败、查询错误等）并转换为对应的领域异常
   * @param error 原始错误对象
   * @param operation 操作名称（如 "save", "findById"）
   * @param entityType 实体类型名称
   * @param entityId 实体ID（可选）
   * @returns 领域异常实例
   */
  convertToDomainException(
    error: unknown,
    operation: string,
    entityType: string,
    entityId?: string,
  ): DomainException;

  /**
   * 检查是否为乐观锁冲突异常
   * @param error 错误对象
   * @returns 是否为乐观锁冲突
   */
  isOptimisticLockException(error: unknown): boolean;

  /**
   * 检查是否为数据库连接失败异常
   * @param error 错误对象
   * @returns 是否为连接失败
   */
  isConnectionException(error: unknown): boolean;

  /**
   * 检查是否为查询错误异常
   * @param error 错误对象
   * @returns 是否为查询错误
   */
  isQueryException(error: unknown): boolean;

  /**
   * 检查是否为事务错误异常
   * @param error 错误对象
   * @returns 是否为事务错误
   */
  isTransactionException(error: unknown): boolean;
}
