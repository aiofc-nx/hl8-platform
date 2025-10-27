import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { AppConfig } from "./config/app.config";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // 启用全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 获取配置信息
  const config = app.get<AppConfig>(AppConfig);

  // 启动应用
  await app.listen(config.server.port, config.server.host);

  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Environment: ${config.app.environment}`);
  console.log(`Debug mode: ${config.app.debug}`);
}
bootstrap();
