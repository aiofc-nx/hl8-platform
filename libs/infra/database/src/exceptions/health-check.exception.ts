/**
 * 健康检查异常
 *
 * @description 数据库健康检查失败时抛出的异常
 *
 * @since 1.0.0
 */

import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * 健康检查异常
 *
 * @description 当数据库健康检查失败时抛出此异常
 * 包含健康检查的详细信息和状态
 */
export class HealthCheckException extends HttpException {
  constructor(
    message: string,
    public readonly healthStatus: "unhealthy" | "degraded",
    public readonly details?: any,
  ) {
    super(
      {
        message,
        healthStatus,
        details,
        timestamp: new Date().toISOString(),
      },
      healthStatus === "unhealthy"
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.OK,
    );
  }
}
