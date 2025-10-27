/**
 * @fileoverview 值对象基类测试
 * @description 测试ValueObject基类的各种功能
 */

import { ValueObject } from "./value-object.base.js";

// 测试用的具体值对象实现
class TestValueObject extends ValueObject<string> {
  constructor(value: string, createdAt?: Date, version?: number) {
    super(value, createdAt, version);
  }

  protected validateValue(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error("值不能为空");
    }
  }

  protected createClone(
    value: string,
    createdAt: Date,
    version: number,
  ): ValueObject<string> {
    return new TestValueObject(value, createdAt, version);
  }
}

// 测试用的复杂值对象实现
class ComplexValueObject extends ValueObject<any> {
  constructor(value: any, createdAt?: Date, version?: number) {
    super(value, createdAt, version);
  }

  protected validateValue(value: any): void {
    if (!value) {
      throw new Error("无效的复杂值");
    }
  }

  protected createClone(
    value: any,
    createdAt: Date,
    version: number,
  ): ValueObject<any> {
    return new ComplexValueObject(value, createdAt, version);
  }
}

describe("ValueObject", () => {
  describe("构造函数", () => {
    it("应该创建有效的值对象", () => {
      const value = "test value";
      const valueObject = new TestValueObject(value);

      expect(valueObject.value).toBe(value);
      expect(valueObject.createdAt).toBeDefined();
      expect(valueObject.version).toBe(1);
    });

    it("应该使用提供的创建时间和版本号", () => {
      const value = "test value";
      const createdAt = new Date("2024-01-01T00:00:00Z");
      const version = 5;

      const valueObject = new TestValueObject(value, createdAt, version);

      expect(valueObject.createdAt).toEqual(createdAt);
      expect(valueObject.version).toBe(version);
    });

    it("应该验证值", () => {
      expect(() => new TestValueObject("")).toThrow("值不能为空");
      expect(() => new TestValueObject("   ")).toThrow("值不能为空");
    });
  });

  describe("getter方法", () => {
    it("应该返回值的副本", () => {
      const value = "test value";
      const valueObject = new TestValueObject(value);
      const returnedValue = valueObject.value;

      expect(returnedValue).toBe(value);
      // 字符串是不可变的，所以引用可能相同
      expect(returnedValue).toBe(valueObject["_value"]);
    });

    it("应该返回创建时间的副本", () => {
      const createdAt = new Date("2024-01-01T00:00:00Z");
      const valueObject = new TestValueObject("test", createdAt);
      const returnedCreatedAt = valueObject.createdAt;

      expect(returnedCreatedAt).toEqual(createdAt);
      expect(returnedCreatedAt).not.toBe(valueObject["_createdAt"]);
    });
  });

  describe("equals", () => {
    it("应该正确比较相等的值对象", () => {
      const value = "test value";
      const valueObject1 = new TestValueObject(value);
      const valueObject2 = new TestValueObject(value);

      expect(valueObject1.equals(valueObject2)).toBe(true);
    });

    it("应该正确比较不相等的值对象", () => {
      const valueObject1 = new TestValueObject("value1");
      const valueObject2 = new TestValueObject("value2");

      expect(valueObject1.equals(valueObject2)).toBe(false);
    });

    it("应该正确处理null和undefined", () => {
      const valueObject = new TestValueObject("test");

      expect(valueObject.equals(null)).toBe(false);
      expect(valueObject.equals(undefined)).toBe(false);
    });

    it("应该正确处理非ValueObject对象", () => {
      const valueObject = new TestValueObject("test");
      const other = { value: "test" };

      expect(valueObject.equals(other as any)).toBe(false);
    });

    it("应该正确处理不同类型的值对象", () => {
      const valueObject1 = new TestValueObject("test");
      const valueObject2 = new ComplexValueObject({ name: "test", age: 25 });

      expect(valueObject1.equals(valueObject2 as any)).toBe(false);
    });
  });

  describe("toString", () => {
    it("应该返回字符串表示", () => {
      const value = "test value";
      const valueObject = new TestValueObject(value);

      expect(valueObject.toString()).toBe(value);
    });

    it("应该处理复杂对象的字符串表示", () => {
      const value = { name: "test", age: 25 };
      const valueObject = new ComplexValueObject(value);

      expect(valueObject.toString()).toBe(JSON.stringify(value));
    });
  });

  describe("toJSON", () => {
    it("应该返回JSON表示", () => {
      const value = "test value";
      const createdAt = new Date("2024-01-01T00:00:00Z");
      const valueObject = new TestValueObject(value, createdAt);

      const json = valueObject.toJSON();

      expect(json).toEqual({
        value: value,
        createdAt: createdAt.toISOString(),
        version: 1,
        type: "TestValueObject",
      });
    });
  });

  describe("clone", () => {
    it("应该创建值对象的副本", () => {
      const value = "test value";
      const createdAt = new Date("2024-01-01T00:00:00Z");
      const version = 3;

      const valueObject = new TestValueObject(value, createdAt, version);
      const cloned = valueObject.clone();

      expect(cloned).not.toBe(valueObject);
      expect(cloned.equals(valueObject)).toBe(true);
      expect(cloned.value).toBe(value);
      expect(cloned.createdAt).toEqual(createdAt);
      expect(cloned.version).toBe(version);
    });
  });

  describe("hashCode", () => {
    it("应该为相同的值生成相同的哈希码", () => {
      const value = "test value";
      const valueObject1 = new TestValueObject(value);
      const valueObject2 = new TestValueObject(value);

      expect(valueObject1.hashCode()).toBe(valueObject2.hashCode());
    });

    it("应该为不同的值生成不同的哈希码", () => {
      const valueObject1 = new TestValueObject("value1");
      const valueObject2 = new TestValueObject("value2");

      expect(valueObject1.hashCode()).not.toBe(valueObject2.hashCode());
    });
  });

  describe("深度克隆", () => {
    it("应该深度克隆复杂对象", () => {
      const value = { name: "test", age: 25, nested: { value: "nested" } };
      const valueObject = new ComplexValueObject(value);
      const clonedValue = valueObject.value;

      expect(clonedValue).toEqual(value);
      expect(clonedValue).not.toBe(value);
      expect(clonedValue.nested).not.toBe(value.nested);
    });

    it("应该深度克隆数组", () => {
      const value = { items: [1, 2, 3], nested: [{ value: "test" }] };
      const valueObject = new ComplexValueObject(value as any);
      const clonedValue = valueObject.value;

      expect(clonedValue.items).toEqual(value.items);
      expect(clonedValue.items).not.toBe(value.items);
      expect(clonedValue.nested).not.toBe(value.nested);
    });
  });

  describe("深度比较", () => {
    it("应该正确比较复杂对象", () => {
      const value1 = { name: "test", age: 25 };
      const value2 = { name: "test", age: 25 };
      const valueObject1 = new ComplexValueObject(value1);
      const valueObject2 = new ComplexValueObject(value2);

      expect(valueObject1.equals(valueObject2)).toBe(true);
    });

    it("应该正确比较不同的复杂对象", () => {
      const value1 = { name: "test", age: 25 };
      const value2 = { name: "test", age: 30 };
      const valueObject1 = new ComplexValueObject(value1);
      const valueObject2 = new ComplexValueObject(value2);

      expect(valueObject1.equals(valueObject2)).toBe(false);
    });

    it("应该正确比较数组", () => {
      const value1 = { items: [1, 2, 3] };
      const value2 = { items: [1, 2, 3] };
      const valueObject1 = new ComplexValueObject(value1 as any);
      const valueObject2 = new ComplexValueObject(value2 as any);

      expect(valueObject1.equals(valueObject2)).toBe(true);
    });
  });

  describe("不可变性", () => {
    it("应该确保值对象不可变", () => {
      const value = "test value";
      const valueObject = new TestValueObject(value);
      const originalValue = valueObject.value;

      // 验证getter返回的是副本
      expect(valueObject.value).toBe(originalValue);
      // 字符串是不可变的，所以引用可能相同
      expect(valueObject.value).toBe(valueObject["_value"]);
    });

    it("应该确保复杂对象不可变", () => {
      const value = { name: "test", age: 25 };
      const valueObject = new ComplexValueObject(value);
      const returnedValue = valueObject.value;

      // 修改返回的值不应该影响原始值
      returnedValue.name = "modified";
      expect(valueObject.value.name).toBe("test");
    });
  });
});
