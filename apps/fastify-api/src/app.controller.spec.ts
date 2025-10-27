import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AppConfig } from "./config/app.config";

describe("AppController", () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const mockConfig: AppConfig = {
      app: {
        name: "test-app",
        version: "1.0.0",
        environment: "test",
        debug: true,
      },
      database: {
        host: "localhost",
        port: 5432,
        username: "test",
        password: "test",
        database: "test",
        ssl: false,
      },
      server: {
        port: 3000,
        host: "localhost",
        cors: {
          enabled: true,
          origins: ["http://localhost:3000"],
          methods: ["GET", "POST"],
          credentials: false,
        },
      },
      logging: {
        level: "info",
        format: "json",
        output: ["console"],
      },
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: AppConfig,
          useValue: mockConfig,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe("getHello", () => {
    it("应该返回欢迎信息", () => {
      expect(appController.getHello()).toContain("test-app");
      expect(appController.getHello()).toContain("1.0.0");
    });
  });

  describe("getHealth", () => {
    it("应该返回健康状态", () => {
      const result = appController.getHealth();
      expect(result).toHaveProperty("status", "ok");
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("config");
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });
  });
});
