/**
 * @fileoverview 邮件服务实现
 * @description 实现邮件发送服务，包含重试机制
 */

import { Injectable } from "@nestjs/common";
import { Logger } from "@hl8/logger";
import type {
  IEmailService,
  EmailSendOptions,
  EmailSendResult,
} from "./email.service.interface.js";
import { retryWithExponentialBackoff } from "../utils/retry.util.js";

/**
 * 邮件服务实现
 * @description 实现邮件发送功能，支持重试机制
 * @note 当前为临时实现，生产环境需要集成实际的邮件服务（如 SendGrid、AWS SES 等）
 */
@Injectable()
export class EmailService implements IEmailService {
  private readonly defaultFrom: string;

  constructor(
    private readonly logger: Logger,
    defaultFrom?: string,
  ) {
    this.defaultFrom = defaultFrom || "noreply@hl8.com";
  }

  /**
   * 发送邮件
   * @param options 邮件发送选项
   * @returns 发送结果
   */
  async sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    return retryWithExponentialBackoff(
      async () => {
        return this.doSendEmail(options);
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        retryableErrors: ["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND"],
      },
      this.logger,
    );
  }

  /**
   * 实际发送邮件的逻辑
   * @param options 邮件发送选项
   * @returns 发送结果
   */
  private async doSendEmail(
    options: EmailSendOptions,
  ): Promise<EmailSendResult> {
    try {
      // TODO: 集成实际的邮件服务提供商
      // 当前为临时实现，仅记录日志
      this.logger.log("发送邮件", {
        to: options.to,
        subject: options.subject,
        from: options.from || this.defaultFrom,
      });

      // 模拟发送延迟
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 临时实现：生成模拟的消息ID
      const messageId = `email_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("邮件发送失败", {
        to: options.to,
        subject: options.subject,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 发送验证码邮件
   * @param to 收件人邮箱
   * @param code 验证码
   * @returns 发送结果
   */
  async sendVerificationCode(
    to: string,
    code: string,
  ): Promise<EmailSendResult> {
    const subject = "邮箱验证码";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>邮箱验证码</h2>
        <p>您的验证码是：</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p>验证码有效期为10分钟，请勿泄露给他人。</p>
        <p style="color: #999; font-size: 12px;">如果您没有请求此验证码，请忽略此邮件。</p>
      </div>
    `;
    const text = `您的邮箱验证码是：${code}，验证码有效期为10分钟，请勿泄露给他人。`;

    return this.sendEmail({
      to,
      subject,
      html,
      text,
      from: this.defaultFrom,
    });
  }
}
