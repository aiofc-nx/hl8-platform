/**
 * @fileoverview 邮件服务接口
 * @description 定义发送邮件的抽象接口
 */

/**
 * 邮件发送选项
 */
export interface EmailSendOptions {
  /** 收件人邮箱 */
  to: string;
  /** 邮件主题 */
  subject: string;
  /** 邮件正文（HTML格式） */
  html?: string;
  /** 邮件正文（纯文本格式） */
  text?: string;
  /** 发件人邮箱（可选） */
  from?: string;
  /** 抄送列表 */
  cc?: string[];
  /** 密送列表 */
  bcc?: string[];
}

/**
 * 邮件发送结果
 */
export interface EmailSendResult {
  /** 是否发送成功 */
  success: boolean;
  /** 消息ID（如果发送成功） */
  messageId?: string;
  /** 错误信息（如果发送失败） */
  error?: string;
}

/**
 * 邮件服务接口
 * @description 提供发送邮件的抽象接口，支持验证码邮件、通知邮件等
 */
export interface IEmailService {
  /**
   * 发送邮件
   * @param options 邮件发送选项
   * @returns 发送结果
   * @throws {Error} 当发送失败时抛出异常
   */
  sendEmail(options: EmailSendOptions): Promise<EmailSendResult>;

  /**
   * 发送验证码邮件
   * @param to 收件人邮箱
   * @param code 验证码
   * @returns 发送结果
   */
  sendVerificationCode(to: string, code: string): Promise<EmailSendResult>;
}
