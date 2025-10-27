import { Injectable } from "@nestjs/common";

/**
 * 应用主服务
 * @description 提供应用的核心业务逻辑
 */
@Injectable()
export class AppService {
  /**
   * 获取欢迎信息
   * @returns 欢迎消息字符串
   */
  getHello(): string {
    return "Hello World! 欢迎使用 NestJS + Fastify API 服务！";
  }

  /**
   * 获取应用健康状态
   * @returns 健康状态信息对象
   */
  getHealth(): { status: string; timestamp: string } {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
