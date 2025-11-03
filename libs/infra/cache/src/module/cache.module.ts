/**
 * @fileoverview CacheModule - 提供缓存服务的 NestJS 模块
 */

import { DynamicModule, Global, Module, Provider } from "@nestjs/common";
import { TypedConfigModule, fileLoader } from "@hl8/config";
import { LoggerModule, Logger } from "@hl8/logger";
import { ClsModule } from "nestjs-cls";
import { InMemoryCache } from "../implementations/in-memory-cache.js";
import type { ICache, CacheConfig } from "../cache.interface.js";

@Global()
@Module({})
export class CacheModule {
  /**
   * 同步注册
   */
  static forRoot(configClass: new () => CacheConfig): DynamicModule {
    const providers: Provider[] = [
      {
        provide: "CacheService",
        useFactory: (config: CacheConfig, logger: Logger): ICache => {
          return new InMemoryCache(config, logger);
        },
        inject: [configClass, Logger],
      },
    ];

    return {
      global: true,
      module: CacheModule,
      imports: [
        TypedConfigModule.forRoot({ schema: configClass, load: fileLoader() }),
        LoggerModule.forRoot(),
        ClsModule.forRoot(),
      ],
      providers,
      exports: providers,
    };
  }
}
