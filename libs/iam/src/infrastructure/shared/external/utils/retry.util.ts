/**
 * @fileoverview 重试工具函数
 * @description 提供指数退避重试机制的工具函数
 */

import { Logger } from "@hl8/logger";

/**
 * 重试配置选项
 */
export interface RetryOptions {
  /** 最大重试次数 */
  maxRetries: number;
  /** 初始延迟时间（毫秒） */
  initialDelay: number;
  /** 最大延迟时间（毫秒） */
  maxDelay: number;
  /** 可重试的错误类型（错误名称或消息关键词） */
  retryableErrors?: string[];
}

/**
 * 使用指数退避算法重试执行函数
 * @param fn 要执行的异步函数
 * @param options 重试配置选项
 * @param logger 日志记录器（可选）
 * @returns 函数执行结果
 * @throws {Error} 当所有重试都失败时抛出最后一个错误
 */
export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  logger?: Logger,
): Promise<T> {
  const { maxRetries, initialDelay, maxDelay, retryableErrors = [] } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 检查是否应该重试
      if (attempt === maxRetries) {
        // 已达到最大重试次数
        break;
      }

      // 检查错误是否可重试
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : "";
      const shouldRetry =
        retryableErrors.length === 0 ||
        retryableErrors.some(
          (retryableError) =>
            errorMessage.includes(retryableError) ||
            errorName.includes(retryableError),
        );

      if (!shouldRetry) {
        // 错误不可重试，直接抛出
        throw error;
      }

      // 记录重试日志
      if (logger) {
        logger.warn("操作失败，准备重试", {
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: errorMessage,
        });
      }

      // 等待后重试（指数退避）
      await new Promise((resolve) => setTimeout(resolve, delay));

      // 计算下一次延迟时间（指数退避，但不超过最大延迟）
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  // 所有重试都失败，抛出最后一个错误
  const errorMessage =
    lastError instanceof Error ? lastError.message : String(lastError);
  const finalError = new Error(
    `操作失败，已重试 ${maxRetries} 次：${errorMessage}`,
  );
  if (lastError instanceof Error && lastError.stack) {
    finalError.stack = lastError.stack;
  }
  throw finalError;
}
