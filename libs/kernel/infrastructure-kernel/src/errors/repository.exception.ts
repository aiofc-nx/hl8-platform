/**
 * @fileoverview 仓储异常类定义
 * @description 定义基础设施层仓储操作相关的异常类型
 */

import { RepositoryException } from "@hl8/domain-kernel";

/**
 * 基础设施层仓储异常
 * @description 基础设施层的仓储操作异常，继承自领域层仓储异常
 * @note 此异常类为基础设施层特定的异常类型预留，当前使用 domain-kernel 的通用异常
 * 保留此类以便未来可能需要基础设施层特定的异常处理逻辑
 */
export class InfrastructureRepositoryException extends RepositoryException {
  constructor(
    message: string,
    operation: string,
    entityType: string,
    entityId?: string,
    originalError?: Error,
  ) {
    super(message, operation, entityType, entityId, originalError);
  }

  clone(): InfrastructureRepositoryException {
    return new InfrastructureRepositoryException(
      this.message,
      this.operation,
      this.entityType,
      this.entityId,
      this.originalError,
    );
  }
}
