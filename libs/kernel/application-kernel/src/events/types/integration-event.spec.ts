/**
 * @fileoverview 集成事件单元测试
 * @description 测试IntegrationEvent类的功能
 */

import { IntegrationEvent } from "./integration-event.js";
import { EntityId } from "@hl8/domain-kernel";

describe("IntegrationEvent", () => {
  describe("构造函数", () => {
    it("应该正确创建集成事件", () => {
      const eventId = new EntityId();
      const event = new IntegrationEvent(
        "UserCreated",
        { name: "John Doe", email: "john@example.com" },
        "user-service",
        {
          eventId,
          metadata: { source: "test" },
          version: "2.0.0",
          target: "notification-service",
          correlationId: "corr-123",
          userId: "user-456",
        },
      );

      expect(event.eventId).toBe(eventId);
      expect(event.eventType).toBe("UserCreated");
      expect(event.data).toEqual({
        name: "John Doe",
        email: "john@example.com",
      });
      expect(event.metadata).toEqual({ source: "test" });
      expect(event.version).toBe("2.0.0");
      expect(event.source).toBe("user-service");
      expect(event.target).toBe("notification-service");
      expect(event.correlationId).toBe("corr-123");
      expect(event.userId).toBe("user-456");
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it("应该使用默认值", () => {
      const event = new IntegrationEvent(
        "UserCreated",
        { name: "John Doe" },
        "user-service",
      );

      expect(event.eventId).toBeInstanceOf(EntityId);
      expect(event.eventType).toBe("UserCreated");
      expect(event.data).toEqual({ name: "John Doe" });
      expect(event.metadata).toEqual({});
      expect(event.version).toBe("1.0.0");
      expect(event.source).toBe("user-service");
      expect(event.target).toBeUndefined();
      expect(event.correlationId).toBeUndefined();
      expect(event.userId).toBeUndefined();
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it("应该验证必需参数", () => {
      expect(() => {
        new IntegrationEvent("", { name: "John Doe" }, "user-service");
      }).toThrow("集成事件类型不能为空");

      expect(() => {
        new IntegrationEvent("UserCreated", { name: "John Doe" }, "");
      }).toThrow("源服务不能为空");
    });
  });

  describe("toJSON", () => {
    it("应该正确序列化为JSON", () => {
      const eventId = new EntityId();
      const timestamp = new Date("2023-01-01T00:00:00Z");
      const event = new IntegrationEvent(
        "UserCreated",
        { name: "John Doe" },
        "user-service",
        {
          eventId,
          metadata: { source: "test" },
          timestamp,
          version: "2.0.0",
          target: "notification-service",
          correlationId: "corr-123",
          userId: "user-456",
        },
      );

      const json = event.toJSON();

      expect(json).toEqual({
        eventId: eventId.toString(),
        eventType: "UserCreated",
        data: { name: "John Doe" },
        metadata: { source: "test" },
        timestamp: timestamp.toISOString(),
        version: "2.0.0",
        source: "user-service",
        target: "notification-service",
        correlationId: "corr-123",
        userId: "user-456",
      });
    });
  });

  describe("fromJSON", () => {
    it("应该从JSON创建集成事件", () => {
      const eventId = new EntityId();
      const timestamp = new Date("2023-01-01T00:00:00Z");
      const json = {
        eventId: eventId.toString(),
        eventType: "UserCreated",
        data: { name: "John Doe" },
        metadata: { source: "test" },
        timestamp: timestamp.toISOString(),
        version: "2.0.0",
        source: "user-service",
        target: "notification-service",
        correlationId: "corr-123",
        userId: "user-456",
      };

      const event = IntegrationEvent.fromJSON(json);

      expect(event.eventId.toString()).toBe(eventId.toString());
      expect(event.eventType).toBe("UserCreated");
      expect(event.data).toEqual({ name: "John Doe" });
      expect(event.metadata).toEqual({ source: "test" });
      expect(event.timestamp).toEqual(timestamp);
      expect(event.version).toBe("2.0.0");
      expect(event.source).toBe("user-service");
      expect(event.target).toBe("notification-service");
      expect(event.correlationId).toBe("corr-123");
      expect(event.userId).toBe("user-456");
    });
  });

  describe("clone", () => {
    it("应该创建独立的克隆对象", () => {
      const event = new IntegrationEvent(
        "UserCreated",
        { name: "John Doe" },
        "user-service",
        {
          metadata: { source: "test" },
          target: "notification-service",
          correlationId: "corr-123",
          userId: "user-456",
        },
      );

      const cloned = event.clone();

      expect(cloned).not.toBe(event);
      expect(cloned.eventId).toBe(event.eventId);
      expect(cloned.eventType).toBe(event.eventType);
      expect(cloned.data).toEqual(event.data);
      expect(cloned.metadata).toEqual(event.metadata);
      expect(cloned.timestamp).toBe(event.timestamp);
      expect(cloned.version).toBe(event.version);
      expect(cloned.source).toBe(event.source);
      expect(cloned.target).toBe(event.target);
      expect(cloned.correlationId).toBe(event.correlationId);
      expect(cloned.userId).toBe(event.userId);
    });

    it("应该创建独立的数据对象", () => {
      const data = { name: "John Doe", tags: ["important"] };
      const event = new IntegrationEvent("UserCreated", data, "user-service");
      const cloned = event.clone();

      // 修改原始数据
      data.name = "Jane Doe";
      data.tags.push("urgent");

      expect(event.data).toEqual({ name: "John Doe", tags: ["important"] });
      expect(cloned.data).toEqual({ name: "John Doe", tags: ["important"] });
    });
  });

  describe("updateMetadata", () => {
    it("应该更新元数据", () => {
      const event = new IntegrationEvent(
        "UserCreated",
        { name: "John Doe" },
        "user-service",
        { metadata: { source: "test" } },
      );

      const updated = event.updateMetadata({
        priority: "high",
        tags: ["important"],
      });

      expect(updated).not.toBe(event);
      expect(updated.metadata).toEqual({
        source: "test",
        priority: "high",
        tags: ["important"],
      });
      expect(event.metadata).toEqual({ source: "test" });
    });
  });

  describe("equals", () => {
    it("应该正确比较相等的事件", () => {
      const eventId = new EntityId();
      const timestamp = new Date("2023-01-01T00:00:00Z");
      const event1 = new IntegrationEvent(
        "UserCreated",
        { name: "John Doe" },
        "user-service",
        { eventId, timestamp },
      );
      const event2 = new IntegrationEvent(
        "UserCreated",
        { name: "John Doe" },
        "user-service",
        { eventId, timestamp },
      );

      expect(event1.equals(event2)).toBe(true);
    });

    it("应该正确比较不相等的事件", () => {
      const event1 = new IntegrationEvent(
        "UserCreated",
        { name: "John Doe" },
        "user-service",
      );
      const event2 = new IntegrationEvent(
        "UserUpdated",
        { name: "John Doe" },
        "user-service",
      );

      expect(event1.equals(event2)).toBe(false);
    });

    it("应该处理null和undefined", () => {
      const event = new IntegrationEvent(
        "UserCreated",
        { name: "John Doe" },
        "user-service",
      );

      expect(event.equals(null)).toBe(false);
      expect(event.equals(undefined)).toBe(false);
    });
  });

  describe("toString", () => {
    it("应该返回正确的字符串表示", () => {
      const eventId = new EntityId();
      const timestamp = new Date("2023-01-01T00:00:00Z");
      const event = new IntegrationEvent(
        "UserCreated",
        { name: "John Doe" },
        "user-service",
        { eventId, timestamp },
      );

      const str = event.toString();
      expect(str).toBe(
        `UserCreated[${eventId.toString()}]@${timestamp.toISOString()}`,
      );
    });
  });

  describe("深度克隆", () => {
    it("应该深度克隆复杂数据", () => {
      const complexData = {
        user: {
          name: "John Doe",
          address: {
            street: "123 Main St",
            city: "New York",
          },
        },
        tags: ["important", "urgent"],
        metadata: {
          source: "test",
          version: 1,
        },
      };

      const event = new IntegrationEvent(
        "UserCreated",
        complexData,
        "user-service",
      );
      const cloned = event.clone();

      // 修改原始数据
      complexData.user.name = "Jane Doe";
      complexData.user.address.street = "456 Oak Ave";
      complexData.tags.push("new");
      complexData.metadata.version = 2;

      expect(event.data).toEqual({
        user: {
          name: "John Doe",
          address: {
            street: "123 Main St",
            city: "New York",
          },
        },
        tags: ["important", "urgent"],
        metadata: {
          source: "test",
          version: 1,
        },
      });

      expect(cloned.data).toEqual({
        user: {
          name: "John Doe",
          address: {
            street: "123 Main St",
            city: "New York",
          },
        },
        tags: ["important", "urgent"],
        metadata: {
          source: "test",
          version: 1,
        },
      });
    });
  });
});
