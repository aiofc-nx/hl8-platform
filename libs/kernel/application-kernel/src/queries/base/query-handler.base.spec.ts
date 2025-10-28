/**
 * @fileoverview 查询处理器基类单元测试
 * @description 测试BaseQueryHandler类的功能
 */

import { BaseQueryHandler } from "./query-handler.base.js";
import { BaseQuery } from "./query.base.js";
import { QueryResult } from "./query-result.js";
import { QueryExecutionException } from "../../exceptions/query/query-execution-exception.js";
import { QueryValidationException } from "../../exceptions/query/query-validation-exception.js";
import { EntityId } from "@hl8/domain-kernel";
import { Logger } from "@hl8/logger";

/**
 * 测试查询类
 */
class TestQuery extends BaseQuery<{ id: string; name: string }> {
  constructor(options?: {
    queryId?: string;
    correlationId?: string;
    userId?: string;
    timestamp?: Date;
    version?: string;
    pagination?: {
      page: number;
      limit: number;
      offset?: number;
    };
    sorting?: Array<{
      field: string;
      direction: "asc" | "desc";
    }>;
    filters?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) {
    super("TestQuery", options);
  }

  public clone(): TestQuery {
    return new TestQuery({
      queryId: this.queryId,
      correlationId: this.correlationId,
      userId: this.userId,
      timestamp: this.timestamp,
      version: this.version,
      pagination: this.pagination,
      sorting: this.sorting,
      filters: this.filters,
      metadata: this.metadata,
    });
  }
}

/**
 * 测试查询处理器类
 */
class TestQueryHandler extends BaseQueryHandler<
  TestQuery,
  { id: string; name: string }
> {
  private shouldThrowValidationError = false;
  private shouldThrowExecutionError = false;
  private mockData: { id: string; name: string }[] = [];

  constructor(logger: Logger) {
    super(logger);
  }

  public setShouldThrowValidationError(shouldThrow: boolean): void {
    this.shouldThrowValidationError = shouldThrow;
  }

  public setShouldThrowExecutionError(shouldThrow: boolean): void {
    this.shouldThrowExecutionError = shouldThrow;
  }

  public setMockData(data: { id: string; name: string }[]): void {
    this.mockData = data;
  }

  protected async executeQuery(
    query: TestQuery,
  ): Promise<QueryResult<{ id: string; name: string }>> {
    if (this.shouldThrowExecutionError) {
      throw new Error("模拟执行错误");
    }

    return QueryResult.success(this.mockData, "查询执行成功");
  }

  protected async performQueryValidation(query: TestQuery): Promise<void> {
    if (this.shouldThrowValidationError) {
      throw new Error("模拟验证错误");
    }
  }

  public getDescription(): string {
    return "测试查询处理器";
  }
}

describe("BaseQueryHandler", () => {
  let mockLogger: jest.Mocked<Logger>;
  let handler: TestQueryHandler;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    handler = new TestQueryHandler(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("构造函数", () => {
    it("应该正确初始化处理器", () => {
      expect(handler.getHandlerName()).toBe("TestQueryHandler");
      expect(handler.getDescription()).toBe("测试查询处理器");
      expect(handler.getVersion()).toBe("1.0.0");
      expect(handler.isAvailable()).toBe(true);
    });
  });

  describe("execute", () => {
    it("应该成功执行查询", async () => {
      const query = new TestQuery({
        correlationId: "test-correlation-id",
        userId: "test-user-id",
      });

      const mockData = [
        { id: "1", name: "test1" },
        { id: "2", name: "test2" },
      ];
      handler.setMockData(mockData);

      const result = await handler.execute(query);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.message).toBe("查询执行成功");
      expect(result.executionTime).toBeGreaterThanOrEqual(0);

      expect(mockLogger.log).toHaveBeenCalledWith("查询开始执行", {
        handler: "TestQueryHandler",
        query: query.getSummary(),
        correlationId: "test-correlation-id",
      });

      expect(mockLogger.log).toHaveBeenCalledWith("查询执行成功", {
        handler: "TestQueryHandler",
        query: query.getSummary(),
        correlationId: "test-correlation-id",
        result: result.getSummary(),
      });
    });

    it("应该生成关联ID当查询没有提供时", async () => {
      const query = new TestQuery();
      handler.setMockData([]);

      await handler.execute(query);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "查询开始执行",
        expect.objectContaining({
          correlationId: expect.stringMatching(/^qry_\d+_[a-z0-9]+$/),
        }),
      );
    });

    it("应该处理验证错误", async () => {
      const query = new TestQuery();
      handler.setShouldThrowValidationError(true);

      await expect(handler.execute(query)).rejects.toThrow(
        QueryValidationException,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "查询执行失败",
        expect.objectContaining({
          handler: "TestQueryHandler",
          error: "查询验证失败: 模拟验证错误",
        }),
      );
    });

    it("应该处理执行错误", async () => {
      const query = new TestQuery();
      handler.setShouldThrowExecutionError(true);

      await expect(handler.execute(query)).rejects.toThrow(
        QueryExecutionException,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "查询执行失败",
        expect.objectContaining({
          handler: "TestQueryHandler",
          error: "模拟执行错误",
        }),
      );
    });

    it("应该重新抛出已知的查询异常", async () => {
      const query = new TestQuery();
      const validationError = new QueryValidationException(
        "验证失败",
        "TestQuery",
        new EntityId(query.queryId),
        "TestQueryHandler",
        ["验证错误"],
        {},
      );

      // 模拟验证方法抛出已知异常
      jest
        .spyOn(handler as any, "validateQuery")
        .mockRejectedValue(validationError);

      await expect(handler.execute(query)).rejects.toThrow(
        QueryValidationException,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "查询执行失败",
        expect.objectContaining({
          handler: "TestQueryHandler",
          error: "验证失败",
        }),
      );
    });

    it("应该包装未知异常", async () => {
      const query = new TestQuery();
      const unknownError = new Error("未知错误");

      // 模拟执行方法抛出未知异常
      jest
        .spyOn(handler as any, "executeQuery")
        .mockRejectedValue(unknownError);

      await expect(handler.execute(query)).rejects.toThrow(
        QueryExecutionException,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "查询执行失败",
        expect.objectContaining({
          handler: "TestQueryHandler",
          error: "未知错误",
        }),
      );
    });

    it("应该正确设置执行时间", async () => {
      const query = new TestQuery();
      handler.setMockData([]);

      const result = await handler.execute(query);

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("validateQuery", () => {
    it("应该成功验证查询", async () => {
      const query = new TestQuery();
      handler.setShouldThrowValidationError(false);

      await expect(
        (handler as any).validateQuery(query),
      ).resolves.not.toThrow();
    });

    it("应该处理验证异常", async () => {
      const query = new TestQuery();
      handler.setShouldThrowValidationError(true);

      await expect((handler as any).validateQuery(query)).rejects.toThrow(
        QueryValidationException,
      );
    });

    it("应该重新抛出已知的验证异常", async () => {
      const query = new TestQuery();
      const validationError = new QueryValidationException(
        "验证失败",
        "TestQuery",
        new EntityId(query.queryId),
        "TestQueryHandler",
        ["验证错误"],
        {},
      );

      jest
        .spyOn(handler as any, "performQueryValidation")
        .mockRejectedValue(validationError);

      await expect((handler as any).validateQuery(query)).rejects.toThrow(
        QueryValidationException,
      );
    });
  });

  describe("generateCorrelationId", () => {
    it("应该生成唯一的关联ID", () => {
      const id1 = (handler as any).generateCorrelationId();
      const id2 = (handler as any).generateCorrelationId();

      expect(id1).toMatch(/^qry_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^qry_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("getMetadata", () => {
    it("应该返回处理器元数据", () => {
      const metadata = handler.getMetadata();

      expect(metadata).toEqual({
        name: "TestQueryHandler",
        description: "测试查询处理器",
        version: "1.0.0",
        available: true,
        queryType: "BaseQuery",
        resultType: "QueryResult",
      });
    });
  });

  describe("getQueryTypeName", () => {
    it("应该返回查询类型名称", () => {
      const queryTypeName = (handler as any).getQueryTypeName();

      expect(queryTypeName).toBe("BaseQuery");
    });
  });

  describe("getResultTypeName", () => {
    it("应该返回结果类型名称", () => {
      const resultTypeName = (handler as any).getResultTypeName();

      expect(resultTypeName).toBe("QueryResult");
    });
  });

  describe("错误处理", () => {
    it("应该正确处理非Error对象的异常", async () => {
      const query = new TestQuery();

      // 模拟抛出非Error对象
      jest
        .spyOn(handler as any, "executeQuery")
        .mockRejectedValue("字符串错误");

      await expect(handler.execute(query)).rejects.toThrow(
        QueryExecutionException,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "查询执行失败",
        expect.objectContaining({
          error: "字符串错误",
        }),
      );
    });

    it("应该正确处理没有堆栈跟踪的异常", async () => {
      const query = new TestQuery();
      const error = new Error("测试错误");
      delete (error as any).stack;

      jest.spyOn(handler as any, "executeQuery").mockRejectedValue(error);

      await expect(handler.execute(query)).rejects.toThrow(
        QueryExecutionException,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "查询执行失败",
        expect.objectContaining({
          error: "测试错误",
          stack: undefined,
        }),
      );
    });
  });
});
