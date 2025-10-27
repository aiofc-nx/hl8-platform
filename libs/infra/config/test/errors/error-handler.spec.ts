/**
 * 错误处理器测试
 *
 * @description 测试错误处理器的功能
 * @author HL8 SAAS Platform Team
 * @since 1.0.0
 */

import { ConfigError, ConfigErrorType } from "../../src/lib/errors/config-error.js";
import { ErrorHandler } from "../../src/lib/errors/error-handler.js";

describe("ErrorHandler", () => {
  describe("文件加载错误处理", () => {
    it("应该处理文件加载错误", () => {
      const error = new Error("File not found");
      const filePath = "/path/to/file.json";
      const context = { operation: "load" };

      const configError = ErrorHandler.handleFileLoadError(
        error,
        filePath,
        context,
      );

      expect(configError).toBeInstanceOf(ConfigError);
      expect(configError.type).toBe(ConfigErrorType.FILE_LOAD_ERROR);
      expect(configError.message).toContain(
        "Failed to load configuration file",
      );
      expect(configError.message).toContain(filePath);
      expect(configError.context.filePath).toBe(filePath);
      expect(configError.context.operation).toBe("load");
      expect(configError.originalError).toBe(error);
    });

    it("应该处理文件格式错误", () => {
      const error = new Error("Invalid format");
      const filePath = "/path/to/file.txt";
      const expectedFormat = "json, yaml";
      const context = { actualFormat: "txt" };

      const configError = ErrorHandler.handleFileFormatError(
        error,
        filePath,
        expectedFormat,
        context,
      );

      expect(configError).toBeInstanceOf(ConfigError);
      expect(configError.type).toBe(ConfigErrorType.FILE_FORMAT_ERROR);
      expect(configError.message).toContain("Unsupported file format");
      expect(configError.message).toContain(filePath);
      expect(configError.message).toContain(expectedFormat);
      expect(configError.context.filePath).toBe(filePath);
      expect(configError.context.expectedFormat).toBe(expectedFormat);
      expect(configError.context.actualFormat).toBe("txt");
    });

    it("应该处理文件不存在错误", () => {
      const filePath = "/nonexistent/file.json";
      const context = { searchPaths: ["/path1", "/path2"] };

      const configError = ErrorHandler.handleFileNotFoundError(
        filePath,
        context,
      );

      expect(configError).toBeInstanceOf(ConfigError);
      expect(configError.type).toBe(ConfigErrorType.FILE_NOT_FOUND);
      expect(configError.message).toContain("Configuration file not found");
      expect(configError.message).toContain(filePath);
      expect(configError.context.filePath).toBe(filePath);
      expect(configError.context.searchPaths).toEqual(["/path1", "/path2"]);
    });

    it("应该处理目录不存在错误", () => {
      const directoryPath = "/nonexistent/directory";
      const context = { parentPath: "/parent" };

      const configError = ErrorHandler.handleDirectoryNotFoundError(
        directoryPath,
        context,
      );

      expect(configError).toBeInstanceOf(ConfigError);
      expect(configError.type).toBe(ConfigErrorType.DIRECTORY_NOT_FOUND);
      expect(configError.message).toContain(
        "Configuration directory not found",
      );
      expect(configError.message).toContain(directoryPath);
      expect(configError.context.directoryPath).toBe(directoryPath);
      expect(configError.context.parentPath).toBe("/parent");
    });
  });

  describe("网络错误处理", () => {
    it("应该处理网络请求错误", () => {
      const error = new Error("Connection timeout");
      const url = "https://api.example.com/config";
      const context = { timeout: 5000, retries: 3 };

      const configError = ErrorHandler.handleNetworkError(error, url, context);

      expect(configError).toBeInstanceOf(ConfigError);
      expect(configError.type).toBe(ConfigErrorType.NETWORK_ERROR);
      expect(configError.message).toContain(
        "Failed to load configuration from remote URL",
      );
      expect(configError.message).toContain(url);
      expect(configError.context.url).toBe(url);
      expect(configError.context.timeout).toBe(5000);
      expect(configError.context.retries).toBe(3);
      expect(configError.originalError).toBe(error);
    });
  });

  describe("配置验证错误处理", () => {
    it("应该处理配置验证错误", () => {
      const validationErrors = [
        {
          property: "database.host",
          value: null,
          constraints: {
            isString: "host must be a string",
            isNotEmpty: "host must not be empty",
          },
        },
        {
          property: "database.port",
          value: "invalid",
          constraints: {
            isNumber: "port must be a number",
          },
        },
      ];
      const context = { configClass: "AppConfig", validationOptions: {} };

      const configError = ErrorHandler.handleValidationError(
        validationErrors,
        context,
      );

      expect(configError).toBeInstanceOf(ConfigError);
      expect(configError.type).toBe(ConfigErrorType.VALIDATION_ERROR);
      expect(configError.message).toContain("Configuration validation failed");
      expect(configError.message).toContain("2 errors");
      expect(configError.context.validationErrors).toEqual(validationErrors);
      expect(configError.context.configClass).toBe("AppConfig");
    });
  });

  describe("环境变量错误处理", () => {
    it("应该处理环境变量错误", () => {
      const variableName = "DATABASE_URL";
      const context = { required: true, defaultValue: null };

      const configError = ErrorHandler.handleEnvVarError(variableName, context);

      expect(configError).toBeInstanceOf(ConfigError);
      expect(configError.type).toBe(ConfigErrorType.ENV_VAR_ERROR);
      expect(configError.message).toContain(
        "Required environment variable is not defined",
      );
      expect(configError.message).toContain(variableName);
      expect(configError.context.variableName).toBe(variableName);
      expect(configError.context.required).toBe(true);
      expect(configError.context.defaultValue).toBeNull();
    });
  });

  describe("变量展开错误处理", () => {
    it("应该处理变量展开错误", () => {
      const error = new Error("Circular reference");
      const variableName = "NESTED_VAR";
      const context = { depth: 3, maxDepth: 2 };

      const configError = ErrorHandler.handleVariableExpansionError(
        error,
        variableName,
        context,
      );

      expect(configError).toBeInstanceOf(ConfigError);
      expect(configError.type).toBe(ConfigErrorType.VARIABLE_EXPANSION_ERROR);
      expect(configError.message).toContain("Failed to expand variable");
      expect(configError.message).toContain(variableName);
      expect(configError.context.variableName).toBe(variableName);
      expect(configError.context.depth).toBe(3);
      expect(configError.context.maxDepth).toBe(2);
      expect(configError.originalError).toBe(error);
    });
  });

  describe("配置解析错误处理", () => {
    it("应该处理配置解析错误", () => {
      const error = new Error("Invalid JSON syntax");
      const content = "{ invalid json }";
      const context = { format: "json", line: 1, column: 2 };

      const configError = ErrorHandler.handleParseError(
        error,
        content,
        context,
      );

      expect(configError).toBeInstanceOf(ConfigError);
      expect(configError.type).toBe(ConfigErrorType.PARSE_ERROR);
      expect(configError.message).toContain(
        "Failed to parse configuration content",
      );
      expect(configError.context.content).toContain("{ invalid json }");
      expect(configError.context.format).toBe("json");
      expect(configError.context.line).toBe(1);
      expect(configError.context.column).toBe(2);
      expect(configError.originalError).toBe(error);
    });
  });

  describe("未知错误处理", () => {
    it("应该处理未知错误", () => {
      const error = new Error("Unexpected error");
      const context = { operation: "unknown", timestamp: new Date() };

      const configError = ErrorHandler.handleUnknownError(error, context);

      expect(configError).toBeInstanceOf(ConfigError);
      expect(configError.type).toBe(ConfigErrorType.UNKNOWN_ERROR);
      expect(configError.message).toContain("An unknown error occurred");
      expect(configError.context.operation).toBe("unknown");
      expect(configError.context.timestamp).toBeDefined();
      expect(configError.originalError).toBe(error);
    });
  });

  describe("安全执行", () => {
    it("应该安全执行成功操作", async () => {
      const successFn = jest.fn().mockResolvedValue("success");
      const result = await ErrorHandler.safeExecute(
        successFn,
        ConfigErrorType.UNKNOWN_ERROR,
        { operation: "test" },
      );

      expect(result).toBe("success");
      expect(successFn).toHaveBeenCalled();
    });

    it("应该安全执行失败操作", async () => {
      const errorFn = jest
        .fn()
        .mockRejectedValue(new Error("Operation failed"));
      const result = await ErrorHandler.safeExecute(
        errorFn,
        ConfigErrorType.UNKNOWN_ERROR,
        { operation: "test" },
      );

      expect(result).toBeInstanceOf(ConfigError);
      expect(result.type).toBe(ConfigErrorType.UNKNOWN_ERROR);
      expect(result.message).toBe("Operation failed");
      expect(result.context.operation).toBe("test");
    });

    it("应该支持重试机制", async () => {
      let attemptCount = 0;
      const failingFn = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error("Temporary failure");
        }
        return "success";
      });

      const result = await ErrorHandler.safeExecute(
        failingFn,
        ConfigErrorType.UNKNOWN_ERROR,
        { operation: "test" },
        { retryCount: 3, retryInterval: 10 },
      );

      expect(result).toBe("success");
      expect(attemptCount).toBe(3);
    });

    it("应该处理重试次数耗尽", async () => {
      const failingFn = jest
        .fn()
        .mockRejectedValue(new Error("Persistent failure"));

      const result = await ErrorHandler.safeExecute(
        failingFn,
        ConfigErrorType.UNKNOWN_ERROR,
        { operation: "test" },
        { retryCount: 2, retryInterval: 10 },
      );

      expect(result).toBeInstanceOf(ConfigError);
      expect(result.type).toBe(ConfigErrorType.UNKNOWN_ERROR);
      expect(result.message).toBe("Persistent failure");
      expect(failingFn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it("应该支持错误日志记录", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const failingFn = jest.fn().mockRejectedValue(new Error("Test error"));

      await ErrorHandler.safeExecute(
        failingFn,
        ConfigErrorType.UNKNOWN_ERROR,
        { operation: "test" },
        { logErrors: true },
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[CONFIG\]:ERROR 配置错误$/,
        ),
        expect.stringContaining("Test error"),
      );

      consoleSpy.mockRestore();
    });

    it("应该支持禁用错误日志记录", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const failingFn = jest.fn().mockRejectedValue(new Error("Test error"));

      await ErrorHandler.safeExecute(
        failingFn,
        ConfigErrorType.UNKNOWN_ERROR,
        { operation: "test" },
        { logErrors: false },
      );

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("错误消息格式化", () => {
    it("应该格式化详细错误消息", () => {
      const error = new Error("Test error");
      const filePath = "/test/file.json";
      const context = { line: 10, column: 5 };

      const configError = ErrorHandler.handleFileLoadError(
        error,
        filePath,
        context,
      );
      const detailedMessage = configError.getDetailedMessage();

      expect(detailedMessage).toContain("FILE_LOAD_ERROR");
      expect(detailedMessage).toContain("Failed to load configuration file");
      expect(detailedMessage).toContain(filePath);
      expect(detailedMessage).toContain("Test error");
      expect(detailedMessage).toContain('"line": 10');
      expect(detailedMessage).toContain('"column": 5');
    });

    it("应该转换为 JSON 格式", () => {
      const error = new Error("Test error");
      const filePath = "/test/file.json";
      const context = { operation: "load" };

      const configError = ErrorHandler.handleFileLoadError(
        error,
        filePath,
        context,
      );
      const json = configError.toJSON();

      expect(json).toHaveProperty("name", "ConfigError");
      expect(json).toHaveProperty("type", "FILE_LOAD_ERROR");
      expect(json).toHaveProperty("message");
      expect(json).toHaveProperty("context");
      expect(json).toHaveProperty("timestamp");
      expect(json).toHaveProperty("originalError");
      expect(json.originalError).toHaveProperty("name", "Error");
      expect(json.originalError).toHaveProperty("message", "Test error");
    });
  });

  describe("错误类型验证", () => {
    it("应该验证所有错误类型", () => {
      const errorTypes = [
        ConfigErrorType.FILE_LOAD_ERROR,
        ConfigErrorType.FILE_FORMAT_ERROR,
        ConfigErrorType.FILE_NOT_FOUND,
        ConfigErrorType.DIRECTORY_NOT_FOUND,
        ConfigErrorType.NETWORK_ERROR,
        ConfigErrorType.VALIDATION_ERROR,
        ConfigErrorType.ENV_VAR_ERROR,
        ConfigErrorType.VARIABLE_EXPANSION_ERROR,
        ConfigErrorType.PARSE_ERROR,
        ConfigErrorType.UNKNOWN_ERROR,
      ];

      errorTypes.forEach((errorType) => {
        const error = new Error("Test error");
        const configError = new ConfigError(
          errorType,
          "Test message",
          {},
          error,
        );

        expect(configError.type).toBe(errorType);
        expect(configError).toBeInstanceOf(ConfigError);
        expect(configError.originalError).toBe(error);
      });
    });
  });
});
