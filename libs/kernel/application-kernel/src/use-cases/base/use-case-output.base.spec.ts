/**
 * @fileoverview 用例输出基类单元测试
 * @description 测试UseCaseOutput基类的功能
 */

import { UseCaseOutput } from "./use-case-output.base.js";

/**
 * 测试用输出类
 */
class TestUseCaseOutput extends UseCaseOutput {
  public data?: string;
  public count?: number;

  public clone(): UseCaseOutput {
    const cloned = new TestUseCaseOutput();
    cloned.success = this.success;
    cloned.message = this.message;
    cloned.errorCode = this.errorCode;
    cloned.executionTime = this.executionTime;
    cloned.timestamp = this.timestamp;
    cloned.metadata = this.metadata ? { ...this.metadata } : undefined;
    cloned.data = this.data;
    cloned.count = this.count;
    return cloned;
  }
}

/**
 * 测试用简单输出类
 */
class SimpleUseCaseOutput extends UseCaseOutput {
  public clone(): UseCaseOutput {
    const cloned = new SimpleUseCaseOutput();
    cloned.success = this.success;
    cloned.message = this.message;
    cloned.errorCode = this.errorCode;
    cloned.executionTime = this.executionTime;
    cloned.timestamp = this.timestamp;
    cloned.metadata = this.metadata ? { ...this.metadata } : undefined;
    return cloned;
  }
}

describe("UseCaseOutput", () => {
  describe("构造函数", () => {
    it("应该正确初始化输出对象", () => {
      const output = new TestUseCaseOutput();

      expect(output.success).toBe(true);
      expect(output.message).toBeUndefined();
      expect(output.errorCode).toBeUndefined();
      expect(output.executionTime).toBeUndefined();
      expect(output.timestamp).toBeDefined();
      expect(output.metadata).toBeUndefined();
    });

    it("应该设置默认时间戳", () => {
      const output = new TestUseCaseOutput();

      expect(output.timestamp).toBeDefined();
    });
  });

  describe("success静态方法", () => {
    it("应该创建成功结果", () => {
      const output = TestUseCaseOutput.success(
        {
          data: "测试数据",
          count: 42,
        },
        "操作成功",
        { key: "value" },
      );

      expect(output).toBeInstanceOf(TestUseCaseOutput);
      expect(output.success).toBe(true);
      expect(output.message).toBe("操作成功");
      expect(output.data).toBe("测试数据");
      expect(output.count).toBe(42);
      expect(output.metadata).toEqual({ key: "value" });
      expect(output.timestamp).toBeDefined();
    });

    it("应该使用默认成功消息", () => {
      const output = TestUseCaseOutput.success({
        data: "测试数据",
      });

      expect(output.success).toBe(true);
      expect(output.message).toBe("操作成功");
      expect(output.data).toBe("测试数据");
    });

    it("应该处理没有数据的情况", () => {
      const output = TestUseCaseOutput.success({});

      expect(output.success).toBe(true);
      expect(output.message).toBe("操作成功");
    });

    it("应该处理没有元数据的情况", () => {
      const output = TestUseCaseOutput.success(
        {
          data: "测试数据",
        },
        "自定义消息",
      );

      expect(output.success).toBe(true);
      expect(output.message).toBe("自定义消息");
      expect(output.metadata).toBeUndefined();
    });
  });

  describe("failure静态方法", () => {
    it("应该创建失败结果", () => {
      const output = TestUseCaseOutput.failure("VALIDATION_ERROR", "验证失败", {
        field: "name",
      });

      expect(output).toBeInstanceOf(TestUseCaseOutput);
      expect(output.success).toBe(false);
      expect(output.errorCode).toBe("VALIDATION_ERROR");
      expect(output.message).toBe("验证失败");
      expect(output.metadata).toEqual({ field: "name" });
      expect(output.timestamp).toBeDefined();
    });

    it("应该处理没有元数据的失败结果", () => {
      const output = TestUseCaseOutput.failure("SYSTEM_ERROR", "系统错误");

      expect(output.success).toBe(false);
      expect(output.errorCode).toBe("SYSTEM_ERROR");
      expect(output.message).toBe("系统错误");
      expect(output.metadata).toBeUndefined();
    });
  });

  describe("setExecutionTime", () => {
    it("应该正确设置执行时间", () => {
      const output = new TestUseCaseOutput();
      const startTime = Date.now() - 1000; // 1秒前

      const result = output.setExecutionTime(startTime);

      expect(result).toBe(output);
      expect(output.executionTime).toBeGreaterThanOrEqual(1000);
      expect(output.executionTime).toBeLessThan(1100); // 允许100ms误差
    });

    it("应该处理当前时间作为开始时间", () => {
      const output = new TestUseCaseOutput();
      const startTime = Date.now();

      output.setExecutionTime(startTime);

      expect(output.executionTime).toBeGreaterThanOrEqual(0);
      expect(output.executionTime).toBeLessThan(100); // 应该很快
    });

    it("应该支持链式调用", () => {
      const output = new TestUseCaseOutput();
      const startTime = Date.now() - 500;

      const result = output
        .setExecutionTime(startTime)
        .setExecutionTime(startTime);

      expect(result).toBe(output);
      expect(output.executionTime).toBeGreaterThanOrEqual(500);
    });
  });

  describe("getSummary", () => {
    it("应该返回成功结果的摘要", () => {
      const output = new TestUseCaseOutput();
      output.data = "测试数据";
      output.count = 42;
      output.message = "操作成功";
      output.executionTime = 150;
      output.metadata = { key: "value" };

      const summary = output.getSummary();

      expect(summary).toEqual({
        type: "TestUseCaseOutput",
        success: true,
        message: "操作成功",
        errorCode: undefined,
        executionTime: 150,
        timestamp: output.timestamp,
        hasMetadata: true,
      });
    });

    it("应该返回失败结果的摘要", () => {
      const output = new TestUseCaseOutput();
      output.success = false;
      output.errorCode = "VALIDATION_ERROR";
      output.message = "验证失败";
      output.executionTime = 200;

      const summary = output.getSummary();

      expect(summary).toEqual({
        type: "TestUseCaseOutput",
        success: false,
        message: "验证失败",
        errorCode: "VALIDATION_ERROR",
        executionTime: 200,
        timestamp: output.timestamp,
        hasMetadata: false,
      });
    });

    it("应该处理最小化结果", () => {
      const output = new SimpleUseCaseOutput();

      const summary = output.getSummary();

      expect(summary).toEqual({
        type: "SimpleUseCaseOutput",
        success: true,
        message: undefined,
        errorCode: undefined,
        executionTime: undefined,
        timestamp: output.timestamp,
        hasMetadata: false,
      });
    });
  });

  describe("toJSON", () => {
    it("应该正确序列化输出数据", () => {
      const output = new TestUseCaseOutput();
      output.success = true;
      output.message = "操作成功";
      output.executionTime = 300;
      output.metadata = { key: "value" };

      const json = output.toJSON();

      expect(json).toEqual({
        success: true,
        message: "操作成功",
        timestamp: output.timestamp?.toISOString(),
        metadata: { key: "value" },
      });
    });

    it("应该处理失败结果的序列化", () => {
      const output = new TestUseCaseOutput();
      output.success = false;
      output.errorCode = "SYSTEM_ERROR";
      output.message = "系统错误";

      const json = output.toJSON();

      expect(json).toEqual({
        success: false,
        message: "系统错误",
        timestamp: output.timestamp?.toISOString(),
        metadata: undefined,
      });
    });

    it("应该处理时间戳为undefined的情况", () => {
      const output = new TestUseCaseOutput();
      output.timestamp = undefined;

      const json = output.toJSON();

      expect(json.timestamp).toBeUndefined();
    });
  });

  describe("clone", () => {
    it("应该正确克隆输出对象", () => {
      const original = new TestUseCaseOutput();
      original.success = false;
      original.errorCode = "TEST_ERROR";
      original.message = "测试错误";
      original.executionTime = 400;
      original.data = "测试数据";
      original.count = 100;
      original.metadata = { key: "value" };

      const cloned = original.clone();

      expect(cloned).toBeInstanceOf(TestUseCaseOutput);
      expect(cloned).not.toBe(original);
      expect(cloned.success).toBe(original.success);
      expect(cloned.errorCode).toBe(original.errorCode);
      expect(cloned.message).toBe(original.message);
      expect(cloned.executionTime).toBe(original.executionTime);
      expect((cloned as any).data).toBe((original as any).data);
      expect((cloned as any).count).toBe((original as any).count);
      expect(cloned.metadata).toEqual(original.metadata);
      expect(cloned.timestamp).toBe(original.timestamp);
    });

    it("应该创建独立的克隆对象", () => {
      const original = new TestUseCaseOutput();
      original.data = "原始数据";
      original.metadata = { key: "value" };

      const cloned = original.clone();
      (cloned as any).data = "修改后的数据";
      cloned.metadata!.key = "修改后的值";

      expect(original.data).toBe("原始数据");
      expect(original.metadata!.key).toBe("value");
      expect((cloned as any).data).toBe("修改后的数据");
      expect(cloned.metadata!.key).toBe("修改后的值");
    });

    it("应该处理undefined字段的克隆", () => {
      const original = new TestUseCaseOutput();
      original.data = undefined;
      original.metadata = undefined;

      const cloned = original.clone();

      expect((cloned as any).data).toBeUndefined();
      expect(cloned.metadata).toBeUndefined();
    });
  });

  describe("字段验证", () => {
    it("应该验证success字段类型", () => {
      const output = new TestUseCaseOutput();
      output.success = true;

      expect(output.success).toBe(true);
    });

    it("应该验证message字段类型", () => {
      const output = new TestUseCaseOutput();
      output.message = "测试消息";

      expect(output.message).toBe("测试消息");
    });

    it("应该验证errorCode字段类型", () => {
      const output = new TestUseCaseOutput();
      output.errorCode = "TEST_ERROR";

      expect(output.errorCode).toBe("TEST_ERROR");
    });

    it("应该验证executionTime字段类型", () => {
      const output = new TestUseCaseOutput();
      output.executionTime = 500;

      expect(output.executionTime).toBe(500);
    });

    it("应该验证timestamp字段类型", () => {
      const output = new TestUseCaseOutput();
      const customTimestamp = new Date("2023-01-01T00:00:00Z");
      output.timestamp = customTimestamp;

      expect(output.timestamp).toBe(customTimestamp);
    });
  });

  describe("时间戳处理", () => {
    it("应该自动设置时间戳", () => {
      const output = new TestUseCaseOutput();

      expect(output.timestamp).toBeDefined();
      expect(output.timestamp!.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it("应该接受自定义时间戳", () => {
      const customTimestamp = new Date("2023-01-01T00:00:00Z");
      const output = new TestUseCaseOutput();
      output.timestamp = customTimestamp;

      expect(output.timestamp).toBe(customTimestamp);
    });
  });

  describe("元数据处理", () => {
    it("应该正确处理元数据", () => {
      const output = new TestUseCaseOutput();
      output.metadata = {
        source: "test",
        version: "1.0.0",
        nested: {
          key: "value",
        },
      };

      expect(output.metadata).toEqual({
        source: "test",
        version: "1.0.0",
        nested: {
          key: "value",
        },
      });
    });

    it("应该处理undefined元数据", () => {
      const output = new TestUseCaseOutput();
      output.metadata = undefined;

      expect(output.metadata).toBeUndefined();
    });
  });

  describe("静态方法类型安全", () => {
    it("应该支持泛型类型推断", () => {
      const output = TestUseCaseOutput.success({
        data: "类型安全的数据",
        count: 42,
      });

      expect(output).toBeInstanceOf(TestUseCaseOutput);
      expect(output.data).toBe("类型安全的数据");
      expect(output.count).toBe(42);
    });

    it("应该支持不同输出类的静态方法", () => {
      const simpleOutput = SimpleUseCaseOutput.success({});
      const testOutput = TestUseCaseOutput.success({ data: "测试" });

      expect(simpleOutput).toBeInstanceOf(SimpleUseCaseOutput);
      expect(testOutput).toBeInstanceOf(TestUseCaseOutput);
    });
  });
});
