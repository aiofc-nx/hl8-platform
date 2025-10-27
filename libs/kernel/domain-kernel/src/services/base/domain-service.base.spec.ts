/**
 * @fileoverview 领域服务基类测试
 * @description 测试DomainService基类的各种功能
 */

import { DomainService } from "./domain-service.base.js";
import { EntityId } from "../../identifiers/entity-id.js";

// 测试用的具体领域服务实现
class TestDomainService extends DomainService {
  constructor(serviceId?: EntityId, version: number = 1) {
    super(serviceId, version);
  }

  protected getRequiredDependencies(): string[] {
    return ["database", "logger"];
  }

  protected performBusinessLogic(operation: string, params: unknown): unknown {
    if (operation === "calculate") {
      const data = params as { value: number; multiplier: number };
      return { result: data.value * data.multiplier };
    }

    if (operation === "validate") {
      const data = params as { value: string };
      return { isValid: data.value.length > 0 };
    }

    return { error: "未知操作" };
  }

  protected validateService(): void {
    if (!this.serviceId) {
      throw new Error("服务标识符不能为空");
    }
  }

  public clone(): DomainService {
    return new TestDomainService(this.serviceId, this.version);
  }
}

// 测试用的依赖项
class MockDatabase {
  public query(sql: string): unknown {
    return { result: "mock data" };
  }
}

class MockLogger {
  public log(message: string): void {
    console.log(message);
  }
}

describe("DomainService", () => {
  let service: TestDomainService;
  let serviceId: EntityId;

  beforeEach(() => {
    serviceId = new EntityId();
    service = new TestDomainService(serviceId);
  });

  describe("构造函数", () => {
    it("应该创建有效的领域服务", () => {
      expect(service.serviceId.equals(serviceId)).toBe(true);
      expect(service.version).toBe(1);
      expect(service.createdAt).toBeInstanceOf(Date);
      expect(service.dependencies.size).toBe(0);
    });

    it("应该自动生成标识符", () => {
      const autoService = new TestDomainService();

      expect(autoService.serviceId).toBeDefined();
      expect(autoService.version).toBe(1);
    });

    it("应该验证服务", () => {
      expect(() => {
        new TestDomainService(null as any);
      }).toThrow("服务标识符不能为空");
    });
  });

  describe("依赖项管理", () => {
    it("应该注册依赖项", () => {
      const database = new MockDatabase();
      service.registerDependency("database", database);

      expect(service.hasDependency("database")).toBe(true);
      expect(service.getDependency("database")).toBe(database);
    });

    it("应该获取依赖项", () => {
      const logger = new MockLogger();
      service.registerDependency("logger", logger);

      const retrievedLogger = service.getDependency<MockLogger>("logger");
      expect(retrievedLogger).toBe(logger);
    });

    it("应该检查依赖项是否存在", () => {
      expect(service.hasDependency("database")).toBe(false);

      service.registerDependency("database", new MockDatabase());
      expect(service.hasDependency("database")).toBe(true);
    });

    it("应该移除依赖项", () => {
      service.registerDependency("database", new MockDatabase());
      expect(service.removeDependency("database")).toBe(true);
      expect(service.hasDependency("database")).toBe(false);
    });

    it("应该返回依赖项映射的副本", () => {
      service.registerDependency("database", new MockDatabase());
      const dependencies = service.dependencies;

      expect(dependencies).not.toBe(service["_dependencies"]);
      expect(dependencies.size).toBe(1);
    });
  });

  describe("业务逻辑执行", () => {
    beforeEach(() => {
      service.registerDependency("database", new MockDatabase());
      service.registerDependency("logger", new MockLogger());
    });

    it("应该执行业务逻辑", () => {
      const result = service.executeBusinessLogic("calculate", {
        value: 10,
        multiplier: 2,
      });

      expect(result).toEqual({ result: 20 });
    });

    it("应该执行验证操作", () => {
      const result = service.executeBusinessLogic("validate", {
        value: "test",
      });

      expect(result).toEqual({ isValid: true });
    });

    it("应该处理未知操作", () => {
      const result = service.executeBusinessLogic("unknown", {});

      expect(result).toEqual({ error: "未知操作" });
    });

    it("应该拒绝缺少依赖项时执行业务逻辑", () => {
      service.removeDependency("database");

      expect(() => {
        service.executeBusinessLogic("calculate", { value: 10, multiplier: 2 });
      }).toThrow("缺少必需的依赖项: database");
    });
  });

  describe("equals", () => {
    it("应该正确比较相等的服务", () => {
      const sameService = new TestDomainService(serviceId, 1);

      expect(service.equals(sameService)).toBe(true);
    });

    it("应该正确比较不相等的服务", () => {
      const differentService = new TestDomainService();

      expect(service.equals(differentService)).toBe(false);
    });

    it("应该正确处理非DomainService对象", () => {
      const other = { serviceId: serviceId };
      expect(service.equals(other as any)).toBe(false);
    });

    it("应该正确处理null和undefined", () => {
      expect(service.equals(null)).toBe(false);
      expect(service.equals(undefined)).toBe(false);
    });
  });

  describe("toString", () => {
    it("应该返回字符串表示", () => {
      const str = service.toString();
      expect(str).toContain("TestDomainService");
      expect(str).toContain(serviceId.value);
      expect(str).toContain(service.createdAt.toISOString());
    });
  });

  describe("toJSON", () => {
    it("应该返回JSON表示", () => {
      service.registerDependency("database", new MockDatabase());

      const json = service.toJSON();

      expect(json).toHaveProperty("serviceId");
      expect(json).toHaveProperty("createdAt");
      expect(json).toHaveProperty("version");
      expect(json).toHaveProperty("serviceType");
      expect(json).toHaveProperty("dependencies");
    });
  });

  describe("clone", () => {
    it("应该创建服务的副本", () => {
      service.registerDependency("database", new MockDatabase());
      const cloned = service.clone();

      expect(cloned).not.toBe(service);
      expect(cloned.equals(service)).toBe(true);
      expect(cloned.serviceId.equals(service.serviceId)).toBe(true);
      expect(cloned.version).toBe(service.version);
    });
  });

  describe("reset", () => {
    it("应该重置服务状态", () => {
      service.registerDependency("database", new MockDatabase());
      service.registerDependency("logger", new MockLogger());

      expect(service.dependencies.size).toBe(2);

      service.reset();

      expect(service.dependencies.size).toBe(0);
    });
  });

  describe("getStats", () => {
    it("应该返回服务统计信息", () => {
      service.registerDependency("database", new MockDatabase());

      const stats = service.getStats();

      expect(stats.serviceId).toBe(serviceId.value);
      expect(stats.serviceType).toBe("TestDomainService");
      expect(stats.version).toBe(1);
      expect(stats.dependencyCount).toBe(1);
      expect(stats.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("不可变性", () => {
    it("应该确保服务标识符不可变", () => {
      const originalServiceId = service.serviceId;
      const clonedServiceId = service.serviceId;

      expect(clonedServiceId).not.toBe(originalServiceId);
      expect(clonedServiceId.equals(originalServiceId)).toBe(true);
    });

    it("应该确保创建时间不可变", () => {
      const originalCreatedAt = service.createdAt;
      const clonedCreatedAt = service.createdAt;

      expect(clonedCreatedAt).not.toBe(originalCreatedAt);
      expect(clonedCreatedAt.getTime()).toBe(originalCreatedAt.getTime());
    });
  });

  describe("边界情况", () => {
    it("应该处理空依赖项名称", () => {
      service.registerDependency("", new MockDatabase());
      expect(service.hasDependency("")).toBe(true);
    });

    it("应该处理undefined依赖项", () => {
      service.registerDependency("undefined", undefined);
      expect(service.getDependency("undefined")).toBeUndefined();
    });

    it("应该处理null依赖项", () => {
      service.registerDependency("null", null);
      expect(service.getDependency("null")).toBeNull();
    });
  });
});
