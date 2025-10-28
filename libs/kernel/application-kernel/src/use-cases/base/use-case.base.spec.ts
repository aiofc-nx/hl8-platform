/**
 * @fileoverview 用例基类单元测试
 * @description 测试UseCase基类的功能
 */

import { Logger } from "@hl8/logger";
import { UseCase } from "./use-case.base.js";
import { UseCaseInput } from "./use-case-input.base.js";
import { UseCaseOutput } from "./use-case-output.base.js";
import { UseCaseException } from "../../exceptions/use-case/use-case-exception.js";
import { UseCaseValidationException } from "../../exceptions/use-case/use-case-validation-exception.js";

/**
 * 测试用输入类
 */
class TestUseCaseInput extends UseCaseInput {
  @IsNotEmpty()
  public name!: string;

  @IsOptional()
  public age?: number;

  public clone(): UseCaseInput {
    const cloned = new TestUseCaseInput();
    cloned.name = this.name;
    cloned.age = this.age;
    cloned.correlationId = this.correlationId;
    cloned.userId = this.userId;
    cloned.timestamp = this.timestamp;
    cloned.metadata = this.metadata;
    return cloned;
  }
}

/**
 * 测试用输出类
 */
class TestUseCaseOutput extends UseCaseOutput {
  public data?: string;

  public clone(): UseCaseOutput {
    const cloned = new TestUseCaseOutput();
    cloned.success = this.success;
    cloned.message = this.message;
    cloned.errorCode = this.errorCode;
    cloned.executionTime = this.executionTime;
    cloned.timestamp = this.timestamp;
    cloned.metadata = this.metadata;
    cloned.data = this.data;
    return cloned;
  }
}

/**
 * 测试用用例类
 */
class TestUseCase extends UseCase<TestUseCaseInput, TestUseCaseOutput> {
  constructor(logger: Logger) {
    super(logger);
  }

  protected async executeBusinessLogic(
    input: TestUseCaseInput,
  ): Promise<TestUseCaseOutput> {
    const output = new TestUseCaseOutput();
    output.data = `Hello, ${input.name}!`;
    output.message = "测试用例执行成功";
    return output;
  }

  public getDescription(): string {
    return "测试用例";
  }

  protected getInputTypeName(): string {
    return "TestUseCaseInput";
  }

  protected getOutputTypeName(): string {
    return "TestUseCaseOutput";
  }
}

/**
 * 测试用失败用例类
 */
class FailingUseCase extends UseCase<TestUseCaseInput, TestUseCaseOutput> {
  constructor(logger: Logger) {
    super(logger);
  }

  protected async executeBusinessLogic(
    input: TestUseCaseInput,
  ): Promise<TestUseCaseOutput> {
    throw new Error("业务逻辑执行失败");
  }

  public getDescription(): string {
    return "失败测试用例";
  }

  protected getInputTypeName(): string {
    return "TestUseCaseInput";
  }

  protected getOutputTypeName(): string {
    return "TestUseCaseOutput";
  }
}

/**
 * 测试用验证失败用例类
 */
class ValidationFailingUseCase extends UseCase<
  TestUseCaseInput,
  TestUseCaseOutput
> {
  constructor(logger: Logger) {
    super(logger);
  }

  protected async executeBusinessLogic(
    input: TestUseCaseInput,
  ): Promise<TestUseCaseOutput> {
    const output = new TestUseCaseOutput();
    output.data = "验证失败用例";
    return output;
  }

  public getDescription(): string {
    return "验证失败测试用例";
  }

  protected getInputTypeName(): string {
    return "TestUseCaseInput";
  }

  protected getOutputTypeName(): string {
    return "TestUseCaseOutput";
  }
}

// 导入验证装饰器
import { IsNotEmpty, IsOptional } from "class-validator";

describe("UseCase", () => {
  let mockLogger: jest.Mocked<Logger>;
  let useCase: TestUseCase;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    useCase = new TestUseCase(mockLogger);
  });

  describe("构造函数", () => {
    it("应该正确初始化用例", () => {
      expect(useCase).toBeDefined();
      expect(useCase.getUseCaseName()).toBe("TestUseCase");
      expect(useCase.getDescription()).toBe("测试用例");
      expect(useCase.getVersion()).toBe("1.0.0");
      expect(useCase.isAvailable()).toBe(true);
    });
  });

  describe("execute", () => {
    it("应该成功执行用例", async () => {
      const input = new TestUseCaseInput();
      input.name = "张三";
      input.age = 25;
      input.correlationId = "test-correlation-id";

      const result = await useCase.execute(input);

      expect(result).toBeInstanceOf(TestUseCaseOutput);
      expect(result.success).toBe(true);
      expect(result.data).toBe("Hello, 张三!");
      expect(result.message).toBe("测试用例执行成功");
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();

      expect(mockLogger.log).toHaveBeenCalledWith(
        "用例开始执行",
        expect.objectContaining({
          useCase: "TestUseCase",
          correlationId: "test-correlation-id",
        }),
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "用例执行成功",
        expect.objectContaining({
          useCase: "TestUseCase",
          correlationId: "test-correlation-id",
          executionTime: expect.any(Number),
        }),
      );
    });

    it("应该自动生成关联ID", async () => {
      const input = new TestUseCaseInput();
      input.name = "李四";

      const result = await useCase.execute(input);

      expect(result).toBeInstanceOf(TestUseCaseOutput);
      expect(result.success).toBe(true);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "用例开始执行",
        expect.objectContaining({
          useCase: "TestUseCase",
          correlationId: expect.stringMatching(/^uc_\d+_[a-z0-9]+$/),
        }),
      );
    });

    it("应该处理业务逻辑执行失败", async () => {
      const failingUseCase = new FailingUseCase(mockLogger);
      const input = new TestUseCaseInput();
      input.name = "王五";

      await expect(failingUseCase.execute(input)).rejects.toThrow(
        UseCaseException,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "用例执行失败",
        expect.objectContaining({
          useCase: "FailingUseCase",
          error: "业务逻辑执行失败",
        }),
      );
    });

    it("应该处理输入验证失败", async () => {
      const input = new TestUseCaseInput();
      // 不设置必需的name字段

      await expect(useCase.execute(input)).rejects.toThrow(
        UseCaseValidationException,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "用例执行失败",
        expect.objectContaining({
          useCase: "TestUseCase",
          error: expect.stringContaining("输入验证失败"),
        }),
      );
    });

    it("应该重新抛出已知的用例异常", async () => {
      const validationFailingUseCase = new ValidationFailingUseCase(mockLogger);

      // 模拟验证失败
      jest
        .spyOn(TestUseCaseInput.prototype, "validate")
        .mockRejectedValue(
          new UseCaseValidationException(
            "验证失败",
            "TestUseCaseInput",
            new TestUseCaseInput(),
            ["name不能为空"],
          ),
        );

      const input = new TestUseCaseInput();
      input.name = "赵六";

      await expect(validationFailingUseCase.execute(input)).rejects.toThrow(
        UseCaseValidationException,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "用例执行失败",
        expect.objectContaining({
          useCase: "ValidationFailingUseCase",
          error: "验证失败",
        }),
      );
    });

    it("应该包装未知异常为UseCaseException", async () => {
      const failingUseCase = new FailingUseCase(mockLogger);
      const input = new TestUseCaseInput();
      input.name = "钱七";

      // 模拟验证成功
      jest
        .spyOn(TestUseCaseInput.prototype, "validate")
        .mockResolvedValue(undefined);

      await expect(failingUseCase.execute(input)).rejects.toThrow(
        UseCaseException,
      );

      const error = await failingUseCase.execute(input).catch((e) => e);
      expect(error).toBeInstanceOf(UseCaseException);
      expect(error.message).toContain("用例执行失败");
      expect(error.getUseCaseName()).toBe("FailingUseCase");

      // 清理mock
      jest.restoreAllMocks();
    });
  });

  describe("validateInput", () => {
    it("应该成功验证有效输入", async () => {
      const input = new TestUseCaseInput();
      input.name = "孙八";

      // 模拟验证成功
      jest
        .spyOn(TestUseCaseInput.prototype, "validate")
        .mockResolvedValue(undefined);

      await expect(
        (useCase as any).validateInput(input),
      ).resolves.toBeUndefined();
    });

    it("应该抛出验证异常当输入无效", async () => {
      const input = new TestUseCaseInput();
      // 不设置必需的name字段

      // 模拟验证失败
      jest
        .spyOn(TestUseCaseInput.prototype, "validate")
        .mockRejectedValue(
          new UseCaseValidationException(
            "输入验证失败",
            "TestUseCaseInput",
            input,
            ["name不能为空"],
          ),
        );

      await expect((useCase as any).validateInput(input)).rejects.toThrow(
        UseCaseValidationException,
      );

      // 清理mock
      jest.restoreAllMocks();
    });

    it("应该重新抛出UseCaseValidationException", async () => {
      const input = new TestUseCaseInput();
      input.name = "周九";

      const validationError = new UseCaseValidationException(
        "自定义验证失败",
        "TestUseCaseInput",
        input,
        ["自定义错误"],
      );

      jest
        .spyOn(TestUseCaseInput.prototype, "validate")
        .mockRejectedValue(validationError);

      await expect((useCase as any).validateInput(input)).rejects.toThrow(
        UseCaseValidationException,
      );

      // 清理mock
      jest.restoreAllMocks();
    });
  });

  describe("generateCorrelationId", () => {
    it("应该生成有效的关联ID", () => {
      const correlationId = (useCase as any).generateCorrelationId();

      expect(correlationId).toMatch(/^uc_\d+_[a-z0-9]+$/);
      expect(correlationId.length).toBeGreaterThan(10);
    });

    it("应该生成唯一的关联ID", () => {
      const id1 = (useCase as any).generateCorrelationId();
      const id2 = (useCase as any).generateCorrelationId();

      expect(id1).not.toBe(id2);
    });
  });

  describe("getUseCaseName", () => {
    it("应该返回用例名称", () => {
      expect(useCase.getUseCaseName()).toBe("TestUseCase");
    });
  });

  describe("getDescription", () => {
    it("应该返回用例描述", () => {
      expect(useCase.getDescription()).toBe("测试用例");
    });
  });

  describe("getVersion", () => {
    it("应该返回用例版本", () => {
      expect(useCase.getVersion()).toBe("1.0.0");
    });
  });

  describe("isAvailable", () => {
    it("应该返回用例可用性", () => {
      expect(useCase.isAvailable()).toBe(true);
    });
  });

  describe("getMetadata", () => {
    it("应该返回用例元数据", () => {
      const metadata = useCase.getMetadata();

      expect(metadata).toEqual({
        name: "TestUseCase",
        description: "测试用例",
        version: "1.0.0",
        available: true,
        inputType: "TestUseCaseInput",
        outputType: "TestUseCaseOutput",
      });
    });
  });

  describe("getInputTypeName", () => {
    it("应该返回输入类型名称", () => {
      expect((useCase as any).getInputTypeName()).toBe("TestUseCaseInput");
    });
  });

  describe("getOutputTypeName", () => {
    it("应该返回输出类型名称", () => {
      expect((useCase as any).getOutputTypeName()).toBe("TestUseCaseOutput");
    });
  });

  describe("执行时间计算", () => {
    it("应该正确计算执行时间", async () => {
      const input = new TestUseCaseInput();
      input.name = "吴十";

      // 模拟验证成功
      jest
        .spyOn(TestUseCaseInput.prototype, "validate")
        .mockResolvedValue(undefined);

      const startTime = Date.now();
      const result = await useCase.execute(input);
      const endTime = Date.now();

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeLessThanOrEqual(
        endTime - startTime + 100,
      ); // 允许100ms误差

      // 清理mock
      jest.restoreAllMocks();
    });
  });

  describe("日志记录", () => {
    it("应该记录用例开始执行日志", async () => {
      const input = new TestUseCaseInput();
      input.name = "郑十一";
      input.correlationId = "test-log-correlation-id";

      // 模拟验证成功
      jest
        .spyOn(TestUseCaseInput.prototype, "validate")
        .mockResolvedValue(undefined);

      await useCase.execute(input);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "用例开始执行",
        expect.objectContaining({
          useCase: "TestUseCase",
          correlationId: "test-log-correlation-id",
          input: expect.objectContaining({
            type: "TestUseCaseInput",
            correlationId: "test-log-correlation-id",
          }),
        }),
      );

      // 清理mock
      jest.restoreAllMocks();
    });

    it("应该记录用例执行成功日志", async () => {
      const input = new TestUseCaseInput();
      input.name = "王十二";

      // 模拟验证成功
      jest
        .spyOn(TestUseCaseInput.prototype, "validate")
        .mockResolvedValue(undefined);

      await useCase.execute(input);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "用例执行成功",
        expect.objectContaining({
          useCase: "TestUseCase",
          executionTime: expect.any(Number),
          result: expect.objectContaining({
            type: "TestUseCaseOutput",
            success: true,
          }),
        }),
      );

      // 清理mock
      jest.restoreAllMocks();
    });

    it("应该记录用例执行失败日志", async () => {
      const failingUseCase = new FailingUseCase(mockLogger);
      const input = new TestUseCaseInput();
      input.name = "冯十三";

      await expect(failingUseCase.execute(input)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        "用例执行失败",
        expect.objectContaining({
          useCase: "FailingUseCase",
          executionTime: expect.any(Number),
          error: expect.stringContaining("业务逻辑执行失败"),
        }),
      );
    });
  });
});
