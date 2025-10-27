/**
 * @fileoverview 实体标识符测试
 * @description 测试EntityId值对象的各种功能
 */

import { EntityId } from "./entity-id.js";

describe("EntityId", () => {
  describe("构造函数", () => {
    it("应该能够从有效UUID创建实体标识符", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const entityId = new EntityId(uuid);

      expect(entityId.value).toBe(uuid);
      expect(entityId.isValid()).toBe(true);
    });

    it("应该能够自动生成UUID", () => {
      const entityId = new EntityId();

      expect(entityId.value).toBeDefined();
      expect(typeof entityId.value).toBe("string");
      expect(entityId.isValid()).toBe(true);
    });

    it("应该拒绝无效的UUID格式", () => {
      const invalidUuids = [
        "not-a-uuid",
        "550e8400-e29b-41d4-a716",
        "550e8400-e29b-41d4-a716-44665544000g",
        "",
        "123",
      ];

      invalidUuids.forEach((invalidUuid) => {
        expect(() => new EntityId(invalidUuid)).toThrow(
          `无效的实体标识符格式: ${invalidUuid}`,
        );
      });
    });
  });

  describe("equals", () => {
    it("应该正确比较相等的实体标识符", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const entityId1 = new EntityId(uuid);
      const entityId2 = new EntityId(uuid);

      expect(entityId1.equals(entityId2)).toBe(true);
    });

    it("应该正确比较不相等的实体标识符", () => {
      const entityId1 = new EntityId();
      const entityId2 = new EntityId();

      expect(entityId1.equals(entityId2)).toBe(false);
    });

    it("应该正确处理null和undefined", () => {
      const entityId = new EntityId();

      expect(entityId.equals(null)).toBe(false);
      expect(entityId.equals(undefined)).toBe(false);
    });

    it("应该正确处理非EntityId对象", () => {
      const entityId = new EntityId();
      const other = { value: "some-value" };

      expect(entityId.equals(other as any)).toBe(false);
    });
  });

  describe("toString", () => {
    it("应该返回UUID字符串", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const entityId = new EntityId(uuid);

      expect(entityId.toString()).toBe(uuid);
    });
  });

  describe("toJSON", () => {
    it("应该返回UUID字符串", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const entityId = new EntityId(uuid);

      expect(entityId.toJSON()).toBe(uuid);
    });
  });

  describe("isValid", () => {
    it("应该验证有效的UUID", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const entityId = new EntityId(uuid);

      expect(entityId.isValid()).toBe(true);
    });
  });

  describe("clone", () => {
    it("应该创建实体标识符的副本", () => {
      const entityId = new EntityId();
      const cloned = entityId.clone();

      expect(cloned).not.toBe(entityId);
      expect(cloned.equals(entityId)).toBe(true);
    });
  });

  describe("静态方法", () => {
    describe("fromString", () => {
      it("应该从字符串创建实体标识符", () => {
        const uuid = "550e8400-e29b-41d4-a716-446655440000";
        const entityId = EntityId.fromString(uuid);

        expect(entityId.value).toBe(uuid);
      });

      it("应该拒绝无效的字符串", () => {
        expect(() => EntityId.fromString("invalid-uuid")).toThrow(
          "无效的实体标识符格式: invalid-uuid",
        );
      });
    });

    describe("generate", () => {
      it("应该生成新的实体标识符", () => {
        const entityId = EntityId.generate();

        expect(entityId).toBeInstanceOf(EntityId);
        expect(entityId.isValid()).toBe(true);
      });
    });

    describe("isValid", () => {
      it("应该验证有效的UUID字符串", () => {
        const validUuid = "550e8400-e29b-41d4-a716-446655440000";
        expect(EntityId.isValid(validUuid)).toBe(true);
      });

      it("应该拒绝无效的UUID字符串", () => {
        const invalidUuids = [
          "not-a-uuid",
          "550e8400-e29b-41d4-a716",
          "550e8400-e29b-41d4-a716-44665544000g",
          "",
          "123",
        ];

        invalidUuids.forEach((invalidUuid) => {
          expect(EntityId.isValid(invalidUuid)).toBe(false);
        });
      });
    });

    describe("compare", () => {
      it("应该正确比较两个实体标识符", () => {
        const uuid1 = "550e8400-e29b-41d4-a716-446655440000";
        const uuid2 = "650e8400-e29b-41d4-a716-446655440001";
        const entityId1 = new EntityId(uuid1);
        const entityId2 = new EntityId(uuid2);

        const result = EntityId.compare(entityId1, entityId2);
        expect(result).toBeLessThan(0);
      });

      it("应该返回0对于相等的实体标识符", () => {
        const uuid = "550e8400-e29b-41d4-a716-446655440000";
        const entityId1 = new EntityId(uuid);
        const entityId2 = new EntityId(uuid);

        const result = EntityId.compare(entityId1, entityId2);
        expect(result).toBe(0);
      });
    });
  });

  describe("hashCode", () => {
    it("应该为相同的实体标识符生成相同的哈希值", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const entityId1 = new EntityId(uuid);
      const entityId2 = new EntityId(uuid);

      expect(entityId1.hashCode()).toBe(entityId2.hashCode());
    });

    it("应该为不同的实体标识符生成不同的哈希值", () => {
      const entityId1 = new EntityId();
      const entityId2 = new EntityId();

      expect(entityId1.hashCode()).not.toBe(entityId2.hashCode());
    });
  });

  describe("不可变性", () => {
    it("应该确保实体标识符不可变", () => {
      const entityId = new EntityId();
      const originalValue = entityId.value;

      // 验证value getter返回的是原始值
      expect(entityId.value).toBe(originalValue);

      // 验证克隆方法创建新的实例
      const cloned = entityId.clone();
      expect(cloned).not.toBe(entityId);
      expect(cloned.equals(entityId)).toBe(true);
    });
  });
});
