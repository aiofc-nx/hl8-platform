/**
 * @fileoverview 异常模块导出
 * @description 导出所有异常相关的类和接口
 */

export * from "./repository.exception.js";

// 重新导出领域层仓储异常
export {
  RepositoryException,
  RepositoryOperationFailedException,
  EntityNotFoundException,
  EntityAlreadyExistsException,
  RepositoryConnectionException,
  RepositoryTransactionException,
  RepositoryQueryException,
  RepositoryConfigurationException,
} from "@hl8/domain-kernel";
