/**
 * @fileoverview UUID集成测试
 * @description 测试UUID生成器的集成功能和性能
 */

import { UuidGenerator } from "../../src/identifiers/uuid-generator.js";

describe("UUID Integration Tests", () => {
  beforeEach(() => {
    UuidGenerator.clearGenerated();
  });

  describe("性能测试", () => {
    it("应该能够快速生成大量UUID", () => {
      const count = 1000; // 使用最大批量大小
      const startTime = Date.now();

      const uuids = UuidGenerator.generateBatch(count);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(uuids).toHaveLength(count);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成

      // 验证所有UUID都是唯一的
      const uniqueUuids = new Set(uuids);
      expect(uniqueUuids.size).toBe(count);
    });

    it("应该达到99.99%的成功率", () => {
      const count = 1000; // 减少测试数量以提高速度
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < count; i++) {
        try {
          UuidGenerator.generate();
          successCount++;
        } catch {
          failureCount++;
        }
      }

      const successRate = successCount / count;
      expect(successRate).toBeGreaterThanOrEqual(0.9999);
    });
  });

  describe("冲突检测", () => {
    it("应该检测到UUID冲突", () => {
      const uuid1 = UuidGenerator.generate();
      const uuid2 = UuidGenerator.generate();

      expect(UuidGenerator.detectConflict(uuid1)).toBe(true);
      expect(UuidGenerator.detectConflict(uuid2)).toBe(true);
      expect(UuidGenerator.detectConflict("non-generated-uuid")).toBe(false);
    });

    it("应该批量检测UUID冲突", () => {
      const uuids = UuidGenerator.generateBatch(100);
      const nonGeneratedUuids = ["uuid1", "uuid2", "uuid3"];

      const allUuids = [...uuids, ...nonGeneratedUuids];
      const conflicts = UuidGenerator.detectConflicts(allUuids);

      expect(conflicts).toHaveLength(100);
      expect(conflicts).toEqual(expect.arrayContaining(uuids));
      expect(conflicts).not.toEqual(expect.arrayContaining(nonGeneratedUuids));
    });
  });

  describe("内存管理", () => {
    it("应该正确管理已生成的UUID记录", () => {
      const initialCount = UuidGenerator.getGeneratedCount();
      expect(initialCount).toBe(0);

      const uuids = UuidGenerator.generateBatch(1000);
      const afterGenerationCount = UuidGenerator.getGeneratedCount();
      expect(afterGenerationCount).toBe(1000);

      UuidGenerator.clearGenerated();
      const afterClearCount = UuidGenerator.getGeneratedCount();
      expect(afterClearCount).toBe(0);
    });

    it("应该处理大量UUID而不影响性能", () => {
      const batchSize = 1000;
      const batches = 10;

      for (let i = 0; i < batches; i++) {
        const uuids = UuidGenerator.generateBatch(batchSize);
        expect(uuids).toHaveLength(batchSize);
      }

      const totalCount = UuidGenerator.getGeneratedCount();
      expect(totalCount).toBe(batchSize * batches);
    });
  });

  describe("并发测试", () => {
    it("应该处理并发UUID生成", async () => {
      const promises = Array.from({ length: 100 }, () =>
        Promise.resolve(UuidGenerator.generate()),
      );

      const uuids = await Promise.all(promises);

      // 验证所有UUID都是唯一的
      const uniqueUuids = new Set(uuids);
      expect(uniqueUuids.size).toBe(100);

      // 验证所有UUID都是有效的
      uuids.forEach((uuid) => {
        expect(UuidGenerator.validate(uuid)).toBe(true);
      });
    });

    it("应该处理并发批量生成", async () => {
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(UuidGenerator.generateBatch(100)),
      );

      const results = await Promise.all(promises);

      // 验证所有结果都是有效的
      results.forEach((uuids) => {
        expect(uuids).toHaveLength(100);
        uuids.forEach((uuid) => {
          expect(UuidGenerator.validate(uuid)).toBe(true);
        });
      });

      // 验证所有UUID都是唯一的
      const allUuids = results.flat();
      const uniqueUuids = new Set(allUuids);
      expect(uniqueUuids.size).toBe(1000);
    });
  });

  describe("错误处理", () => {
    it("应该正确处理无效的批量生成参数", () => {
      expect(() => UuidGenerator.generateBatch(0)).toThrow();
      expect(() => UuidGenerator.generateBatch(-1)).toThrow();
      expect(() => UuidGenerator.generateBatch(1001)).toThrow();
    });

    it("应该正确处理UUID验证", () => {
      const validUuid = UuidGenerator.generate();
      const invalidUuids = [
        "not-a-uuid",
        "550e8400-e29b-41d4-a716",
        "550e8400-e29b-41d4-a716-44665544000g",
        "",
        "123",
      ];

      expect(UuidGenerator.validate(validUuid)).toBe(true);
      invalidUuids.forEach((invalidUuid) => {
        expect(UuidGenerator.validate(invalidUuid)).toBe(false);
      });
    });
  });

  describe("边界条件", () => {
    it("应该处理最大批量生成", () => {
      const maxBatchSize = 1000;
      const uuids = UuidGenerator.generateBatch(maxBatchSize);

      expect(uuids).toHaveLength(maxBatchSize);
      expect(new Set(uuids).size).toBe(maxBatchSize);
    });

    it("应该处理单个UUID生成", () => {
      const uuid = UuidGenerator.generate();
      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe("string");
      expect(UuidGenerator.validate(uuid)).toBe(true);
    });
  });
});
