/**
 * 配置模块导出
 *
 * @description 统一导出所有配置相关的类和类型
 */

// 主配置类
export { AppConfig } from "./app.config";

// 配置节类
export {
  AppConfigSection,
  DatabaseConfig,
  ServerConfig,
  LoggingConfig,
} from "./app.config";

// 独立配置类
export { DatabaseConfig as DatabaseConfigClass } from "./database.config";
export { ServerConfig as ServerConfigClass } from "./server.config";
export { CorsConfig } from "./cors.config";
export { LoggingConfig as LoggingConfigClass } from "./logging.config";
