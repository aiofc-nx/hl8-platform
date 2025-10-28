/**
 * @fileoverview 查询结果类单元测试
 * @description 测试QueryResult类的功能
 */

import { QueryResult } from "./query-result.js";

describe("QueryResult", () => {
  describe("构造函数", () => {
    it("应该正确初始化基本属性", () => {
      const result = new QueryResult(true);

      expect(result.success).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("应该使用提供的参数初始化", () => {
      const data = [{ id: "1", name: "test" }];
      const item = { id: "2", name: "item" };
      const message = "查询成功";
      const errorCode = "QUERY_ERROR";
      const pagination = {
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrevious: false,
      };
      const cacheInfo = {
        hit: true,
        key: "cache-key",
        ttl: 300,
        expiresAt: new Date(Date.now() + 300000),
      };
      const executionTime = 150;
      const metadata = { source: "test" };

      const result = new QueryResult(
        true,
        data,
        item,
        message,
        errorCode,
        pagination,
        cacheInfo,
        executionTime,
        metadata,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.item).toEqual(item);
      expect(result.message).toBe(message);
      expect(result.errorCode).toBe(errorCode);
      expect(result.pagination).toEqual(pagination);
      expect(result.cacheInfo).toEqual(cacheInfo);
      expect(result.executionTime).toBe(executionTime);
      expect(result.metadata).toEqual(metadata);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe("success静态方法", () => {
    it("应该创建成功结果", () => {
      const data = [{ id: "1", name: "test" }];
      const message = "查询成功";
      const pagination = {
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrevious: false,
      };
      const cacheInfo = {
        hit: true,
        key: "cache-key",
        ttl: 300,
        expiresAt: new Date(),
      };
      const executionTime = 150;
      const metadata = { source: "test" };

      const result = QueryResult.success(
        data,
        message,
        pagination,
        cacheInfo,
        executionTime,
        metadata,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.item).toBeUndefined();
      expect(result.message).toBe(message);
      expect(result.errorCode).toBeUndefined();
      expect(result.pagination).toEqual(pagination);
      expect(result.cacheInfo).toEqual(cacheInfo);
      expect(result.executionTime).toBe(executionTime);
      expect(result.metadata).toEqual(metadata);
    });

    it("应该使用默认消息", () => {
      const result = QueryResult.success();

      expect(result.success).toBe(true);
      expect(result.message).toBe("查询执行成功");
    });

    it("应该处理空数据", () => {
      const result = QueryResult.success();

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(result.item).toBeUndefined();
    });
  });

  describe("successItem静态方法", () => {
    it("应该创建单个结果成功", () => {
      const item = { id: "1", name: "test" };
      const message = "查询成功";
      const cacheInfo = {
        hit: true,
        key: "cache-key",
        ttl: 300,
        expiresAt: new Date(),
      };
      const executionTime = 150;
      const metadata = { source: "test" };

      const result = QueryResult.successItem(
        item,
        message,
        cacheInfo,
        executionTime,
        metadata,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(result.item).toEqual(item);
      expect(result.message).toBe(message);
      expect(result.errorCode).toBeUndefined();
      expect(result.pagination).toBeUndefined();
      expect(result.cacheInfo).toEqual(cacheInfo);
      expect(result.executionTime).toBe(executionTime);
      expect(result.metadata).toEqual(metadata);
    });

    it("应该使用默认消息", () => {
      const item = { id: "1", name: "test" };
      const result = QueryResult.successItem(item);

      expect(result.success).toBe(true);
      expect(result.item).toEqual(item);
      expect(result.message).toBe("查询执行成功");
    });
  });

  describe("failure静态方法", () => {
    it("应该创建失败结果", () => {
      const errorCode = "QUERY_ERROR";
      const message = "查询失败";
      const executionTime = 150;
      const metadata = { source: "test" };

      const result = QueryResult.failure(
        errorCode,
        message,
        executionTime,
        metadata,
      );

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.item).toBeUndefined();
      expect(result.message).toBe(message);
      expect(result.errorCode).toBe(errorCode);
      expect(result.pagination).toBeUndefined();
      expect(result.cacheInfo).toBeUndefined();
      expect(result.executionTime).toBe(executionTime);
      expect(result.metadata).toEqual(metadata);
    });
  });

  describe("setExecutionTime", () => {
    it("应该设置执行时间", () => {
      const result = new QueryResult(true);
      const startTime = Date.now() - 100;

      result.setExecutionTime(startTime);

      expect(result.executionTime).toBeGreaterThanOrEqual(100);
      expect(result.executionTime).toBeLessThan(200);
    });

    it("应该返回当前实例", () => {
      const result = new QueryResult(true);
      const startTime = Date.now();

      const returned = result.setExecutionTime(startTime);

      expect(returned).toBe(result);
    });
  });

  describe("setCacheInfo", () => {
    it("应该设置缓存信息", () => {
      const result = new QueryResult(true);
      const cacheInfo = {
        hit: true,
        key: "cache-key",
        ttl: 300,
        expiresAt: new Date(),
      };

      result.setCacheInfo(cacheInfo);

      expect(result.cacheInfo).toEqual(cacheInfo);
    });

    it("应该返回当前实例", () => {
      const result = new QueryResult(true);
      const cacheInfo = {
        hit: true,
        key: "cache-key",
        ttl: 300,
        expiresAt: new Date(),
      };

      const returned = result.setCacheInfo(cacheInfo);

      expect(returned).toBe(result);
    });
  });

  describe("getSummary", () => {
    it("应该返回结果摘要", () => {
      const data = [{ id: "1", name: "test" }];
      const pagination = {
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrevious: false,
      };
      const cacheInfo = {
        hit: true,
        key: "cache-key",
        ttl: 300,
        expiresAt: new Date(),
      };
      const executionTime = 150;
      const metadata = { source: "test" };

      const result = new QueryResult(
        true,
        data,
        undefined,
        "查询成功",
        undefined,
        pagination,
        cacheInfo,
        executionTime,
        metadata,
      );

      const summary = result.getSummary();

      expect(summary).toEqual({
        success: true,
        message: "查询成功",
        errorCode: undefined,
        dataCount: 1,
        pagination,
        cacheHit: true,
        executionTime: 150,
        timestamp: result.timestamp,
        hasMetadata: true,
      });
    });

    it("应该正确处理单个结果", () => {
      const item = { id: "1", name: "test" };
      const result = new QueryResult(true, undefined, item);

      const summary = result.getSummary();

      expect(summary.dataCount).toBe(1);
    });

    it("应该正确处理空结果", () => {
      const result = new QueryResult(true);

      const summary = result.getSummary();

      expect(summary.dataCount).toBe(0);
    });
  });

  describe("toJSON", () => {
    it("应该正确序列化结果数据", () => {
      const timestamp = new Date("2023-01-01T00:00:00Z");
      const expiresAt = new Date("2023-01-01T00:05:00Z");
      const data = [{ id: "1", name: "test" }];
      const pagination = {
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrevious: false,
      };
      const cacheInfo = {
        hit: true,
        key: "cache-key",
        ttl: 300,
        expiresAt,
      };
      const executionTime = 150;
      const metadata = { source: "test" };

      const result = new QueryResult(
        true,
        data,
        undefined,
        "查询成功",
        undefined,
        pagination,
        cacheInfo,
        executionTime,
        metadata,
      );

      // 手动设置时间戳以控制测试
      (result as any).timestamp = timestamp;

      const json = result.toJSON();

      expect(json).toEqual({
        success: true,
        data,
        item: undefined,
        message: "查询成功",
        errorCode: undefined,
        pagination,
        cacheInfo: {
          hit: true,
          key: "cache-key",
          ttl: 300,
          expiresAt: expiresAt.toISOString(),
        },
        executionTime: 150,
        timestamp: timestamp.toISOString(),
        metadata,
      });
    });

    it("应该正确处理未定义的缓存信息", () => {
      const result = new QueryResult(true);

      const json = result.toJSON();

      expect(json.cacheInfo).toBeUndefined();
    });
  });

  describe("clone", () => {
    it("应该创建独立的克隆对象", () => {
      const data = [{ id: "1", name: "test" }];
      const pagination = {
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrevious: false,
      };
      const cacheInfo = {
        hit: true,
        key: "cache-key",
        ttl: 300,
        expiresAt: new Date(),
      };
      const metadata = { source: "test" };

      const original = new QueryResult(
        true,
        data,
        undefined,
        "查询成功",
        undefined,
        pagination,
        cacheInfo,
        150,
        metadata,
      );

      const cloned = original.clone();

      expect(cloned).not.toBe(original);
      expect(cloned.success).toBe(original.success);
      expect(cloned.data).toEqual(original.data);
      expect(cloned.item).toBe(original.item);
      expect(cloned.message).toBe(original.message);
      expect(cloned.errorCode).toBe(original.errorCode);
      expect(cloned.pagination).toEqual(original.pagination);
      expect(cloned.cacheInfo).toEqual(original.cacheInfo);
      expect(cloned.executionTime).toBe(original.executionTime);
      expect(cloned.metadata).toEqual(original.metadata);
    });

    it("应该创建独立的数据数组", () => {
      const data = [{ id: "1", name: "test" }];
      const original = new QueryResult(true, data);
      const cloned = original.clone();

      (cloned as any).data = [{ id: "2", name: "modified" }];

      expect(original.data).toEqual([{ id: "1", name: "test" }]);
      expect(cloned.data).toEqual([{ id: "2", name: "modified" }]);
    });

    it("应该创建独立的元数据对象", () => {
      const metadata = { key: "value" };
      const original = new QueryResult(
        true,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        metadata,
      );
      const cloned = original.clone();

      (cloned as any).metadata = { key: "modified-value" };

      expect(original.metadata).toEqual({ key: "value" });
      expect(cloned.metadata).toEqual({ key: "modified-value" });
    });
  });
});
