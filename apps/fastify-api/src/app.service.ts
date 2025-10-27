import { Injectable, Inject } from "@nestjs/common";
import { AppConfig } from "./config/app.config";

/**
 * 应用主服务
 * @description 提供应用的核心业务逻辑
 */
@Injectable()
export class AppService {
  constructor(@Inject(AppConfig) private readonly config: AppConfig) {}

  /**
   * 获取欢迎信息
   * @returns 欢迎消息字符串
   */
  getHello(): string {
    return `Hello World! 欢迎使用 ${this.config.app.name} v${this.config.app.version}！`;
  }

  /**
   * 获取应用健康状态
   * @returns 健康状态信息对象
   */
  getHealth(): {
    status: string;
    timestamp: string;
    config: Record<string, unknown>;
  } {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      config: {
        app: {
          name: this.config.app.name,
          version: this.config.app.version,
          environment: this.config.app.environment,
          debug: this.config.app.debug,
        },
        server: {
          port: this.config.server.port,
          host: this.config.server.host,
        },
        database: {
          host: this.config.database.host,
          port: this.config.database.port,
          database: this.config.database.database,
        },
      },
    };
  }

  /**
   * 获取数据库连接信息
   * @returns 数据库连接信息字符串
   */
  getDatabaseInfo(): string {
    return `Database: ${this.config.database.host}:${this.config.database.port}/${this.config.database.database}`;
  }
}
