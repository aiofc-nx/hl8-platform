/**
 * @fileoverview 命令基类单元测试
 * @description 测试BaseCommand基类的功能
 */

import { BaseCommand } from "./command.base.js";

/**
 * 测试用命令类
 */
class TestCommand extends BaseCommand<string> {
  public testData?: string;

  constructor(
    aggregateId: string,
    commandType: string,
    options: {
      commandId?: string;
      correlationId?: string;
      userId?: string;
      timestamp?: Date;
      version?: string;
      metadata?: Record<string, unknown>;
      testData?: string;
    } = {},
  ) {
    super(aggregateId, commandType, options);
    this.testData = options.testData;
  }

  public clone(): BaseCommand<string> {
    return new TestCommand(this.aggregateId, this.commandType, {
      commandId: this.commandId,
      correlationId: this.correlationId,
      userId: this.userId,
      timestamp: this.timestamp,
      version: this.version,
      metadata: this.metadata,
      testData: this.testData,
    });
  }
}

describe("BaseCommand", () => {
  describe("构造函数", () => {
    it("应该正确初始化命令", () => {
      const command = new TestCommand("aggregate-123", "TestCommand", {
        correlationId: "correlation-456",
        userId: "user-789",
        testData: "test-value",
      });

      expect(command.aggregateId).toBe("aggregate-123");
      expect(command.commandType).toBe("TestCommand");
      expect(command.correlationId).toBe("correlation-456");
      expect(command.userId).toBe("user-789");
      expect(command.testData).toBe("test-value");
      expect(command.commandId).toBeDefined();
      expect(command.timestamp).toBeInstanceOf(Date);
      expect(command.version).toBe("1.0.0");
    });

    it("应该使用默认值", () => {
      const command = new TestCommand("aggregate-123", "TestCommand");

      expect(command.aggregateId).toBe("aggregate-123");
      expect(command.commandType).toBe("TestCommand");
      expect(command.commandId).toBeDefined();
      expect(command.timestamp).toBeInstanceOf(Date);
      expect(command.version).toBe("1.0.0");
      expect(command.correlationId).toBeUndefined();
      expect(command.userId).toBeUndefined();
      expect(command.metadata).toBeUndefined();
    });

    it("应该生成唯一的命令ID", () => {
      const command1 = new TestCommand("aggregate-123", "TestCommand");
      const command2 = new TestCommand("aggregate-123", "TestCommand");

      expect(command1.commandId).toBeDefined();
      expect(command2.commandId).toBeDefined();
      expect(command1.commandId).not.toBe(command2.commandId);
    });
  });

  describe("getSummary", () => {
    it("应该返回命令摘要", () => {
      const command = new TestCommand("aggregate-123", "TestCommand", {
        correlationId: "correlation-456",
        userId: "user-789",
        metadata: { key: "value" },
      });

      const summary = command.getSummary();

      expect(summary).toEqual({
        commandId: command.commandId,
        aggregateId: "aggregate-123",
        commandType: "TestCommand",
        correlationId: "correlation-456",
        userId: "user-789",
        timestamp: command.timestamp,
        version: "1.0.0",
        hasMetadata: true,
      });
    });

    it("应该处理没有可选字段的摘要", () => {
      const command = new TestCommand("aggregate-123", "TestCommand");

      const summary = command.getSummary();

      expect(summary).toEqual({
        commandId: command.commandId,
        aggregateId: "aggregate-123",
        commandType: "TestCommand",
        correlationId: undefined,
        userId: undefined,
        timestamp: command.timestamp,
        version: "1.0.0",
        hasMetadata: false,
      });
    });
  });

  describe("toJSON", () => {
    it("应该正确序列化命令数据", () => {
      const command = new TestCommand("aggregate-123", "TestCommand", {
        correlationId: "correlation-456",
        userId: "user-789",
        metadata: { key: "value" },
      });

      const json = command.toJSON();

      expect(json).toEqual({
        commandId: command.commandId,
        aggregateId: "aggregate-123",
        commandType: "TestCommand",
        correlationId: "correlation-456",
        userId: "user-789",
        timestamp: command.timestamp?.toISOString(),
        version: "1.0.0",
        metadata: { key: "value" },
      });
    });

    it("应该处理没有可选字段的序列化", () => {
      const command = new TestCommand("aggregate-123", "TestCommand");

      const json = command.toJSON();

      expect(json).toEqual({
        commandId: command.commandId,
        aggregateId: "aggregate-123",
        commandType: "TestCommand",
        correlationId: undefined,
        userId: undefined,
        timestamp: command.timestamp?.toISOString(),
        version: "1.0.0",
        metadata: undefined,
      });
    });
  });

  describe("clone", () => {
    it("应该正确克隆命令对象", () => {
      const original = new TestCommand("aggregate-123", "TestCommand", {
        correlationId: "correlation-456",
        userId: "user-789",
        testData: "test-value",
        metadata: { key: "value" },
      });

      const cloned = original.clone();

      expect(cloned).toBeInstanceOf(TestCommand);
      expect(cloned).not.toBe(original);
      expect(cloned.aggregateId).toBe(original.aggregateId);
      expect(cloned.commandType).toBe(original.commandType);
      expect(cloned.commandId).toBe(original.commandId);
      expect(cloned.correlationId).toBe(original.correlationId);
      expect(cloned.userId).toBe(original.userId);
      expect(cloned.timestamp).toBe(original.timestamp);
      expect(cloned.version).toBe(original.version);
      expect(cloned.metadata).toEqual(original.metadata);
      expect((cloned as TestCommand).testData).toBe(original.testData);
    });

    it("应该创建独立的克隆对象", () => {
      const original = new TestCommand("aggregate-123", "TestCommand", {
        testData: "original-value",
        metadata: { key: "value" },
      });

      const cloned = original.clone();
      (cloned as TestCommand).testData = "modified-value";

      // 创建新的元数据对象以避免共享引用
      (cloned as any).metadata = { key: "modified-value" };

      expect(original.testData).toBe("original-value");
      expect(original.metadata!.key).toBe("value");
      expect((cloned as TestCommand).testData).toBe("modified-value");
      expect(cloned.metadata!.key).toBe("modified-value");
    });
  });

  describe("字段验证", () => {
    it("应该验证必需字段", () => {
      const command = new TestCommand("aggregate-123", "TestCommand");

      expect(command.commandId).toBeDefined();
      expect(command.aggregateId).toBe("aggregate-123");
      expect(command.commandType).toBe("TestCommand");
    });

    it("应该处理可选字段", () => {
      const command = new TestCommand("aggregate-123", "TestCommand");

      expect(command.correlationId).toBeUndefined();
      expect(command.userId).toBeUndefined();
      expect(command.metadata).toBeUndefined();
    });

    it("应该设置默认时间戳", () => {
      const command = new TestCommand("aggregate-123", "TestCommand");

      expect(command.timestamp).toBeInstanceOf(Date);
      expect(command.timestamp!.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it("应该设置默认版本", () => {
      const command = new TestCommand("aggregate-123", "TestCommand");

      expect(command.version).toBe("1.0.0");
    });
  });

  describe("继承关系", () => {
    it("应该继承自@nestjs/cqrs的Command类", () => {
      const command = new TestCommand("aggregate-123", "TestCommand");

      expect(command).toBeInstanceOf(BaseCommand);
      // 检查是否继承了@nestjs/cqrs的Command类
      expect(command.constructor.name).toBe("TestCommand");
    });
  });
});
