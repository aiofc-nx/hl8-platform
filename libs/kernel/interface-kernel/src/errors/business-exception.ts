import { DomainException } from "./domain-exception.js";

/**
 * @title BusinessException
 * @description 业务异常（契约层），用于表达可预期的业务规则违反
 * @remarks
 * - 典型场景：参数校验失败、权限不足、资源状态不允许操作等。
 * - 属于领域异常的一种具体化，便于上层进行差异化处理（如返回400/403）。
 *
 * @example
 * throw new BusinessException("VALIDATION_FAILED", "参数校验失败", { field: "price" });
 */
export class BusinessException extends DomainException {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
    this.name = "BusinessException";
  }
}


