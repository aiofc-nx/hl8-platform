/**
 * @fileoverview 验证手机号命令
 * @description 用户手机号验证命令，包含用户ID和验证码
 */

import { BaseCommand } from "@hl8/application-kernel";
import { IsNotEmpty, IsString } from "class-validator";

/**
 * 验证手机号命令结果
 */
export interface VerifyPhoneCommandResult {
  /** 用户ID */
  userId: string;
  /** 是否验证成功 */
  verified: boolean;
  /** 验证时间 */
  verifiedAt: Date;
}

/**
 * 验证手机号命令
 * @description 用于验证用户手机号的命令
 */
export class VerifyPhoneCommand extends BaseCommand<VerifyPhoneCommandResult> {
  /** 验证码 */
  @IsNotEmpty()
  @IsString()
  public readonly code: string;

  /**
   * 创建验证手机号命令
   * @param userId 用户ID（作为aggregateId）
   * @param code 验证码
   * @param options 命令选项
   */
  constructor(
    userId: string,
    code: string,
    options: {
      commandId?: string;
      correlationId?: string;
      timestamp?: Date;
      version?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ) {
    super(userId, "VerifyPhone", options);
    this.code = code;
  }

  /**
   * 克隆命令对象
   * @returns 新的命令对象实例
   */
  public clone(): VerifyPhoneCommand {
    return new VerifyPhoneCommand(this.userId, this.code, {
      commandId: this.commandId,
      correlationId: this.correlationId,
      timestamp: this.timestamp,
      version: this.version,
      metadata: this.metadata ? { ...this.metadata } : undefined,
    });
  }
}
