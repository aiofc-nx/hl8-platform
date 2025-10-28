/**
 * @fileoverview 用例输入基类
 * @description 提供用例输入的基础功能和验证
 */

import {
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  validate,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { UseCaseValidationException } from "../../exceptions/use-case/use-case-validation-exception.js";

/**
 * 用例输入基类
 * @description 所有用例输入都应该继承此类
 */
export abstract class UseCaseInput {
  /** 关联ID，用于追踪请求 */
  @IsOptional()
  @IsNotEmpty()
  public correlationId?: string;

  /** 用户ID，用于权限控制 */
  @IsOptional()
  @IsNotEmpty()
  public userId?: string;

  /** 请求时间戳 */
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  public timestamp: Date = new Date();

  /** 请求元数据 */
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  public metadata?: Record<string, unknown>;

  /**
   * 验证输入数据
   * @returns Promise<void>
   * @throws UseCaseValidationException 验证失败时抛出
   */
  public async validate(): Promise<void> {
    const errors = await validate(this);

    if (errors.length > 0) {
      const validationErrors = errors.map((error) => {
        const constraints = Object.values(error.constraints || {});
        return `${error.property}: ${constraints.join(", ")}`;
      });

      throw new UseCaseValidationException(
        "用例输入验证失败",
        this.constructor.name,
        this,
        validationErrors,
        {
          inputType: this.constructor.name,
          validationErrors,
        },
      );
    }
  }

  /**
   * 获取输入摘要
   * @returns 输入摘要
   */
  public getSummary(): Record<string, unknown> {
    return {
      type: this.constructor.name,
      correlationId: this.correlationId,
      userId: this.userId,
      timestamp: this.timestamp,
      hasMetadata: !!this.metadata,
    };
  }

  /**
   * 序列化输入数据
   * @returns 序列化后的数据
   */
  public toJSON(): Record<string, unknown> {
    return {
      correlationId: this.correlationId,
      userId: this.userId,
      timestamp: this.timestamp?.toISOString(),
      metadata: this.metadata,
    };
  }

  /**
   * 克隆输入对象
   * @returns 新的输入对象实例
   */
  public abstract clone(): UseCaseInput;
}
