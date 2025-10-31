/**
 * @fileoverview 领域服务注册表单元测试
 * @description 测试领域服务注册表的功能和异常处理
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { DomainServiceRegistry } from "./domain-service-registry.js";
import {
  ServiceRegistryException,
  ServiceRegistrationFailedException,
} from "../exceptions/service-registry-exceptions.js";

// 模拟服务类
class MockUserService {
  constructor(public name: string) {}
}

class MockOrderService {
  constructor(public name: string) {}
}

class MockEmailService {
  constructor(public name: string) {}
}

describe("DomainServiceRegistry", () => {
  let registry: DomainServiceRegistry;

  beforeEach(() => {
    registry = new DomainServiceRegistry();
  });

  afterEach(() => {
    registry.clear();
  });

  describe("register", () => {
    it("应该成功注册服务", () => {
      const userService = new MockUserService("UserService");

      expect(() => {
        registry.register("UserService", userService);
      }).not.toThrow();

      expect(registry.has("UserService")).toBe(true);
    });

    it("应该成功注册带依赖的服务", () => {
      const userService = new MockUserService("UserService");
      const emailService = new MockEmailService("EmailService");

      registry.register("EmailService", emailService);
      registry.register("UserService", userService, ["EmailService"]);

      expect(registry.has("UserService")).toBe(true);
      expect(registry.getServiceDependencies("UserService")).toEqual([
        "EmailService",
      ]);
    });

    it("应该拒绝注册重复的服务", () => {
      const userService1 = new MockUserService("UserService1");
      const userService2 = new MockUserService("UserService2");

      registry.register("UserService", userService1);

      expect(() => {
        registry.register("UserService", userService2);
      }).toThrow(ServiceRegistryException);
    });

    it("应该拒绝注册空服务类型", () => {
      const userService = new MockUserService("UserService");

      expect(() => {
        registry.register("", userService);
      }).toThrow(ServiceRegistryException);

      expect(() => {
        registry.register("   ", userService);
      }).toThrow(ServiceRegistryException);
    });

    it("应该拒绝注册null服务实例", () => {
      expect(() => {
        registry.register("UserService", null as any);
      }).toThrow(ServiceRegistryException);

      expect(() => {
        registry.register("UserService", undefined as any);
      }).toThrow(ServiceRegistryException);
    });

    it("应该拒绝无效的依赖列表", () => {
      const userService = new MockUserService("UserService");

      expect(() => {
        registry.register("UserService", userService, "invalid" as any);
      }).toThrow(ServiceRegistryException);
    });
  });

  describe("get", () => {
    it("应该返回已注册的服务", () => {
      const userService = new MockUserService("UserService");
      registry.register("UserService", userService);

      const retrievedService = registry.get<MockUserService>("UserService");
      expect(retrievedService).toBe(userService);
    });

    it("应该返回null对于未注册的服务", () => {
      const retrievedService =
        registry.get<MockUserService>("NonExistentService");
      expect(retrievedService).toBeNull();
    });
  });

  describe("has", () => {
    it("应该正确报告服务是否存在", () => {
      const userService = new MockUserService("UserService");

      expect(registry.has("UserService")).toBe(false);

      registry.register("UserService", userService);
      expect(registry.has("UserService")).toBe(true);
    });
  });

  describe("validateDependencies", () => {
    it("应该验证所有依赖关系", () => {
      const userService = new MockUserService("UserService");
      const emailService = new MockEmailService("EmailService");

      registry.register("EmailService", emailService);
      registry.register("UserService", userService, ["EmailService"]);

      const result = registry.validateDependencies();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("应该检测缺失的依赖", () => {
      const userService = new MockUserService("UserService");
      registry.register("UserService", userService, ["NonExistentService"]);

      const result = registry.validateDependencies();
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("MISSING_DEPENDENCY");
    });

    it("应该检测循环依赖", () => {
      const serviceA = new MockUserService("ServiceA");
      const serviceB = new MockUserService("ServiceB");
      const serviceC = new MockUserService("ServiceC");

      registry.register("ServiceA", serviceA, ["ServiceB"]);
      registry.register("ServiceB", serviceB, ["ServiceC"]);
      registry.register("ServiceC", serviceC, ["ServiceA"]);

      const result = registry.validateDependencies();
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) => error.code === "CIRCULAR_DEPENDENCY"),
      ).toBe(true);
    });

    it("应该检测未使用的服务", () => {
      const userService = new MockUserService("UserService");
      const unusedService = new MockUserService("UnusedService");

      registry.register("UserService", userService);
      registry.register("UnusedService", unusedService);

      const result = registry.validateDependencies();
      expect(
        result.warnings.some((warning) => warning.code === "UNUSED_SERVICE"),
      ).toBe(true);
    });
  });

  describe("getServiceDependencies", () => {
    it("应该返回服务的依赖列表", () => {
      const userService = new MockUserService("UserService");
      registry.register("UserService", userService, [
        "EmailService",
        "OrderService",
      ]);

      const dependencies = registry.getServiceDependencies("UserService");
      expect(dependencies).toEqual(["EmailService", "OrderService"]);
    });

    it("应该返回空数组对于没有依赖的服务", () => {
      const userService = new MockUserService("UserService");
      registry.register("UserService", userService);

      const dependencies = registry.getServiceDependencies("UserService");
      expect(dependencies).toEqual([]);
    });

    it("应该返回空数组对于未注册的服务", () => {
      const dependencies =
        registry.getServiceDependencies("NonExistentService");
      expect(dependencies).toEqual([]);
    });
  });

  describe("unregister", () => {
    it("应该成功注销服务", () => {
      const userService = new MockUserService("UserService");
      registry.register("UserService", userService);

      expect(registry.has("UserService")).toBe(true);

      const removed = registry.unregister("UserService");
      expect(removed).toBe(true);
      expect(registry.has("UserService")).toBe(false);
    });

    it("应该返回false对于未注册的服务", () => {
      const removed = registry.unregister("NonExistentService");
      expect(removed).toBe(false);
    });
  });

  describe("getAllServiceTypes", () => {
    it("应该返回所有已注册的服务类型", () => {
      const userService = new MockUserService("UserService");
      const orderService = new MockOrderService("OrderService");

      registry.register("UserService", userService);
      registry.register("OrderService", orderService);

      const serviceTypes = registry.getAllServiceTypes();
      expect(serviceTypes).toContain("UserService");
      expect(serviceTypes).toContain("OrderService");
      expect(serviceTypes).toHaveLength(2);
    });

    it("应该返回空数组当没有注册服务时", () => {
      const serviceTypes = registry.getAllServiceTypes();
      expect(serviceTypes).toEqual([]);
    });
  });

  describe("clear", () => {
    it("应该清空所有服务", () => {
      const userService = new MockUserService("UserService");
      const orderService = new MockOrderService("OrderService");

      registry.register("UserService", userService);
      registry.register("OrderService", orderService);

      expect(registry.getAllServiceTypes()).toHaveLength(2);

      registry.clear();

      expect(registry.getAllServiceTypes()).toHaveLength(0);
      expect(registry.has("UserService")).toBe(false);
      expect(registry.has("OrderService")).toBe(false);
    });
  });
});

describe("ServiceRegistryException", () => {
  it("应该正确创建具体异常实例", () => {
    const serviceType = "TestService";
    const reason = "Test reason";
    const originalError = new Error("Original error");

    const exception = new ServiceRegistrationFailedException(
      serviceType,
      reason,
      originalError,
    );

    expect(exception.message).toContain(serviceType);
    expect(exception.message).toContain(reason);
    expect(exception.serviceType).toBe(serviceType);
    expect(exception.operation).toBe("register");
    expect(exception.originalError).toBe(originalError);
    expect(exception.name).toBe("ServiceRegistrationFailedException");
  });
});
