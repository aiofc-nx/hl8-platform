/**
 * @fileoverview 失效规则注册表单元测试
 */

import { InvalidationRuleRegistry } from "./invalidation-rule-registry.js";
import type {
  CacheInvalidationRule,
  GenericDomainEvent,
} from "./cache-invalidation-rule.interface.js";
import type { Logger } from "@hl8/logger";

describe("InvalidationRuleRegistry", () => {
  let registry: InvalidationRuleRegistry;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
    } as unknown as Logger;
    registry = new InvalidationRuleRegistry(mockLogger);
  });

  describe("register", () => {
    it("应该成功注册规则", () => {
      const rule: CacheInvalidationRule = {
        id: "rule-1",
        eventType: "TestEvent",
        enabled: true,
        priority: 100,
      };

      const result = registry.register(rule);

      expect(result).toBe(true);
      expect(registry.getRule("rule-1")).toEqual(rule);
      expect(registry.size()).toBe(1);
    });

    it("应该覆盖已存在的规则", () => {
      const rule1: CacheInvalidationRule = {
        id: "rule-1",
        eventType: "Event1",
        enabled: true,
        priority: 100,
      };
      const rule2: CacheInvalidationRule = {
        id: "rule-1",
        eventType: "Event2",
        enabled: true,
        priority: 200,
      };

      registry.register(rule1);
      registry.register(rule2);

      expect(registry.size()).toBe(1);
      expect(registry.getRule("rule-1")).toEqual(rule2);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it("应该注册支持通配符的规则", () => {
      const rule: CacheInvalidationRule = {
        id: "rule-wildcard",
        eventType: "user.*",
        enabled: true,
        priority: 100,
      };

      registry.register(rule);

      expect(registry.getRule("rule-wildcard")).toEqual(rule);
    });
  });

  describe("unregister", () => {
    it("应该成功取消注册规则", () => {
      const rule: CacheInvalidationRule = {
        id: "rule-1",
        eventType: "TestEvent",
        enabled: true,
        priority: 100,
      };

      registry.register(rule);
      const result = registry.unregister("rule-1");

      expect(result).toBe(true);
      expect(registry.getRule("rule-1")).toBeUndefined();
      expect(registry.size()).toBe(0);
    });

    it("应该在规则不存在时返回 false", () => {
      const result = registry.unregister("non-existent");

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe("match", () => {
    it("应该匹配完全相同的事件类型", () => {
      const rule: CacheInvalidationRule = {
        id: "rule-1",
        eventType: "UserUpdatedEvent",
        enabled: true,
        priority: 100,
      };

      registry.register(rule);

      const event: GenericDomainEvent = {
        eventType: "UserUpdatedEvent",
        data: { userId: "123" },
      };

      const matched = registry.match(event);

      expect(matched).toHaveLength(1);
      expect(matched[0].id).toBe("rule-1");
    });

    it("应该匹配通配符事件类型", () => {
      const rule: CacheInvalidationRule = {
        id: "rule-user",
        eventType: "user.*",
        enabled: true,
        priority: 100,
      };

      registry.register(rule);

      const event1: GenericDomainEvent = {
        eventType: "user.updated",
        data: {},
      };
      const event2: GenericDomainEvent = {
        eventType: "user.deleted",
        data: {},
      };
      const event3: GenericDomainEvent = {
        eventType: "order.created",
        data: {},
      };

      expect(registry.match(event1)).toHaveLength(1);
      expect(registry.match(event2)).toHaveLength(1);
      expect(registry.match(event3)).toHaveLength(0);
    });

    it("应该忽略禁用的规则", () => {
      const rule: CacheInvalidationRule = {
        id: "rule-disabled",
        eventType: "TestEvent",
        enabled: false,
        priority: 100,
      };

      registry.register(rule);

      const event: GenericDomainEvent = {
        eventType: "TestEvent",
        data: {},
      };

      const matched = registry.match(event);

      expect(matched).toHaveLength(0);
    });

    it("应该检查附加条件", () => {
      const rule: CacheInvalidationRule = {
        id: "rule-conditional",
        eventType: "TestEvent",
        condition: (event: GenericDomainEvent) =>
          (event.data as any).shouldInvalidate === true,
        enabled: true,
        priority: 100,
      };

      registry.register(rule);

      const event1: GenericDomainEvent = {
        eventType: "TestEvent",
        data: { shouldInvalidate: true },
      };
      const event2: GenericDomainEvent = {
        eventType: "TestEvent",
        data: { shouldInvalidate: false },
      };

      expect(registry.match(event1)).toHaveLength(1);
      expect(registry.match(event2)).toHaveLength(0);
    });

    it("应该按优先级排序匹配的规则", () => {
      const rule1: CacheInvalidationRule = {
        id: "rule-low",
        eventType: "TestEvent",
        enabled: true,
        priority: 50,
      };
      const rule2: CacheInvalidationRule = {
        id: "rule-high",
        eventType: "TestEvent",
        enabled: true,
        priority: 200,
      };
      const rule3: CacheInvalidationRule = {
        id: "rule-medium",
        eventType: "TestEvent",
        enabled: true,
        priority: 100,
      };

      registry.register(rule1);
      registry.register(rule2);
      registry.register(rule3);

      const event: GenericDomainEvent = {
        eventType: "TestEvent",
        data: {},
      };

      const matched = registry.match(event);

      expect(matched).toHaveLength(3);
      expect(matched[0].id).toBe("rule-high");
      expect(matched[1].id).toBe("rule-medium");
      expect(matched[2].id).toBe("rule-low");
    });
  });

  describe("getEnabledRules", () => {
    it("应该只返回启用的规则", () => {
      const rule1: CacheInvalidationRule = {
        id: "rule-enabled-1",
        eventType: "Event1",
        enabled: true,
        priority: 100,
      };
      const rule2: CacheInvalidationRule = {
        id: "rule-disabled",
        eventType: "Event2",
        enabled: false,
        priority: 100,
      };
      const rule3: CacheInvalidationRule = {
        id: "rule-enabled-2",
        eventType: "Event3",
        enabled: true,
        priority: 100,
      };

      registry.registerMany([rule1, rule2, rule3]);

      const enabledRules = registry.getEnabledRules();

      expect(enabledRules).toHaveLength(2);
      expect(enabledRules.map((r) => r.id)).toEqual([
        "rule-enabled-1",
        "rule-enabled-2",
      ]);
    });
  });

  describe("clear", () => {
    it("应该清空所有规则", () => {
      const rule1: CacheInvalidationRule = {
        id: "rule-1",
        eventType: "Event1",
        enabled: true,
        priority: 100,
      };
      const rule2: CacheInvalidationRule = {
        id: "rule-2",
        eventType: "Event2",
        enabled: true,
        priority: 100,
      };

      registry.registerMany([rule1, rule2]);

      registry.clear();

      expect(registry.size()).toBe(0);
      expect(registry.getRule("rule-1")).toBeUndefined();
      expect(registry.getRule("rule-2")).toBeUndefined();
    });
  });
});
