/**
 * @fileoverview 命令验证异常单元测试
 * @description 测试CommandValidationException类的功能
 */

import { CommandValidationException } from "./command-validation-exception.js";
import { ExceptionCodes } from "../base/exception-codes.js";
import { EntityId } from "@hl8/domain-kernel";

describe("CommandValidationException", () => {
  describe("构造函数", () => {
    it("应该正确初始化命令验证异常", () => {
      const message = "命令验证失败";
      const commandType = "CreateUserCommand";
      const commandId = new EntityId();
      const handlerName = "CreateUserHandler";
      const validationErrors = ["字段不能为空", "格式不正确"];
      const context = { step: "validation" };
      const cause = new Error("原始错误");
      const exceptionId = new EntityId();

      const exception = new CommandValidationException(
        message,
        commandType,
        commandId,
        handlerName,
        validationErrors,
        context,
        cause,
        exceptionId,
      );

      expect(exception.message).toBe(message);
      expect(exception.errorCode).toBe(
        ExceptionCodes.COMMAND_VALIDATION_FAILED,
      );
      expect(exception.getCommandType()).toBe(commandType);
      expect(exception.getCommandId()).toBe(commandId);
      expect(exception.getHandlerName()).toBe(handlerName);
      expect(exception.getValidationErrors()).toEqual(validationErrors);
      expect(exception.getComponent()).toBe("Command");
      expect(exception.getOperation()).toBe("validate");
      expect(exception.context).toEqual({
        ...context,
        commandType,
        commandId: commandId.toString(),
        handlerName,
        validationErrors,
        component: "Command",
        operation: "validate",
      });
      expect(exception.cause).toBe(cause);
      expect(exception.exceptionId).toStrictEqual(exceptionId);
    });
  });

  describe("getValidationErrors", () => {
    it("应该返回验证错误列表", () => {
      const validationErrors = ["错误1", "错误2"];
      const exception = new CommandValidationException(
        "测试",
        "TestCommand",
        new EntityId(),
        "TestHandler",
        validationErrors,
      );

      expect(exception.getValidationErrors()).toEqual(validationErrors);
    });
  });

  describe("getValidationSummary", () => {
    it("应该返回验证错误摘要", () => {
      const validationErrors = ["字段不能为空", "格式不正确"];
      const exception = new CommandValidationException(
        "测试",
        "TestCommand",
        new EntityId(),
        "TestHandler",
        validationErrors,
      );

      const summary = exception.getValidationSummary();
      expect(summary).toContain("字段不能为空");
      expect(summary).toContain("格式不正确");
      expect(summary).toContain("TestCommand验证失败");
    });
  });

  describe("clone", () => {
    it("应该正确克隆异常", () => {
      const original = new CommandValidationException(
        "原始消息",
        "TestCommand",
        new EntityId(),
        "TestHandler",
        ["错误1", "错误2"],
        { step: "validation" },
        new Error("原始错误"),
        new EntityId(),
      );

      const cloned = original.clone();

      expect(cloned).toBeInstanceOf(CommandValidationException);
      expect(cloned.message).toBe(original.message);
      expect(cloned.errorCode).toBe(original.errorCode);
      expect(cloned.getCommandType()).toBe(original.getCommandType());
      expect(cloned.getCommandId()).toBe(original.getCommandId());
      expect(cloned.getHandlerName()).toBe(original.getHandlerName());
      expect(cloned.getValidationErrors()).toEqual(
        original.getValidationErrors(),
      );
      expect(cloned.context).toEqual(original.context);
      expect(cloned.cause).toBe(original.cause);
      expect(cloned.exceptionId).toStrictEqual(original.exceptionId);
    });
  });
});
