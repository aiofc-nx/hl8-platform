/**
 * @fileoverview 命令查询总线实现单元测试
 * @description 测试CommandQueryBusImpl类的功能
 */

import { Test, TestingModule } from "@nestjs/testing";
import { CqrsModule, CommandBus, QueryBus } from "@nestjs/cqrs";
import { CommandQueryBusImpl } from "./command-query-bus.impl.js";
import {
  ICommandQueryBus,
  CommandHandler,
  QueryHandler,
} from "./command-query-bus.interface.js";
import { BaseCommand } from "../commands/base/command.base.js";
import { BaseQuery } from "../queries/base/query.base.js";
import { CommandResult } from "../commands/base/command-result.js";
import { QueryResult } from "../queries/base/query-result.js";
import { EntityId } from "@hl8/domain-kernel";
import { Logger } from "@hl8/logger";

/**
 * 测试命令类
 */
class TestCommand extends BaseCommand {
  constructor(
    public readonly data: { name: string },
    userId?: string,
    correlationId?: string,
  ) {
    super("test-aggregate-id", "TestCommand", { userId, correlationId });
  }

  public clone(): TestCommand {
    return new TestCommand(this.data, this.userId, this.correlationId);
  }
}

/**
 * 测试查询类
 */
class TestQuery extends BaseQuery {
  constructor(
    public readonly filters: { name?: string },
    userId?: string,
    correlationId?: string,
  ) {
    super("TestQuery", { userId, correlationId });
  }

  public clone(): TestQuery {
    return new TestQuery(this.filters, this.userId, this.correlationId);
  }
}

/**
 * 测试命令处理器
 */
class TestCommandHandler implements CommandHandler {
  private shouldThrowError = false;
  private processingTime = 0;

  constructor(public readonly handlerName: string = "TestCommandHandler") {}

  public setShouldThrowError(shouldThrow: boolean): void {
    this.shouldThrowError = shouldThrow;
  }

  public setProcessingTime(time: number): void {
    this.processingTime = time;
  }

  public async handle(command: BaseCommand): Promise<CommandResult> {
    const startTime = Date.now();

    if (this.shouldThrowError) {
      throw new Error("模拟处理器错误");
    }

    // 模拟处理时间
    if (this.processingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.processingTime));
    }

    return CommandResult.success({
      processed: true,
      commandType: command.commandType,
    });
  }

  public getHandlerName(): string {
    return this.handlerName;
  }

  public getDescription(): string {
    return "测试命令处理器";
  }

  public getVersion(): string {
    return "1.0.0";
  }

  public isAvailable(): boolean {
    return true;
  }

  public getSupportedCommandTypes(): string[] {
    return ["TestCommand"];
  }
}

/**
 * 测试查询处理器
 */
class TestQueryHandler implements QueryHandler {
  private shouldThrowError = false;
  private processingTime = 0;

  constructor(public readonly handlerName: string = "TestQueryHandler") {}

  public setShouldThrowError(shouldThrow: boolean): void {
    this.shouldThrowError = shouldThrow;
  }

  public setProcessingTime(time: number): void {
    this.processingTime = time;
  }

  public async handle(query: BaseQuery): Promise<QueryResult> {
    const startTime = Date.now();

    if (this.shouldThrowError) {
      throw new Error("模拟处理器错误");
    }

    // 模拟处理时间
    if (this.processingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.processingTime));
    }

    return QueryResult.success([{ id: 1, name: "Test Item" }]);
  }

  public getHandlerName(): string {
    return this.handlerName;
  }

  public getDescription(): string {
    return "测试查询处理器";
  }

  public getVersion(): string {
    return "1.0.0";
  }

  public isAvailable(): boolean {
    return true;
  }

  public getSupportedQueryTypes(): string[] {
    return ["TestQuery"];
  }
}

describe("CommandQueryBusImpl", () => {
  let bus: CommandQueryBusImpl;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let module: TestingModule;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    module = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        CommandQueryBusImpl,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    bus = module.get<CommandQueryBusImpl>(CommandQueryBusImpl);
    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);
  });

  afterEach(async () => {
    await module.close();
  });

  describe("构造函数", () => {
    it("应该正确初始化总线", () => {
      expect(bus).toBeDefined();
      expect(bus.isRunning()).toBe(false);
    });
  });

  describe("start和stop", () => {
    it("应该能够启动和停止总线", async () => {
      await bus.start();
      expect(bus.isRunning()).toBe(true);

      await bus.stop();
      expect(bus.isRunning()).toBe(false);
    });
  });

  describe("executeCommand", () => {
    it("应该成功执行命令", async () => {
      const commandHandler = new TestCommandHandler();
      await bus.registerCommandHandler("TestCommand", commandHandler);

      const command = new TestCommand({ name: "Test" });
      const result = await bus.executeCommand(command);

      if (!result.success) {
        console.error("Command failed:", result.message, result.errorCode);
      }
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          data: { processed: true, commandType: "TestCommand" },
        }),
      );
      expect(result.data).toEqual({
        processed: true,
        commandType: "TestCommand",
      });
    });

    it("应该处理未找到处理器的情况", async () => {
      const command = new TestCommand({ name: "Test" });
      const result = await bus.executeCommand(command);

      expect(result.success).toBe(false);
      expect(result.message).toContain("未找到命令处理器");
      expect(result.errorCode).toBe("HANDLER_NOT_FOUND");
    });

    it("应该处理处理器错误", async () => {
      const commandHandler = new TestCommandHandler();
      commandHandler.setShouldThrowError(true);
      await bus.registerCommandHandler("TestCommand", commandHandler);

      const command = new TestCommand({ name: "Test" });
      const result = await bus.executeCommand(command);

      expect(result.success).toBe(false);
      expect(result.message).toContain("模拟处理器错误");
      expect(result.errorCode).toBe("EXECUTION_ERROR");
    });
  });

  describe("executeQuery", () => {
    it("应该成功执行查询", async () => {
      const queryHandler = new TestQueryHandler();
      await bus.registerQueryHandler("TestQuery", queryHandler);

      const query = new TestQuery({ name: "Test" });
      const result = await bus.executeQuery(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1, name: "Test Item" }]);
    });

    it("应该处理未找到处理器的情况", async () => {
      const query = new TestQuery({ name: "Test" });
      const result = await bus.executeQuery(query);

      expect(result.success).toBe(false);
      expect(result.message).toContain("未找到查询处理器");
      expect(result.errorCode).toBe("HANDLER_NOT_FOUND");
    });

    it("应该处理处理器错误", async () => {
      const queryHandler = new TestQueryHandler();
      queryHandler.setShouldThrowError(true);
      await bus.registerQueryHandler("TestQuery", queryHandler);

      const query = new TestQuery({ name: "Test" });
      const result = await bus.executeQuery(query);

      expect(result.success).toBe(false);
      expect(result.message).toContain("模拟处理器错误");
      expect(result.errorCode).toBe("EXECUTION_ERROR");
    });
  });

  describe("registerCommandHandler", () => {
    it("应该成功注册命令处理器", async () => {
      const commandHandler = new TestCommandHandler();
      const result = await bus.registerCommandHandler(
        "TestCommand",
        commandHandler,
      );

      expect(result).toBe(true);

      const handlers = await bus.getCommandHandlers();
      expect(handlers).toHaveLength(1);
      expect(handlers[0].commandType).toBe("TestCommand");
      expect(handlers[0].handlerName).toBe("TestCommandHandler");
    });
  });

  describe("registerQueryHandler", () => {
    it("应该成功注册查询处理器", async () => {
      const queryHandler = new TestQueryHandler();
      const result = await bus.registerQueryHandler("TestQuery", queryHandler);

      expect(result).toBe(true);

      const handlers = await bus.getQueryHandlers();
      expect(handlers).toHaveLength(1);
      expect(handlers[0].queryType).toBe("TestQuery");
      expect(handlers[0].handlerName).toBe("TestQueryHandler");
    });
  });

  describe("unregisterCommandHandler", () => {
    it("应该成功取消注册命令处理器", async () => {
      const commandHandler = new TestCommandHandler();
      await bus.registerCommandHandler("TestCommand", commandHandler);

      const result = await bus.unregisterCommandHandler("TestCommand");
      expect(result).toBe(true);

      const handlers = await bus.getCommandHandlers();
      expect(handlers).toHaveLength(0);
    });

    it("应该处理不存在的处理器", async () => {
      const result = await bus.unregisterCommandHandler("NonExistentCommand");
      expect(result).toBe(false);
    });
  });

  describe("unregisterQueryHandler", () => {
    it("应该成功取消注册查询处理器", async () => {
      const queryHandler = new TestQueryHandler();
      await bus.registerQueryHandler("TestQuery", queryHandler);

      const result = await bus.unregisterQueryHandler("TestQuery");
      expect(result).toBe(true);

      const handlers = await bus.getQueryHandlers();
      expect(handlers).toHaveLength(0);
    });

    it("应该处理不存在的处理器", async () => {
      const result = await bus.unregisterQueryHandler("NonExistentQuery");
      expect(result).toBe(false);
    });
  });

  describe("getStatistics", () => {
    it("应该返回统计信息", async () => {
      const stats = await bus.getStatistics();

      expect(stats).toEqual({
        totalCommandsExecuted: 0,
        totalQueriesExecuted: 0,
        totalCommandsSuccessful: 0,
        totalQueriesSuccessful: 0,
        totalCommandsFailed: 0,
        totalQueriesFailed: 0,
        averageCommandProcessingTime: 0,
        averageQueryProcessingTime: 0,
        commandSuccessRate: 0,
        querySuccessRate: 0,
        registeredCommandHandlers: 0,
        registeredQueryHandlers: 0,
        byCommandType: {},
        byQueryType: {},
        byHandler: {},
        lastUpdated: expect.any(Date),
      });
    });

    it("应该更新统计信息", async () => {
      const commandHandler = new TestCommandHandler();
      await bus.registerCommandHandler("TestCommand", commandHandler);

      const command = new TestCommand({ name: "Test" });
      await bus.executeCommand(command);

      const stats = await bus.getStatistics();
      expect(stats.totalCommandsExecuted).toBe(1);
      expect(stats.totalCommandsSuccessful).toBe(1);
      expect(stats.registeredCommandHandlers).toBe(1);
      expect(stats.byCommandType["TestCommand"]).toBeDefined();
      expect(stats.byCommandType["TestCommand"].executed).toBe(1);
      expect(stats.byCommandType["TestCommand"].successful).toBe(1);
    });
  });

  describe("中间件", () => {
    it("应该能够添加和移除中间件", () => {
      const mockMiddleware = {
        getName: () => "TestMiddleware",
        getDescription: () => "测试中间件",
        getVersion: () => "1.0.0",
        getPriority: () => 100,
      } as any;

      bus.addMiddleware(mockMiddleware);
      bus.removeMiddleware("TestMiddleware");
    });
  });

  describe("配置", () => {
    it("应该使用默认配置", () => {
      expect(bus).toBeDefined();
    });

    it("应该使用自定义配置", () => {
      const customConfig = {
        maxConcurrency: 20,
        executionTimeout: 60000,
        enablePerformanceMonitoring: false,
        performanceMonitoringSamplingRate: 0.05,
        enableMiddleware: false,
        middlewareOrder: [],
        enableRetry: false,
        maxRetries: 5,
        retryDelay: 2000,
        enableCaching: false,
        cacheExpirationTime: 600000,
      };

      const customBus = new CommandQueryBusImpl(
        mockLogger,
        commandBus,
        queryBus,
        customConfig,
      );
      expect(customBus).toBeDefined();
    });
  });

  describe("错误处理", () => {
    it("应该处理处理器不可用的情况", async () => {
      const commandHandler = new TestCommandHandler();
      // 模拟处理器不可用
      jest.spyOn(commandHandler, "isAvailable").mockReturnValue(false);
      await bus.registerCommandHandler("TestCommand", commandHandler);

      const command = new TestCommand({ name: "Test" });
      const result = await bus.executeCommand(command);

      expect(result.success).toBe(false);
      expect(result.message).toContain("命令处理器不可用");
      expect(result.errorCode).toBe("HANDLER_UNAVAILABLE");
    });
  });
});
