/**
 * @fileoverview 短信服务接口
 * @description 定义发送短信的抽象接口
 */

/**
 * 短信发送选项
 */
export interface SmsSendOptions {
  /** 收件人手机号 */
  to: string;
  /** 短信内容 */
  content: string;
  /** 短信模板ID（可选，用于模板短信） */
  templateId?: string;
  /** 模板参数（可选，用于模板短信） */
  templateParams?: Record<string, string>;
}

/**
 * 短信发送结果
 */
export interface SmsSendResult {
  /** 是否发送成功 */
  success: boolean;
  /** 消息ID（如果发送成功） */
  messageId?: string;
  /** 错误信息（如果发送失败） */
  error?: string;
}

/**
 * 短信服务接口
 * @description 提供发送短信的抽象接口，支持验证码短信、通知短信等
 */
export interface ISmsService {
  /**
   * 发送短信
   * @param options 短信发送选项
   * @returns 发送结果
   * @throws {Error} 当发送失败时抛出异常
   */
  sendSms(options: SmsSendOptions): Promise<SmsSendResult>;

  /**
   * 发送验证码短信
   * @param to 收件人手机号
   * @param code 验证码
   * @returns 发送结果
   */
  sendVerificationCode(to: string, code: string): Promise<SmsSendResult>;
}
