/**
 * @title DomainException
 * @description 领域异常基类（契约层）
 * @remarks
 * - 该类型用于表达领域层不可恢复或需要上层感知的业务异常。
 * - 不依赖任何框架类型，保证契约的传输无关性。
 *
 * @example
 * throw new DomainException("INVALID_STATE", "聚合状态不合法");
 */
export class DomainException extends Error {
  /** 异常代码（用于程序化处理与文档化） */
  public readonly code: string;

  /** 附加细节（可序列化） */
  public readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "DomainException";
    this.code = code;
    this.details = details;
  }
}


