/**
 * @fileoverview 仓储异常类定义
 * @description 定义基础设施层仓储操作相关的异常类型
 */

import { RepositoryException } from "@hl8/domain-kernel";

/**
 * 基础设施层仓储异常
 * @description 基础设施层的仓储操作异常，继承自领域层仓储异常
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
