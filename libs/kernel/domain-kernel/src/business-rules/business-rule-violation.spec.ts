/**
 * @fileoverview 业务规则违反单元测试
 * @description 测试业务规则违反的功能和边界情况
 */

import {
  BusinessRuleViolation,
  BusinessRuleViolationBuilder,
} from "./business-rule-violation.js";
import { BusinessRuleSeverity } from "./business-rule.interface.js";

describe("BusinessRuleViolation", () => {
  describe("构造函数", () => {
    it("应该创建基本的业务规则违反", () => {
      const violation = new BusinessRuleViolation({
        message: "Invalid email format",
        code: "INVALID_EMAIL",
        ruleName: "EmailFormatRule",
        severity: BusinessRuleSeverity.ERROR,
      });

      expect(violation.message).toBe("Invalid email format");
      expect(violation.code).toBe("INVALID_EMAIL");
      expect(violation.ruleName).toBe("EmailFormatRule");
      expect(violation.severity).toBe(BusinessRuleSeverity.ERROR);
      expect(violation.timestamp).toBeInstanceOf(Date);
    });

    it("应该创建带有完整信息的业务规则违反", () => {
      const timestamp = new Date();
      const violation = new BusinessRuleViolation({
        message: "Invalid password strength",
        code: "INVALID_PASSWORD_STRENGTH",
        ruleName: "PasswordStrengthRule",
        ruleType: "ValidationRule",
        severity: BusinessRuleSeverity.WARNING,
        details: { minLength: 8, actualLength: 6 },
        timestamp,
        path: ["user", "password"],
        value: "weak123",
        position: { line: 10, column: 5 },
        entityType: "User",
        entityId: "user-123",
        operationType: "CREATE",
      });

      expect(violation.message).toBe("Invalid password strength");
      expect(violation.code).toBe("INVALID_PASSWORD_STRENGTH");
      expect(violation.ruleName).toBe("PasswordStrengthRule");
      expect(violation.ruleType).toBe("ValidationRule");
      expect(violation.severity).toBe(BusinessRuleSeverity.WARNING);
      expect(violation.details).toEqual({ minLength: 8, actualLength: 6 });
      expect(violation.timestamp).toBe(timestamp);
      expect(violation.path).toEqual(["user", "password"]);
      expect(violation.value).toBe("weak123");
      expect(violation.position).toEqual({ line: 10, column: 5 });
      expect(violation.entityType).toBe("User");
      expect(violation.entityId).toBe("user-123");
      expect(violation.operationType).toBe("CREATE");
    });
  });

  describe("静态方法", () => {
    it("应该创建错误级别的违反", () => {
      const violation = BusinessRuleViolation.error(
        "Invalid input",
        "INVALID_INPUT",
        "InputValidationRule",
        { details: { field: "email" } },
      );

      expect(violation.message).toBe("Invalid input");
      expect(violation.code).toBe("INVALID_INPUT");
      expect(violation.ruleName).toBe("InputValidationRule");
      expect(violation.severity).toBe(BusinessRuleSeverity.ERROR);
      expect(violation.details).toEqual({ field: "email" });
    });

    it("应该创建警告级别的违反", () => {
      const violation = BusinessRuleViolation.warning(
        "Deprecated field",
        "DEPRECATED_FIELD",
        "DeprecationRule",
      );

      expect(violation.message).toBe("Deprecated field");
      expect(violation.code).toBe("DEPRECATED_FIELD");
      expect(violation.ruleName).toBe("DeprecationRule");
      expect(violation.severity).toBe(BusinessRuleSeverity.WARNING);
    });

    it("应该创建信息级别的违反", () => {
      const violation = BusinessRuleViolation.info(
        "Additional information",
        "ADDITIONAL_INFO",
        "InfoRule",
      );

      expect(violation.message).toBe("Additional information");
      expect(violation.code).toBe("ADDITIONAL_INFO");
      expect(violation.ruleName).toBe("InfoRule");
      expect(violation.severity).toBe(BusinessRuleSeverity.INFO);
    });

    it("应该创建严重错误级别的违反", () => {
      const violation = BusinessRuleViolation.critical(
        "Critical security issue",
        "CRITICAL_SECURITY",
        "SecurityRule",
      );

      expect(violation.message).toBe("Critical security issue");
      expect(violation.code).toBe("CRITICAL_SECURITY");
      expect(violation.ruleName).toBe("SecurityRule");
      expect(violation.severity).toBe(BusinessRuleSeverity.CRITICAL);
    });
  });

  describe("实例方法", () => {
    let violation: BusinessRuleViolation;

    beforeEach(() => {
      violation = new BusinessRuleViolation({
        message: "Test violation",
        code: "TEST_CODE",
        ruleName: "TestRule",
        ruleType: "ValidationRule",
        severity: BusinessRuleSeverity.ERROR,
        details: { test: true },
        path: ["user", "email"],
        value: "invalid-email",
        position: { line: 5, column: 10 },
        entityType: "User",
        entityId: "user-123",
        operationType: "UPDATE",
      });
    });

    it("应该检查是否为错误", () => {
      expect(violation.isError()).toBe(true);

      const warningViolation = new BusinessRuleViolation({
        message: "Warning",
        code: "WARNING_CODE",
        ruleName: "WarningRule",
        severity: BusinessRuleSeverity.WARNING,
      });

      expect(warningViolation.isError()).toBe(false);
    });

    it("应该检查是否为警告", () => {
      expect(violation.isWarning()).toBe(false);

      const warningViolation = new BusinessRuleViolation({
        message: "Warning",
        code: "WARNING_CODE",
        ruleName: "WarningRule",
        severity: BusinessRuleSeverity.WARNING,
      });

      expect(warningViolation.isWarning()).toBe(true);
    });

    it("应该检查是否为信息", () => {
      expect(violation.isInfo()).toBe(false);

      const infoViolation = new BusinessRuleViolation({
        message: "Info",
        code: "INFO_CODE",
        ruleName: "InfoRule",
        severity: BusinessRuleSeverity.INFO,
      });

      expect(infoViolation.isInfo()).toBe(true);
    });

    it("应该检查是否为严重错误", () => {
      expect(violation.isCritical()).toBe(false);

      const criticalViolation = new BusinessRuleViolation({
        message: "Critical",
        code: "CRITICAL_CODE",
        ruleName: "CriticalRule",
        severity: BusinessRuleSeverity.CRITICAL,
      });

      expect(criticalViolation.isCritical()).toBe(true);
    });

    it("应该获取完整路径", () => {
      expect(violation.getFullPath()).toBe("user.email.TestRule");

      const violationWithoutPath = new BusinessRuleViolation({
        message: "Test",
        code: "TEST",
        ruleName: "TestRule",
        severity: BusinessRuleSeverity.ERROR,
      });

      expect(violationWithoutPath.getFullPath()).toBe("TestRule");
    });

    it("应该获取格式化的消息", () => {
      const formattedMessage = violation.getFormattedMessage();
      expect(formattedMessage).toContain("[ERROR]");
      expect(formattedMessage).toContain("user.email.TestRule");
      expect(formattedMessage).toContain("Test violation");
      expect(formattedMessage).toContain(violation.timestamp.toISOString());
    });

    it("应该获取严重程度显示名称", () => {
      expect(violation.getSeverityDisplayName()).toBe("ERROR");

      const warningViolation = new BusinessRuleViolation({
        message: "Warning",
        code: "WARNING_CODE",
        ruleName: "WarningRule",
        severity: BusinessRuleSeverity.WARNING,
      });

      expect(warningViolation.getSeverityDisplayName()).toBe("WARNING");
    });

    it("应该获取严重程度数值", () => {
      expect(violation.getSeverityValue()).toBe(3); // ERROR = 3

      const infoViolation = new BusinessRuleViolation({
        message: "Info",
        code: "INFO_CODE",
        ruleName: "InfoRule",
        severity: BusinessRuleSeverity.INFO,
      });

      expect(infoViolation.getSeverityValue()).toBe(1); // INFO = 1
    });

    it("应该比较严重程度", () => {
      const warningViolation = new BusinessRuleViolation({
        message: "Warning",
        code: "WARNING_CODE",
        ruleName: "WarningRule",
        severity: BusinessRuleSeverity.WARNING,
      });

      expect(violation.isMoreSevereThan(BusinessRuleSeverity.WARNING)).toBe(
        true,
      );
      expect(violation.isLessSevereThan(BusinessRuleSeverity.CRITICAL)).toBe(
        true,
      );
      expect(
        warningViolation.isMoreSevereThan(BusinessRuleSeverity.ERROR),
      ).toBe(false);
    });

    it("应该获取详细信息", () => {
      expect(violation.getDetail("test")).toBe(true);
      expect(violation.getDetail("nonexistent")).toBeUndefined();
    });

    it("应该检查是否有详细信息", () => {
      expect(violation.hasDetail("test")).toBe(true);
      expect(violation.hasDetail("nonexistent")).toBe(false);
    });

    it("应该获取所有详细信息键", () => {
      const keys = violation.getDetailKeys();
      expect(keys).toContain("test");
      expect(keys).toHaveLength(1);
    });

    it("应该获取位置信息", () => {
      const position = violation.getPosition();
      expect(position).toEqual({ line: 5, column: 10 });
    });

    it("应该获取行号", () => {
      expect(violation.getLine()).toBe(5);
    });

    it("应该获取列号", () => {
      expect(violation.getColumn()).toBe(10);
    });

    it("应该获取偏移位置", () => {
      const violationWithStart = new BusinessRuleViolation({
        message: "Test",
        code: "TEST",
        ruleName: "TestRule",
        severity: BusinessRuleSeverity.ERROR,
        position: { offset: 100, length: 100 },
      });

      expect(violationWithStart.getPosition()?.offset).toBe(100);
    });

    it("应该获取长度", () => {
      const violationWithEnd = new BusinessRuleViolation({
        message: "Test",
        code: "TEST",
        ruleName: "TestRule",
        severity: BusinessRuleSeverity.ERROR,
        position: { offset: 100, length: 100 },
      });

      expect(violationWithEnd.getPosition()?.length).toBe(100);
    });

    it("应该获取路径", () => {
      const path = violation.getPath();
      expect(path).toEqual(["user", "email"]);
    });

    it("应该获取路径字符串", () => {
      const pathString = violation.getPathString();
      expect(pathString).toBe("user.email");
    });

    it("应该获取值", () => {
      expect(violation.getValue()).toBe("invalid-email");
    });

    it("应该获取值类型", () => {
      expect(violation.getValueType()).toBe("string");

      const numberViolation = new BusinessRuleViolation({
        message: "Test",
        code: "TEST",
        ruleName: "TestRule",
        severity: BusinessRuleSeverity.ERROR,
        value: 123,
      });

      expect(numberViolation.getValueType()).toBe("number");
    });

    it("应该获取值字符串表示", () => {
      expect(violation.getValueString()).toBe('"invalid-email"');

      const numberViolation = new BusinessRuleViolation({
        message: "Test",
        code: "TEST",
        ruleName: "TestRule",
        severity: BusinessRuleSeverity.ERROR,
        value: 123,
      });

      expect(numberViolation.getValueString()).toBe("123");
    });

    it("应该转换为JSON格式", () => {
      const json = violation.toJSON();

      expect(json.message).toBe("Test violation");
      expect(json.code).toBe("TEST_CODE");
      expect(json.ruleName).toBe("TestRule");
      expect(json.ruleType).toBe("ValidationRule");
      expect(json.severity).toBe(BusinessRuleSeverity.ERROR);
      expect(json.details).toEqual({ test: true });
      expect(json.path).toEqual(["user", "email"]);
      expect(json.value).toBe("invalid-email");
      expect(json.position).toEqual({ line: 5, column: 10 });
      expect(json.entityType).toBe("User");
      expect(json.entityId).toBe("user-123");
      expect(json.operationType).toBe("UPDATE");
    });

    it("应该转换为字符串格式", () => {
      const str = violation.toString();
      expect(str).toBe("Test violation");
    });

    it("应该克隆违反", () => {
      const cloned = violation.clone({
        message: "Cloned violation",
        code: "CLONED_CODE",
      });

      expect(cloned.message).toBe("Cloned violation");
      expect(cloned.code).toBe("CLONED_CODE");
      expect(cloned.ruleName).toBe("TestRule");
      expect(cloned.severity).toBe(BusinessRuleSeverity.ERROR);
    });
  });
});

describe("BusinessRuleViolationBuilder", () => {
  let builder: BusinessRuleViolationBuilder;

  beforeEach(() => {
    builder = new BusinessRuleViolationBuilder();
  });

  it("应该设置基本属性", () => {
    builder
      .setMessage("Test message")
      .setCode("TEST_CODE")
      .setRuleName("TestRule");

    const violation = builder.build();

    expect(violation.message).toBe("Test message");
    expect(violation.code).toBe("TEST_CODE");
    expect(violation.ruleName).toBe("TestRule");
  });

  it("应该设置规则类型", () => {
    builder
      .setMessage("Test")
      .setCode("TEST")
      .setRuleName("TestRule")
      .setRuleType("ValidationRule");

    const violation = builder.build();

    expect(violation.ruleType).toBe("ValidationRule");
  });

  it("应该设置严重程度", () => {
    builder
      .setMessage("Test")
      .setCode("TEST")
      .setRuleName("TestRule")
      .setSeverity(BusinessRuleSeverity.WARNING);

    const violation = builder.build();

    expect(violation.severity).toBe(BusinessRuleSeverity.WARNING);
  });

  it("应该使用严重程度快捷方法", () => {
    builder
      .setMessage("Test")
      .setCode("TEST")
      .setRuleName("TestRule")
      .asWarning();

    const violation = builder.build();

    expect(violation.severity).toBe(BusinessRuleSeverity.WARNING);
  });

  it("应该设置详细信息", () => {
    const details = { field: "email", value: "invalid" };

    builder
      .setMessage("Test")
      .setCode("TEST")
      .setRuleName("TestRule")
      .setDetails(details);

    const violation = builder.build();

    expect(violation.details).toEqual(details);
  });

  it("应该添加详细信息", () => {
    builder
      .setMessage("Test")
      .setCode("TEST")
      .setRuleName("TestRule")
      .addDetail("field", "email")
      .addDetail("value", "invalid");

    const violation = builder.build();

    expect(violation.details).toEqual({ field: "email", value: "invalid" });
  });

  it("应该设置时间戳", () => {
    const timestamp = new Date("2023-01-01T00:00:00Z");

    builder
      .setMessage("Test")
      .setCode("TEST")
      .setRuleName("TestRule")
      .setTimestamp(timestamp);

    const violation = builder.build();

    expect(violation.timestamp).toBe(timestamp);
  });

  it("应该设置路径", () => {
    const path = ["user", "profile", "email"];

    builder
      .setMessage("Test")
      .setCode("TEST")
      .setRuleName("TestRule")
      .setPath(path);

    const violation = builder.build();

    expect(violation.path).toEqual(path);
  });

  it("应该添加路径段", () => {
    builder
      .setMessage("Test")
      .setCode("TEST")
      .setRuleName("TestRule")
      .addPathSegment("user")
      .addPathSegment("email");

    const violation = builder.build();

    expect(violation.path).toEqual(["user", "email"]);
  });

  it("应该设置值", () => {
    builder
      .setMessage("Test")
      .setCode("TEST")
      .setRuleName("TestRule")
      .setValue("invalid-email");

    const violation = builder.build();

    expect(violation.value).toBe("invalid-email");
  });

  it("应该设置位置信息", () => {
    const position = { line: 10, column: 20, offset: 100, length: 100 };

    builder
      .setMessage("Test")
      .setCode("TEST")
      .setRuleName("TestRule")
      .setPosition(position);

    const violation = builder.build();

    expect(violation.position).toEqual(position);
  });

  it("应该设置行号和列号", () => {
    builder
      .setMessage("Test")
      .setCode("TEST")
      .setRuleName("TestRule")
      .setLine(15)
      .setColumn(25);

    const violation = builder.build();

    expect(violation.position?.line).toBe(15);
    expect(violation.position?.column).toBe(25);
  });

  it("应该设置偏移和长度", () => {
    builder
      .setMessage("Test")
      .setCode("TEST")
      .setRuleName("TestRule")
      .setPosition({ offset: 150, length: 100 });

    const violation = builder.build();

    expect(violation.position?.offset).toBe(150);
    expect(violation.position?.length).toBe(100);
  });

  it("应该设置实体信息", () => {
    builder
      .setMessage("Test")
      .setCode("TEST")
      .setRuleName("TestRule")
      .setEntity("User", "user-123");

    const violation = builder.build();

    expect(violation.entityType).toBe("User");
    expect(violation.entityId).toBe("user-123");
  });

  it("应该设置操作类型", () => {
    builder
      .setMessage("Test")
      .setCode("TEST")
      .setRuleName("TestRule")
      .setOperationType("CREATE");

    const violation = builder.build();

    expect(violation.operationType).toBe("CREATE");
  });

  it("应该重置构建器", () => {
    builder.setMessage("Test").setCode("TEST").setRuleName("TestRule").reset();

    expect(() => builder.build()).toThrow(
      "Message, code, and rule name are required",
    );
  });

  it("应该在缺少必需属性时抛出错误", () => {
    expect(() => builder.build()).toThrow(
      "Message, code, and rule name are required",
    );

    builder.setMessage("Test");
    expect(() => builder.build()).toThrow(
      "Message, code, and rule name are required",
    );

    builder.setCode("TEST");
    expect(() => builder.build()).toThrow(
      "Message, code, and rule name are required",
    );
  });
});
