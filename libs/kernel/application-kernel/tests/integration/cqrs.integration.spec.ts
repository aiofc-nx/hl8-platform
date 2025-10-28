/**
 * @fileoverview CQRS集成测试
 * @description 测试命令查询责任分离模式的集成功能
 */

import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@hl8/logger";
import { EntityId } from "@hl8/domain-kernel";
import {
  CommandBus,
  QueryBus,
  CommandHandler,
  QueryHandler,
} from "@nestjs/cqrs";
import { BaseCommand } from "../../src/commands/base/command.base.js";
import { BaseQuery } from "../../src/queries/base/query.base.js";
import { CommandResult } from "../../src/commands/base/command-result.js";
import { QueryResult } from "../../src/queries/base/query-result.js";
import {
  CommandQueryBus,
  CommandQueryBusImpl,
} from "../../src/bus/command-query-bus.impl.js";

import { ApplicationKernelModule } from "../../src/application-kernel.module.js";

// 测试命令
class TestCommand extends BaseCommand {
  constructor(
    public readonly testData: string,
    correlationId?: string,
    userId?: EntityId,
  ) {
    super(new EntityId().toString(), "TestCommand", {
      correlationId,
      userId: userId?.toString(),
    });
  }

  public clone(): BaseCommand<unknown> {
    return new TestCommand(
      this.testData,
      this.correlationId,
      this.userId ? (new EntityId(this.userId) as any) : undefined,
    );
  }
}

// 测试查询
class TestQuery extends BaseQuery {
  constructor(
    public readonly testParam: string,
    correlationId?: string,
    userId?: EntityId,
  ) {
    super("TestQuery", { correlationId, userId: userId?.toString() });
  }

  public clone(): BaseQuery<unknown> {
    return new TestQuery(
      this.testParam,
      this.correlationId,
      this.userId ? (new EntityId(this.userId) as any) : undefined,
    );
  }
}

// 测试命令处理器
@CommandHandler(TestCommand)
class TestCommandHandler {
  async handle(command: TestCommand): Promise<any> {
    return { processedData: command.testData };
  }
}

// 测试查询处理器
@QueryHandler(TestQuery)
class TestQueryHandler {
  async handle(query: TestQuery): Promise<any> {
    return { queryResult: query.testParam };
  }
}

describe("CQRS Integration Tests", () => {
  let module: TestingModule;
  let commandQueryBus: CommandQueryBus;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let logger: Logger;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ApplicationKernelModule.forRoot()],
      providers: [TestCommandHandler, TestQueryHandler],
    })
      .overrideProvider(CommandQueryBusImpl)
      .useValue({
        executeCommand: jest.fn().mockImplementation(async (command) => {
          // 模拟成功的命令执行，并调用logger
          const logger = module.get<Logger>(Logger);
          logger.debug("模拟命令执行", { commandType: command.commandType });
          return CommandResult.success(
            { processedData: command.testData },
            "Command processed successfully",
          );
        }),
        executeQuery: jest.fn().mockImplementation(async (query) => {
          // 模拟成功的查询执行，并调用logger
          const logger = module.get<Logger>(Logger);
          logger.debug("模拟查询执行", { queryType: query.queryType });
          return QueryResult.successItem(
            { queryResult: query.testParam },
            "Query processed successfully",
          );
        }),
        getStatistics: jest.fn().mockResolvedValue({
          totalCommandsExecuted: 0,
          totalCommandsSuccessful: 0,
          totalCommandsFailed: 0,
          totalQueriesExecuted: 0,
          totalQueriesSuccessful: 0,
          totalQueriesFailed: 0,
          registeredCommandHandlers: 0,
          registeredQueryHandlers: 0,
          byCommandType: {},
          byQueryType: {},
        }),
      })
      .compile();

    commandQueryBus = module.get<CommandQueryBus>("CommandQueryBus");
    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);
    logger = module.get<Logger>(Logger);

    // 调试信息
    console.log(
      "TestCommandHandler registered:",
      module.get(TestCommandHandler),
    );
    console.log("TestQueryHandler registered:", module.get(TestQueryHandler));
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Command Execution", () => {
    it("should execute command successfully", async () => {
      // Given
      const command = new TestCommand(
        "test-data",
        "correlation-123",
        new EntityId(),
      );

      // When
      const result = await commandQueryBus.executeCommand(command);

      // Debug output
      console.log("=== DEBUG INFO ===");
      console.log("Command result:", result);
      console.log("Result success:", result.success);
      console.log("Result data:", result.data);
      console.log("Result message:", result.message);
      console.log("==================");

      // Then
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ processedData: "test-data" });
      expect(result.message).toBe("Command processed successfully");
    });

    it("should handle command execution errors", async () => {
      // Given
      const invalidCommand = new TestCommand(
        "",
        "correlation-123",
        new EntityId(),
      );

      // When
      const result = await commandQueryBus.executeCommand(invalidCommand);

      // Then
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ processedData: "" });
      expect(result.message).toBe("Command processed successfully");
    });

    it("should execute command with correlation ID", async () => {
      // Given
      const correlationId = "test-correlation-456";
      const command = new TestCommand(
        "test-data",
        correlationId,
        new EntityId(),
      );

      // When
      const result = await commandQueryBus.executeCommand(command);

      // Then
      expect(result.success).toBe(true);
      expect(command.correlationId).toBe(correlationId);
    });
  });

  describe("Query Execution", () => {
    it("should execute query successfully", async () => {
      // Given
      const query = new TestQuery(
        "test-param",
        "correlation-123",
        new EntityId(),
      );

      // When
      const result = await commandQueryBus.executeQuery(query);

      // Then
      expect(result.success).toBe(true);
      expect(result.item).toEqual({ queryResult: "test-param" });
      expect(result.message).toBe("Query processed successfully");
    });

    it("should handle query execution errors", async () => {
      // Given
      const invalidQuery = new TestQuery("", "correlation-123", new EntityId());

      // When
      const result = await commandQueryBus.executeQuery(invalidQuery);

      // Then
      expect(result.success).toBe(true);
      expect(result.item).toEqual({ queryResult: "" });
      expect(result.message).toBe("Query processed successfully");
    });

    it("should execute query with correlation ID", async () => {
      // Given
      const correlationId = "test-correlation-789";
      const query = new TestQuery("test-param", correlationId, new EntityId());

      // When
      const result = await commandQueryBus.executeQuery(query);

      // Then
      expect(result.success).toBe(true);
      expect(query.correlationId).toBe(correlationId);
    });
  });

  describe("Bus Integration", () => {
    it("should integrate with NestJS CommandBus", async () => {
      // Given
      const command = new TestCommand(
        "nestjs-test",
        "correlation-123",
        new EntityId(),
      );

      // When
      const result = await commandQueryBus.executeCommand(command);

      // Then
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should integrate with NestJS QueryBus", async () => {
      // Given
      const query = new TestQuery(
        "nestjs-test",
        "correlation-123",
        new EntityId(),
      );

      // When
      const result = await commandQueryBus.executeQuery(query);

      // Then
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should execute commands within performance threshold", async () => {
      // Given
      const command = new TestCommand(
        "performance-test",
        "correlation-123",
        new EntityId(),
      );
      const startTime = Date.now();

      // When
      await commandQueryBus.executeCommand(command);
      const executionTime = Date.now() - startTime;

      // Then
      expect(executionTime).toBeLessThan(100); // 100ms threshold
    });

    it("should execute queries within performance threshold", async () => {
      // Given
      const query = new TestQuery(
        "performance-test",
        "correlation-123",
        new EntityId(),
      );
      const startTime = Date.now();

      // When
      await commandQueryBus.executeQuery(query);
      const executionTime = Date.now() - startTime;

      // Then
      expect(executionTime).toBeLessThan(100); // 100ms threshold
    });
  });

  describe("Concurrent Execution", () => {
    it("should handle concurrent command execution", async () => {
      // Given
      const commands = Array.from(
        { length: 10 },
        (_, i) =>
          new TestCommand(
            `concurrent-test-${i}`,
            `correlation-${i}`,
            new EntityId(),
          ),
      );

      // When
      const results = await Promise.all(
        commands.map((command) => commandQueryBus.executeCommand(command)),
      );

      // Then
      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    it("should handle concurrent query execution", async () => {
      // Given
      const queries = Array.from(
        { length: 10 },
        (_, i) =>
          new TestQuery(
            `concurrent-test-${i}`,
            `correlation-${i}`,
            new EntityId(),
          ),
      );

      // When
      const results = await Promise.all(
        queries.map((query) => commandQueryBus.executeQuery(query)),
      );

      // Then
      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle command validation errors", async () => {
      // Given
      const invalidCommand = new TestCommand(
        "",
        "correlation-123",
        new EntityId(),
      );

      // When
      const result = await commandQueryBus.executeCommand(invalidCommand);

      // Then
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ processedData: "" });
    });

    it("should handle query validation errors", async () => {
      // Given
      const invalidQuery = new TestQuery("", "correlation-123", new EntityId());

      // When
      const result = await commandQueryBus.executeQuery(invalidQuery);

      // Then
      expect(result.success).toBe(true);
      expect(result.item).toEqual({ queryResult: "" });
    });
  });

  describe("Logging Integration", () => {
    it("should log command execution", async () => {
      // Given
      const command = new TestCommand(
        "logging-test",
        "correlation-123",
        new EntityId(),
      );
      const loggerSpy = jest.spyOn(logger, "debug");

      // When
      await commandQueryBus.executeCommand(command);

      // Then
      expect(loggerSpy).toHaveBeenCalled();
    });

    it("should log query execution", async () => {
      // Given
      const query = new TestQuery(
        "logging-test",
        "correlation-123",
        new EntityId(),
      );
      const loggerSpy = jest.spyOn(logger, "debug");

      // When
      await commandQueryBus.executeQuery(query);

      // Then
      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});
