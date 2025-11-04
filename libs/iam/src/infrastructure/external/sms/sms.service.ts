/**
 * @fileoverview 短信服务实现
 * @description 实现短信发送服务，包含重试机制
 */

import { Injectable } from "@nestjs/common";
import { Logger } from "@hl8/logger";
import type {
  ISmsService,
  SmsSendOptions,
  SmsSendResult,
} from "./sms.service.interface.js";
import { retryWithExponentialBackoff } from "../utils/retry.util.js";

/**
 * 短信服务实现
 * @description 实现短信发送功能，支持重试机制
 * @note 当前为临时实现，生产环境需要集成实际的短信服务（如阿里云、腾讯云、Twilio 等）
 */
@Injectable()
export class SmsService implements ISmsService {
  constructor(private readonly logger: Logger) {}

  /**
   * 发送短信
   * @param options 短信发送选项
   * @returns 发送结果
   */
  async sendSms(options: SmsSendOptions): Promise<SmsSendResult> {
    return retryWithExponentialBackoff(
      async () => {
        return this.doSendSms(options);
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
   * 实际发送短信的逻辑
   * @param options 短信发送选项
   * @returns 发送结果
   */
  private async doSendSms(options: SmsSendOptions): Promise<SmsSendResult> {
    try {
      // TODO: 集成实际的短信服务提供商
      // 当前为临时实现，仅记录日志
      this.logger.log("发送短信", {
        to: options.to,
        content: options.content.substring(0, 50) + "...",
      });

      // 模拟发送延迟
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 临时实现：生成模拟的消息ID
      const messageId = `sms_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("短信发送失败", {
        to: options.to,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 发送验证码短信
   * @param to 收件人手机号
   * @param code 验证码
   * @returns 发送结果
   */
  async sendVerificationCode(to: string, code: string): Promise<SmsSendResult> {
    const content = `您的验证码是：${code}，验证码有效期为10分钟，请勿泄露给他人。`;

    return this.sendSms({
      to,
      content,
    });
  }
}
