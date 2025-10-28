/**
 * @fileoverview 事件快照单元测试
 * @description 测试EventSnapshot类的功能
 */

import { EventSnapshot } from "./event-snapshot.js";
import { EntityId } from "@hl8/domain-kernel";

describe("EventSnapshot", () => {
  let aggregateId: EntityId;
  let testState: { name: string; email: string };
  let timestamp: Date;

  beforeEach(() => {
    aggregateId = new EntityId();
    testState = { name: "John Doe", email: "john@example.com" };
    timestamp = new Date("2024-01-01T00:00:00Z");
  });

  describe("constructor", () => {
    it("应该正确创建快照", () => {
      const snapshot = new EventSnapshot(
        aggregateId,
        5,
        testState,
        "UserSnapshot",
        {},
        timestamp,
      );

      expect(snapshot.aggregateId).toBe(aggregateId);
      expect(snapshot.version).toBe(5);
      expect(snapshot.data).toEqual(testState);
      expect(snapshot.type).toBe("UserSnapshot");
      expect(snapshot.timestamp).toBe(timestamp);
    });

    it("应该使用当前时间作为默认时间戳", () => {
      const before = new Date();
      const snapshot = new EventSnapshot(
        aggregateId,
        5,
        testState,
        "UserSnapshot",
      );
      const after = new Date();

      expect(snapshot.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(snapshot.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("toJSON", () => {
    it("应该正确序列化为JSON", () => {
      const snapshot = new EventSnapshot(
        aggregateId,
        5,
        testState,
        "UserSnapshot",
        {},
        timestamp,
      );

      const json = snapshot.toJSON();

      expect(json).toEqual({
        aggregateId: aggregateId.toString(),
        version: 5,
        data: testState,
        type: "UserSnapshot",
        metadata: {},
        timestamp: timestamp.toISOString(),
      });
    });

    it("应该处理复杂状态对象", () => {
      const complexState = {
        user: { name: "John", age: 30 },
        settings: { theme: "dark", notifications: true },
        metadata: { created: new Date(), tags: ["premium", "active"] },
      };

      const snapshot = new EventSnapshot(
        aggregateId,
        10,
        complexState,
        "ComplexSnapshot",
        {},
        timestamp,
      );

      const json = snapshot.toJSON();

      expect(json.data).toEqual(complexState);
      expect(json.version).toBe(10);
      expect(json.type).toBe("ComplexSnapshot");
    });
  });

  describe("basic functionality", () => {
    it("应该正确访问所有属性", () => {
      const snapshot = new EventSnapshot(
        aggregateId,
        5,
        testState,
        "UserSnapshot",
        {},
        timestamp,
      );

      expect(snapshot.aggregateId).toBe(aggregateId);
      expect(snapshot.version).toBe(5);
      expect(snapshot.data).toEqual(testState);
      expect(snapshot.type).toBe("UserSnapshot");
      expect(snapshot.timestamp).toBe(timestamp);
      expect(snapshot.metadata).toEqual({});
    });
  });
});
