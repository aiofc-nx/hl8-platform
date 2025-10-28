/**
 * @fileoverview 异常代码单元测试
 * @description 测试APPLICATION_EXCEPTION_CODES枚举的功能
 */

import { ExceptionCodes } from "./exception-codes.js";

describe("ExceptionCodes", () => {
  describe("枚举值", () => {
    it("应该包含所有用例相关的异常代码", () => {
      expect(ExceptionCodes.USE_CASE_EXECUTION_FAILED).toBe("APP_2000");
      expect(ExceptionCodes.USE_CASE_VALIDATION_FAILED).toBe("APP_2001");
    });

    it("应该包含所有命令相关的异常代码", () => {
      expect(ExceptionCodes.COMMAND_EXECUTION_FAILED).toBe("APP_3000");
      expect(ExceptionCodes.COMMAND_VALIDATION_FAILED).toBe("APP_3001");
    });

    it("应该包含所有查询相关的异常代码", () => {
      expect(ExceptionCodes.QUERY_EXECUTION_FAILED).toBe("APP_4000");
      expect(ExceptionCodes.QUERY_VALIDATION_FAILED).toBe("APP_4001");
    });

    it("应该包含所有事件相关的异常代码", () => {
      expect(ExceptionCodes.EVENT_PROCESSING_FAILED).toBe("APP_5000");
      expect(ExceptionCodes.EVENT_STORE_ERROR).toBe("APP_5002");
    });

    it("应该包含所有Saga相关的异常代码", () => {
      expect(ExceptionCodes.SAGA_EXECUTION_FAILED).toBe("APP_7000");
      expect(ExceptionCodes.SAGA_COMPENSATION_FAILED).toBe("APP_7004");
    });
  });

  describe("枚举完整性", () => {
    it("应该包含所有预期的异常代码", () => {
      const expectedCodes = [
        "APP_2000", // USE_CASE_EXECUTION_FAILED
        "APP_2001", // USE_CASE_VALIDATION_FAILED
        "APP_3000", // COMMAND_EXECUTION_FAILED
        "APP_3001", // COMMAND_VALIDATION_FAILED
        "APP_4000", // QUERY_EXECUTION_FAILED
        "APP_4001", // QUERY_VALIDATION_FAILED
        "APP_5000", // EVENT_PROCESSING_FAILED
        "APP_5002", // EVENT_STORE_ERROR
        "APP_7000", // SAGA_EXECUTION_FAILED
        "APP_7004", // SAGA_COMPENSATION_FAILED
      ];

      const actualCodes = Object.values(ExceptionCodes);

      expectedCodes.forEach((expectedCode) => {
        expect(actualCodes).toContain(expectedCode);
      });
    });

    it("应该没有重复的异常代码", () => {
      const codes = Object.values(ExceptionCodes);
      const uniqueCodes = new Set(codes);

      expect(codes.length).toBe(uniqueCodes.size);
    });
  });

  describe("枚举值格式", () => {
    it("所有异常代码应该遵循APP_XXXX格式", () => {
      const codes = Object.values(ExceptionCodes);
      const appCodePattern = /^APP_\d+$/;

      codes.forEach((code) => {
        expect(code).toMatch(appCodePattern);
      });
    });

    it("所有异常代码应该以APP_开头", () => {
      const codes = Object.values(ExceptionCodes);

      codes.forEach((code) => {
        expect(code).toMatch(/^APP_/);
      });
    });
  });
});
