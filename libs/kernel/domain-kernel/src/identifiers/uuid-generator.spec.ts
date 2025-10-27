/**
 * @fileoverview UUID生成器测试
 * @description 测试UUID生成器的各种功能
 */

import { UuidGenerator } from "./uuid-generator.js";

describe("UuidGenerator", () => {
  beforeEach(() => {
    // 清空已生成的UUID记录
    UuidGenerator.clearGenerated();
  });

  describe("generate", () => {
    it("应该生成有效的UUID v4", () => {
      const uuid = UuidGenerator.generate();

      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe("string");
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it("应该生成唯一的UUID", () => {
      const uuid1 = UuidGenerator.generate();
      const uuid2 = UuidGenerator.generate();

      expect(uuid1).not.toBe(uuid2);
    });

    it("应该记录生成的UUID", () => {
      const uuid = UuidGenerator.generate();

      expect(UuidGenerator.isGenerated(uuid)).toBe(true);
    });

    it("应该能够生成多个UUID", () => {
      const count = 100;
      const uuids: string[] = [];

      for (let i = 0; i < count; i++) {
        uuids.push(UuidGenerator.generate());
      }

      expect(uuids).toHaveLength(count);
      expect(new Set(uuids).size).toBe(count); // 确保所有UUID都是唯一的
    });
  });

  describe("generateBatch", () => {
    it("应该批量生成指定数量的UUID", () => {
      const count = 10;
      const uuids = UuidGenerator.generateBatch(count);

      expect(uuids).toHaveLength(count);
      expect(new Set(uuids).size).toBe(count); // 确保所有UUID都是唯一的
    });

    it("应该验证所有生成的UUID格式", () => {
      const count = 50;
      const uuids = UuidGenerator.generateBatch(count);

      uuids.forEach((uuid) => {
        expect(UuidGenerator.validate(uuid)).toBe(true);
      });
    });

    it("应该拒绝无效的批量生成数量", () => {
      expect(() => UuidGenerator.generateBatch(0)).toThrow(
        "批量生成数量必须大于0",
      );
      expect(() => UuidGenerator.generateBatch(-1)).toThrow(
        "批量生成数量必须大于0",
      );
      expect(() => UuidGenerator.generateBatch(1001)).toThrow(
        "批量生成数量不能超过1000",
      );
    });

    it("应该记录批量生成的UUID", () => {
      const count = 5;
      const uuids = UuidGenerator.generateBatch(count);

      uuids.forEach((uuid) => {
        expect(UuidGenerator.isGenerated(uuid)).toBe(true);
      });
    });
  });

  describe("validate", () => {
    it("应该验证有效的UUID v4", () => {
      const validUuid = "550e8400-e29b-41d4-a716-446655440000";
      expect(UuidGenerator.validate(validUuid)).toBe(true);
    });

    it("应该拒绝无效的UUID格式", () => {
      const invalidUuids = [
        "not-a-uuid",
        "550e8400-e29b-41d4-a716",
        "550e8400-e29b-41d4-a716-44665544000g",
        "",
        "123",
        null as any,
        undefined as any,
      ];

      invalidUuids.forEach((invalidUuid) => {
        expect(UuidGenerator.validate(invalidUuid)).toBe(false);
      });
    });
  });

  describe("isGenerated", () => {
    it("应该正确识别已生成的UUID", () => {
      const uuid = UuidGenerator.generate();
      expect(UuidGenerator.isGenerated(uuid)).toBe(true);
    });

    it("应该正确识别未生成的UUID", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      expect(UuidGenerator.isGenerated(uuid)).toBe(false);
    });
  });

  describe("clearGenerated", () => {
    it("应该清空已生成的UUID记录", () => {
      UuidGenerator.generate();
      expect(UuidGenerator.getGeneratedCount()).toBeGreaterThan(0);

      UuidGenerator.clearGenerated();
      expect(UuidGenerator.getGeneratedCount()).toBe(0);
    });
  });

  describe("getGeneratedCount", () => {
    it("应该正确返回已生成的UUID数量", () => {
      expect(UuidGenerator.getGeneratedCount()).toBe(0);

      UuidGenerator.generate();
      expect(UuidGenerator.getGeneratedCount()).toBe(1);

      UuidGenerator.generateBatch(5);
      expect(UuidGenerator.getGeneratedCount()).toBe(6);
    });
  });

  describe("性能测试", () => {
    it("应该能够快速生成大量UUID", () => {
      const startTime = Date.now();
      const count = 1000;

      UuidGenerator.generateBatch(count);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 应该在1秒内完成1000个UUID的生成
      expect(duration).toBeLessThan(1000);
    });
  });
});
