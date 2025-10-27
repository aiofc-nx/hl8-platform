import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";

/**
 * 应用主控制器
 * @description 提供应用的基础 API 端点
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * 获取欢迎信息
   * @returns 欢迎消息字符串
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * 获取应用健康状态
   * @returns 健康状态信息
   */
  @Get("health")
  getHealth(): { status: string; timestamp: string } {
    return this.appService.getHealth();
  }
}
