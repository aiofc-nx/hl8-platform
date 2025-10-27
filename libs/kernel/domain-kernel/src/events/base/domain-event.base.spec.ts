/**
 * @fileoverview 领域事件基类测试
 * @description 测试DomainEvent基类的各种功能
 */

import { DomainEvent } from "./domain-event.base.js";
import { EntityId } from "../../identifiers/entity-id.js";

// 测试用的具体领域事件实现
class TestDomainEvent extends DomainEvent {
  constructor(
    aggregateRootId: EntityId,
    eventType: string,
    data: unknown,
    metadata: Record<string, unknown> = {},
    eventId?: EntityId,
    timestamp?: Date,
    version: number = 1,
  ) {
    super(
      aggregateRootId,
      eventType,
      data,
      metadata,
      eventId,
      timestamp,
      version,
    );
  }

  protected validateEvent(): void {
    if (!this.eventType) {
      throw new Error("事件类型不能为空");
    }
    if (!this.aggregateRootId || !this.aggregateRootId.isValid()) {
      throw new Error("聚合根标识符不能为空");
    }
  }

  public clone(): DomainEvent {
    return new TestDomainEvent(
      this.aggregateRootId,
      this.eventType,
      this.data,
      this.metadata,
      this.eventId,
      this.timestamp,
      this.version,
    );
  }
}

describe("DomainEvent", () => {
  let aggregateRootId: EntityId;
  let eventId: EntityId;
  let domainEvent: TestDomainEvent;

  beforeEach(() => {
    aggregateRootId = new EntityId();
    eventId = new EntityId();
    domainEvent = new TestDomainEvent(
      aggregateRootId,
      "TestEvent",
      { message: "test data" },
      { source: "test" },
      eventId,
    );
  });

  describe("构造函数", () => {
    it("应该创建有效的领域事件", () => {
      expect(domainEvent.eventId.equals(eventId)).toBe(true);
      expect(domainEvent.aggregateRootId.equals(aggregateRootId)).toBe(true);
      expect(domainEvent.eventType).toBe("TestEvent");
      expect(domainEvent.data).toEqual({ message: "test data" });
      expect(domainEvent.metadata).toEqual({ source: "test" });
      expect(domainEvent.version).toBe(1);
    });

    it("应该自动生成标识符和时间戳", () => {
      const autoEvent = new TestDomainEvent(aggregateRootId, "AutoEvent", {
        data: "auto",
      });

      expect(autoEvent.eventId).toBeDefined();
      expect(autoEvent.timestamp).toBeInstanceOf(Date);
      expect(autoEvent.version).toBe(1);
    });

    it("应该验证事件", () => {
      expect(() => {
        new TestDomainEvent(aggregateRootId, "", { data: "invalid" });
      }).toThrow("事件类型不能为空");

      expect(() => {
        new TestDomainEvent(null as any, "ValidEvent", { data: "invalid" });
      }).toThrow("聚合根标识符不能为空");
    });
  });

  describe("getter方法", () => {
    it("应该返回事件标识符的副本", () => {
      const eventId = domainEvent.eventId;
      expect(eventId).not.toBe(domainEvent["_eventId"]);
      expect(eventId.equals(domainEvent["_eventId"])).toBe(true);
    });

    it("应该返回聚合根标识符的副本", () => {
      const aggregateId = domainEvent.aggregateRootId;
      expect(aggregateId).not.toBe(domainEvent["_aggregateRootId"]);
      expect(aggregateId.equals(domainEvent["_aggregateRootId"])).toBe(true);
    });

    it("应该返回时间戳的副本", () => {
      const timestamp = domainEvent.timestamp;
      expect(timestamp).not.toBe(domainEvent["_timestamp"]);
      expect(timestamp.getTime()).toBe(domainEvent["_timestamp"].getTime());
    });

    it("应该返回事件数据的副本", () => {
      const data = domainEvent.data;
      expect(data).not.toBe(domainEvent["_data"]);
      expect(data).toEqual(domainEvent["_data"]);
    });

    it("应该返回元数据的副本", () => {
      const metadata = domainEvent.metadata;
      expect(metadata).not.toBe(domainEvent["_metadata"]);
      expect(metadata).toEqual(domainEvent["_metadata"]);
    });
  });

  describe("equals", () => {
    it("应该正确比较相等的事件", () => {
      const sameEvent = new TestDomainEvent(
        aggregateRootId,
        "TestEvent",
        { message: "test data" },
        { source: "test" },
        eventId,
        domainEvent.timestamp,
        domainEvent.version,
      );

      expect(domainEvent.equals(sameEvent)).toBe(true);
    });

    it("应该正确比较不相等的事件", () => {
      const differentEvent = new TestDomainEvent(
        new EntityId(),
        "DifferentEvent",
        { message: "different data" },
      );

      expect(domainEvent.equals(differentEvent)).toBe(false);
    });

    it("应该正确处理非DomainEvent对象", () => {
      const other = { eventId: eventId };
      expect(domainEvent.equals(other as any)).toBe(false);
    });

    it("应该正确处理null和undefined", () => {
      expect(domainEvent.equals(null)).toBe(false);
      expect(domainEvent.equals(undefined)).toBe(false);
    });
  });

  describe("toString", () => {
    it("应该返回字符串表示", () => {
      const str = domainEvent.toString();
      expect(str).toContain("TestEvent");
      expect(str).toContain(eventId.value);
      expect(str).toContain(domainEvent.timestamp.toISOString());
    });
  });

  describe("toJSON", () => {
    it("应该返回JSON表示", () => {
      const json = domainEvent.toJSON();

      expect(json).toHaveProperty("eventId");
      expect(json).toHaveProperty("aggregateRootId");
      expect(json).toHaveProperty("timestamp");
      expect(json).toHaveProperty("version");
      expect(json).toHaveProperty("eventType");
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("metadata");
    });
  });

  describe("clone", () => {
    it("应该创建事件的副本", () => {
      const cloned = domainEvent.clone();

      expect(cloned).not.toBe(domainEvent);
      expect(cloned.equals(domainEvent)).toBe(true);
      expect(cloned.eventType).toBe(domainEvent.eventType);
      expect(cloned.data).toEqual(domainEvent.data);
    });
  });

  describe("深度克隆", () => {
    it("应该深度克隆复杂数据", () => {
      const complexData = {
        message: "test",
        nested: {
          value: 42,
        },
        date: new Date(),
      };

      const event = new TestDomainEvent(
        aggregateRootId,
        "ComplexEvent",
        complexData,
      );

      const clonedData = event.data as typeof complexData;
      expect(clonedData).toEqual(complexData);
      expect(clonedData).not.toBe(complexData);
      expect(clonedData.nested).not.toBe(complexData.nested);
      expect(clonedData.date).not.toBe(complexData.date);
      expect(clonedData.date).toEqual(complexData.date);
    });
  });

  describe("深度比较", () => {
    it("应该正确比较复杂对象", () => {
      const data1 = {
        message: "test",
        nested: { value: 42 },
        array: [1, 2, 3],
      };

      const data2 = {
        message: "test",
        nested: { value: 42 },
        array: [1, 2, 3],
      };

      const event1 = new TestDomainEvent(aggregateRootId, "Event1", data1);
      const event2 = new TestDomainEvent(aggregateRootId, "Event1", data2);

      expect(event1.equals(event2)).toBe(false); // 不同的eventId
    });
  });

  describe("不可变性", () => {
    it("应该确保事件不可变", () => {
      const originalData = domainEvent.data;
      const originalMetadata = domainEvent.metadata;

      // 尝试修改返回的数据
      if (typeof originalData === "object" && originalData !== null) {
        (originalData as any).newProperty = "modified";
      }

      if (typeof originalMetadata === "object" && originalMetadata !== null) {
        (originalMetadata as any).newProperty = "modified";
      }

      // 验证原始数据没有被修改
      expect(domainEvent.data).toEqual({ message: "test data" });
      expect(domainEvent.metadata).toEqual({ source: "test" });
    });
  });

  describe("边界情况", () => {
    it("应该处理null和undefined数据", () => {
      const nullEvent = new TestDomainEvent(aggregateRootId, "NullEvent", null);
      const undefinedEvent = new TestDomainEvent(
        aggregateRootId,
        "UndefinedEvent",
        undefined,
      );

      expect(nullEvent.data).toBeNull();
      expect(undefinedEvent.data).toBeUndefined();
    });

    it("应该处理空对象和数组", () => {
      const emptyObjectEvent = new TestDomainEvent(
        aggregateRootId,
        "EmptyObject",
        {},
      );
      const emptyArrayEvent = new TestDomainEvent(
        aggregateRootId,
        "EmptyArray",
        [],
      );

      expect(emptyObjectEvent.data).toEqual({});
      expect(emptyArrayEvent.data).toEqual([]);
    });

    it("应该处理特殊值", () => {
      const specialValues = [0, "", false, NaN, Infinity, -Infinity];

      for (const value of specialValues) {
        const event = new TestDomainEvent(
          aggregateRootId,
          "SpecialEvent",
          value,
        );
        expect(event.data).toBe(value);
      }
    });
  });
});
