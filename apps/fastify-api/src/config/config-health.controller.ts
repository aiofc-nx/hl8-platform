/**
 * 配置健康检查控制器
 *
 * @description 提供配置模块的健康状态检查和监控功能
 */

import { Controller, Get, Inject } from "@nestjs/common";
import { AppConfig } from "./app.config";

/**
 * 配置健康检查响应接口
 */
interface ConfigHealthResponse {
  status: "healthy" | "unhealthy";
  message: string;
  configLoaded: boolean;
  validationPassed: boolean;
  lastValidated: string;
  app?: {
    name: string;
    version: string;
    environment: string;
  };
  errors?: Array<{
    field: string;
    message: string;
    value: unknown;
  }>;
}

/**
 * 配置健康检查控制器
 * @description 提供配置模块的健康状态检查端点
 */
@Controller("health")
export class ConfigHealthController {
  constructor(@Inject(AppConfig) private readonly config: AppConfig) {}

  /**
   * 获取配置健康状态
   * @returns 配置健康状态信息
   */
  @Get("config")
  getConfigHealth(): ConfigHealthResponse {
    try {
      // 检查配置是否已加载
      const configLoaded = !!(
        this.config &&
        this.config.app &&
        this.config.database &&
        this.config.server &&
        this.config.logging
      );

      // 检查配置验证是否通过
      const validationPassed = this.validateConfig();

      const response: ConfigHealthResponse = {
        status: configLoaded && validationPassed ? "healthy" : "unhealthy",
        message:
          configLoaded && validationPassed
            ? "Configuration loaded successfully"
            : "Configuration validation failed",
        configLoaded,
        validationPassed,
        lastValidated: new Date().toISOString(),
      };

      // 如果配置已加载，添加应用信息
      if (configLoaded) {
        response.app = {
          name: this.config.app.name,
          version: this.config.app.version,
          environment: this.config.app.environment,
        };
      }

      return response;
    } catch (error) {
      return {
        status: "unhealthy",
        message: `Configuration error: ${error instanceof Error ? error.message : "Unknown error"}`,
        configLoaded: false,
        validationPassed: false,
        lastValidated: new Date().toISOString(),
        errors: [
          {
            field: "unknown",
            message: error instanceof Error ? error.message : "Unknown error",
            value: null,
          },
        ],
      };
    }
  }

  /**
   * 验证配置完整性
   * @returns 配置验证是否通过
   */
  private validateConfig(): boolean {
    try {
      // 检查必需的配置项
      if (
        !this.config.app?.name ||
        !this.config.app?.version ||
        !this.config.app?.environment
      ) {
        return false;
      }

      if (
        !this.config.database?.host ||
        !this.config.database?.port ||
        !this.config.database?.username ||
        !this.config.database?.password ||
        !this.config.database?.database
      ) {
        return false;
      }

      if (
        !this.config.server?.port ||
        !this.config.server?.host ||
        !this.config.server?.cors
      ) {
        return false;
      }

      if (
        !this.config.logging?.level ||
        !this.config.logging?.format ||
        !this.config.logging?.output
      ) {
        return false;
      }

      // 检查端口范围
      if (this.config.database.port < 1 || this.config.database.port > 65535) {
        return false;
      }

      if (this.config.server.port < 1 || this.config.server.port > 65535) {
        return false;
      }

      // 检查环境值
      const validEnvironments = ["development", "staging", "production"];
      if (!validEnvironments.includes(this.config.app.environment)) {
        return false;
      }

      // 检查日志级别
      const validLogLevels = ["error", "warn", "info", "debug"];
      if (!validLogLevels.includes(this.config.logging.level)) {
        return false;
      }

      // 检查日志格式
      const validLogFormats = ["json", "text"];
      if (!validLogFormats.includes(this.config.logging.format)) {
        return false;
      }

      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * 获取配置摘要信息
   * @returns 配置摘要信息
   */
  @Get("config/summary")
  getConfigSummary() {
    return {
      app: {
        name: this.config.app.name,
        version: this.config.app.version,
        environment: this.config.app.environment,
        debug: this.config.app.debug,
      },
      server: {
        port: this.config.server.port,
        host: this.config.server.host,
        corsEnabled: this.config.server.cors.enabled,
      },
      database: {
        host: this.config.database.host,
        port: this.config.database.port,
        database: this.config.database.database,
        ssl: this.config.database.ssl,
      },
      logging: {
        level: this.config.logging.level,
        format: this.config.logging.format,
        output: this.config.logging.output,
      },
    };
  }
}
