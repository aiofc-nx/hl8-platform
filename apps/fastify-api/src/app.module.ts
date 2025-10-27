import { Module } from "@nestjs/common";
import { TypedConfigModule, fileLoader, dotenvLoader } from "@hl8/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UsersModule } from "./users/users.module";
import { AppConfig } from "./config/app.config";
import { ConfigHealthController } from "./config/config-health.controller";

/**
 * 应用主模块
 * @description 应用的根模块，导入所有功能模块
 */
@Module({
  imports: [
    TypedConfigModule.forRoot({
      schema: AppConfig,
      load: [
        fileLoader({ path: "./config/app.yml" }),
        dotenvLoader({ separator: "__" }),
      ],
    }),
    UsersModule,
  ],
  controllers: [AppController, ConfigHealthController],
  providers: [AppService],
})
export class AppModule {}
