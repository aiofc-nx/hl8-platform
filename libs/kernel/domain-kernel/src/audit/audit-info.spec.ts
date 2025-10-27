/**
 * @fileoverview 审计信息测试
 * @description 测试AuditInfo值对象的各种功能
 */

import { AuditInfo } from "./audit-info.js";
import { EntityId } from "../identifiers/entity-id.js";

describe("AuditInfo", () => {
  let createdBy: EntityId;
  let updatedBy: EntityId;
  let auditInfo: AuditInfo;

  beforeEach(() => {
    createdBy = new EntityId();
    updatedBy = new EntityId();
    auditInfo = new AuditInfo(
      new Date("2024-01-01T00:00:00Z"),
      new Date("2024-01-02T00:00:00Z"),
      createdBy,
      updatedBy,
      1,
    );
  });

  describe("构造函数", () => {
    it("应该创建有效的审计信息", () => {
      expect(auditInfo.createdAt).toEqual(new Date("2024-01-01T00:00:00Z"));
      expect(auditInfo.updatedAt).toEqual(new Date("2024-01-02T00:00:00Z"));
      expect(auditInfo.createdBy.equals(createdBy)).toBe(true);
      expect(auditInfo.updatedBy.equals(updatedBy)).toBe(true);
      expect(auditInfo.version).toBe(1);
    });

    it("应该验证数据完整性", () => {
      expect(() => auditInfo.validateIntegrity()).not.toThrow();
    });

    it("应该拒绝创建时间晚于更新时间的情况", () => {
      expect(() => {
        new AuditInfo(
          new Date("2024-01-02T00:00:00Z"),
          new Date("2024-01-01T00:00:00Z"),
          createdBy,
          updatedBy,
          1,
        );
      }).toThrow("创建时间不能晚于更新时间");
    });

    it("应该拒绝版本号小于1的情况", () => {
      expect(() => {
        new AuditInfo(
          new Date("2024-01-01T00:00:00Z"),
          new Date("2024-01-02T00:00:00Z"),
          createdBy,
          updatedBy,
          0,
        );
      }).toThrow("版本号必须大于等于1");
    });
  });

  describe("getter方法", () => {
    it("应该返回创建时间的副本", () => {
      const createdAt = auditInfo.createdAt;
      createdAt.setTime(0);
      expect(auditInfo.createdAt).not.toEqual(createdAt);
    });

    it("应该返回更新时间的副本", () => {
      const updatedAt = auditInfo.updatedAt;
      updatedAt.setTime(0);
      expect(auditInfo.updatedAt).not.toEqual(updatedAt);
    });

    it("应该返回创建者ID的副本", () => {
      const createdByCopy = auditInfo.createdBy;
      expect(createdByCopy).not.toBe(auditInfo.createdBy);
      expect(createdByCopy.equals(auditInfo.createdBy)).toBe(true);
    });

    it("应该返回更新者ID的副本", () => {
      const updatedByCopy = auditInfo.updatedBy;
      expect(updatedByCopy).not.toBe(auditInfo.updatedBy);
      expect(updatedByCopy.equals(auditInfo.updatedBy)).toBe(true);
    });
  });

  describe("update方法", () => {
    it("应该创建新的审计信息实例", () => {
      const newUpdatedBy = new EntityId();
      const updatedAuditInfo = auditInfo.update(newUpdatedBy);

      expect(updatedAuditInfo).not.toBe(auditInfo);
      expect(updatedAuditInfo.createdBy.equals(auditInfo.createdBy)).toBe(true);
      expect(updatedAuditInfo.updatedBy.equals(newUpdatedBy)).toBe(true);
      expect(updatedAuditInfo.version).toBe(auditInfo.version + 1);
    });

    it("应该更新时间为当前时间", () => {
      const beforeUpdate = new Date();
      const newUpdatedBy = new EntityId();
      const updatedAuditInfo = auditInfo.update(newUpdatedBy);
      const afterUpdate = new Date();

      expect(updatedAuditInfo.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime(),
      );
      expect(updatedAuditInfo.updatedAt.getTime()).toBeLessThanOrEqual(
        afterUpdate.getTime(),
      );
    });
  });

  describe("getChecksum方法", () => {
    it("应该返回校验和", () => {
      const checksum = auditInfo.getChecksum();
      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe("string");
      expect(checksum.length).toBe(64); // SHA256哈希长度
    });

    it("应该为相同数据生成相同校验和", () => {
      const checksum1 = auditInfo.getChecksum();
      const checksum2 = auditInfo.getChecksum();
      expect(checksum1).toBe(checksum2);
    });
  });

  describe("validateIntegrity方法", () => {
    it("应该验证有效的审计信息", () => {
      expect(auditInfo.validateIntegrity()).toBe(true);
    });

    it("应该检测校验和不匹配", () => {
      // 模拟校验和不匹配的情况
      const originalChecksum = (auditInfo as any)._checksum;
      (auditInfo as any)._checksum = "invalid-checksum";

      expect(() => auditInfo.validateIntegrity()).toThrow(
        "审计信息校验和验证失败",
      );

      // 恢复原始校验和
      (auditInfo as any)._checksum = originalChecksum;
    });
  });

  describe("toJSON方法", () => {
    it("应该返回JSON表示", () => {
      const json = auditInfo.toJSON();
      expect(json).toEqual({
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
        createdBy: createdBy.toJSON(),
        updatedBy: updatedBy.toJSON(),
        version: 1,
        checksum: auditInfo.checksum,
      });
    });
  });

  describe("equals方法", () => {
    it("应该正确比较相等的审计信息", () => {
      const sameAuditInfo = new AuditInfo(
        new Date("2024-01-01T00:00:00Z"),
        new Date("2024-01-02T00:00:00Z"),
        createdBy,
        updatedBy,
        1,
      );

      expect(auditInfo.equals(sameAuditInfo)).toBe(true);
    });

    it("应该正确比较不相等的审计信息", () => {
      const differentAuditInfo = new AuditInfo(
        new Date("2024-01-01T00:00:00Z"),
        new Date("2024-01-02T00:00:00Z"),
        createdBy,
        new EntityId(),
        1,
      );

      expect(auditInfo.equals(differentAuditInfo)).toBe(false);
    });

    it("应该正确处理null和undefined", () => {
      expect(auditInfo.equals(null)).toBe(false);
      expect(auditInfo.equals(undefined)).toBe(false);
    });

    it("应该正确处理非AuditInfo对象", () => {
      const other = { createdAt: new Date() };
      expect(auditInfo.equals(other as any)).toBe(false);
    });
  });

  describe("静态方法", () => {
    describe("create", () => {
      it("应该创建初始审计信息", () => {
        const initialAuditInfo = AuditInfo.create(createdBy);

        expect(initialAuditInfo.createdBy.equals(createdBy)).toBe(true);
        expect(initialAuditInfo.updatedBy.equals(createdBy)).toBe(true);
        expect(initialAuditInfo.version).toBe(1);
        expect(initialAuditInfo.createdAt.getTime()).toBeCloseTo(
          initialAuditInfo.updatedAt.getTime(),
          100,
        );
      });
    });

    describe("fromJSON", () => {
      it("应该从JSON创建审计信息", () => {
        const json = {
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z",
          createdBy: createdBy.toJSON(),
          updatedBy: updatedBy.toJSON(),
          version: 1,
        };

        const auditInfoFromJson = AuditInfo.fromJSON(json);

        expect(auditInfoFromJson.createdAt).toEqual(
          new Date("2024-01-01T00:00:00.000Z"),
        );
        expect(auditInfoFromJson.updatedAt).toEqual(
          new Date("2024-01-02T00:00:00.000Z"),
        );
        expect(auditInfoFromJson.createdBy.equals(createdBy)).toBe(true);
        expect(auditInfoFromJson.updatedBy.equals(updatedBy)).toBe(true);
        expect(auditInfoFromJson.version).toBe(1);
      });
    });
  });

  describe("不可变性", () => {
    it("应该确保审计信息不可变", () => {
      const originalCreatedAt = auditInfo.createdAt;
      const originalUpdatedAt = auditInfo.updatedAt;
      const originalCreatedBy = auditInfo.createdBy;
      const originalUpdatedBy = auditInfo.updatedBy;
      const originalVersion = auditInfo.version;

      // 验证getter返回的是原始值
      expect(auditInfo.createdAt).toEqual(originalCreatedAt);
      expect(auditInfo.updatedAt).toEqual(originalUpdatedAt);
      expect(auditInfo.createdBy.equals(originalCreatedBy)).toBe(true);
      expect(auditInfo.updatedBy.equals(originalUpdatedBy)).toBe(true);
      expect(auditInfo.version).toBe(originalVersion);

      // 验证getter返回的是副本，不是原始引用
      expect(auditInfo.createdAt).not.toBe(originalCreatedAt);
      expect(auditInfo.updatedAt).not.toBe(originalUpdatedAt);
      expect(auditInfo.createdBy).not.toBe(originalCreatedBy);
      expect(auditInfo.updatedBy).not.toBe(originalUpdatedBy);
    });
  });
});
