import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe("getHello", () => {
    it("应该返回欢迎信息", () => {
      expect(appController.getHello()).toBe(
        "Hello World! 欢迎使用 NestJS + Fastify API 服务！",
      );
    });
  });

  describe("getHealth", () => {
    it("应该返回健康状态", () => {
      const result = appController.getHealth();
      expect(result).toHaveProperty("status", "ok");
      expect(result).toHaveProperty("timestamp");
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });
  });
});
