/**
 * @fileoverview 查询基类单元测试
 * @description 测试BaseQuery类的功能
 */

import { BaseQuery } from "./query.base.js";

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

describe("BaseQuery", () => {
  describe("构造函数", () => {
    it("应该正确初始化基本属性", () => {
      const query = new TestQuery();

      expect(query.queryId).toBeDefined();
      expect(query.queryType).toBe("TestQuery");
      expect(query.timestamp).toBeInstanceOf(Date);
      expect(query.version).toBe("1.0.0");
    });

    it("应该使用提供的选项初始化", () => {
      const options = {
        queryId: "test-query-id",
        correlationId: "test-correlation-id",
        userId: "test-user-id",
        timestamp: new Date("2023-01-01T00:00:00Z"),
        version: "2.0.0",
        pagination: {
          page: 1,
          limit: 10,
          offset: 0,
        },
        sorting: [
          { field: "name", direction: "asc" as const },
          { field: "id", direction: "desc" as const },
        ],
        filters: { status: "active" },
        metadata: { source: "test" },
      };

      const query = new TestQuery(options);

      expect(query.queryId).toBe(options.queryId);
      expect(query.correlationId).toBe(options.correlationId);
      expect(query.userId).toBe(options.userId);
      expect(query.timestamp).toBe(options.timestamp);
      expect(query.version).toBe(options.version);
      expect(query.pagination).toEqual(options.pagination);
      expect(query.sorting).toEqual(options.sorting);
      expect(query.filters).toEqual(options.filters);
      expect(query.metadata).toEqual(options.metadata);
    });

    it("应该生成唯一的查询ID", () => {
      const query1 = new TestQuery();
      const query2 = new TestQuery();

      expect(query1.queryId).toBeDefined();
      expect(query2.queryId).toBeDefined();
      expect(query1.queryId).not.toBe(query2.queryId);
    });
  });

  describe("getSummary", () => {
    it("应该返回查询摘要", () => {
      const query = new TestQuery({
        correlationId: "test-correlation-id",
        userId: "test-user-id",
        pagination: { page: 1, limit: 10 },
        sorting: [{ field: "name", direction: "asc" }],
        filters: { status: "active" },
        metadata: { source: "test" },
      });

      const summary = query.getSummary();

      expect(summary).toEqual({
        queryId: query.queryId,
        queryType: "TestQuery",
        correlationId: "test-correlation-id",
        userId: "test-user-id",
        timestamp: query.timestamp,
        version: "1.0.0",
        pagination: { page: 1, limit: 10 },
        sorting: [{ field: "name", direction: "asc" }],
        hasFilters: true,
        hasMetadata: true,
        hasTenantContext: false,
      });
    });

    it("应该正确处理空的可选字段", () => {
      const query = new TestQuery();

      const summary = query.getSummary();

      expect(summary.correlationId).toBeUndefined();
      expect(summary.userId).toBeUndefined();
      expect(summary.pagination).toBeUndefined();
      expect(summary.sorting).toBeUndefined();
      expect(summary.hasFilters).toBe(false);
      expect(summary.hasMetadata).toBe(false);
    });
  });

  describe("toJSON", () => {
    it("应该正确序列化查询数据", () => {
      const timestamp = new Date("2023-01-01T00:00:00Z");
      const query = new TestQuery({
        queryId: "test-query-id",
        correlationId: "test-correlation-id",
        userId: "test-user-id",
        timestamp,
        version: "2.0.0",
        pagination: { page: 1, limit: 10 },
        sorting: [{ field: "name", direction: "asc" }],
        filters: { status: "active" },
        metadata: { source: "test" },
      });

      const json = query.toJSON();

      expect(json).toEqual({
        queryId: "test-query-id",
        queryType: "TestQuery",
        correlationId: "test-correlation-id",
        userId: "test-user-id",
        timestamp: timestamp.toISOString(),
        version: "2.0.0",
        pagination: { page: 1, limit: 10 },
        sorting: [{ field: "name", direction: "asc" }],
        filters: { status: "active" },
        metadata: { source: "test" },
      });
    });

    it("应该正确处理未定义的时间戳", () => {
      const query = new TestQuery();
      // 手动设置timestamp为undefined来测试边界情况
      (query as any).timestamp = undefined;

      const json = query.toJSON();

      expect(json.timestamp).toBeUndefined();
    });
  });

  describe("clone", () => {
    it("应该创建独立的克隆对象", () => {
      const original = new TestQuery({
        queryId: "test-query-id",
        correlationId: "test-correlation-id",
        userId: "test-user-id",
        pagination: { page: 1, limit: 10 },
        sorting: [{ field: "name", direction: "asc" }],
        filters: { status: "active" },
        metadata: { source: "test" },
      });

      const cloned = original.clone();

      expect(cloned).not.toBe(original);
      expect(cloned.queryId).toBe(original.queryId);
      expect(cloned.queryType).toBe(original.queryType);
      expect(cloned.correlationId).toBe(original.correlationId);
      expect(cloned.userId).toBe(original.userId);
      expect(cloned.timestamp).toBe(original.timestamp);
      expect(cloned.version).toBe(original.version);
      expect(cloned.pagination).toEqual(original.pagination);
      expect(cloned.sorting).toEqual(original.sorting);
      expect(cloned.filters).toEqual(original.filters);
      expect(cloned.metadata).toEqual(original.metadata);
    });

    it("应该创建独立的元数据对象", () => {
      const original = new TestQuery({
        metadata: { key: "value" },
      });

      const cloned = original.clone();
      (cloned as any).metadata = { key: "modified-value" };

      expect(original.metadata).toEqual({ key: "value" });
      expect(cloned.metadata).toEqual({ key: "modified-value" });
    });
  });

  describe("分页参数", () => {
    it("应该正确处理分页参数", () => {
      const pagination = {
        page: 2,
        limit: 20,
        offset: 20,
      };

      const query = new TestQuery({ pagination });

      expect(query.pagination).toEqual(pagination);
    });

    it("应该正确处理没有offset的分页参数", () => {
      const pagination = {
        page: 1,
        limit: 10,
      };

      const query = new TestQuery({ pagination });

      expect(query.pagination).toEqual(pagination);
      expect(query.pagination?.offset).toBeUndefined();
    });
  });

  describe("排序参数", () => {
    it("应该正确处理排序参数", () => {
      const sorting = [
        { field: "name", direction: "asc" as const },
        { field: "createdAt", direction: "desc" as const },
      ];

      const query = new TestQuery({ sorting });

      expect(query.sorting).toEqual(sorting);
    });

    it("应该正确处理空排序参数", () => {
      const query = new TestQuery();

      expect(query.sorting).toBeUndefined();
    });
  });

  describe("过滤参数", () => {
    it("应该正确处理过滤参数", () => {
      const filters = {
        status: "active",
        category: "test",
        dateRange: {
          start: "2023-01-01",
          end: "2023-12-31",
        },
      };

      const query = new TestQuery({ filters });

      expect(query.filters).toEqual(filters);
    });

    it("应该正确处理空过滤参数", () => {
      const query = new TestQuery();

      expect(query.filters).toBeUndefined();
    });
  });

  describe("元数据", () => {
    it("应该正确处理元数据", () => {
      const metadata = {
        source: "test",
        version: "1.0.0",
        tags: ["important", "test"],
      };

      const query = new TestQuery({ metadata });

      expect(query.metadata).toEqual(metadata);
    });

    it("应该正确处理空元数据", () => {
      const query = new TestQuery();

      expect(query.metadata).toBeUndefined();
    });
  });
});
