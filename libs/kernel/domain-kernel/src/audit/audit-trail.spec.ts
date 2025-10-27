/**
 * @fileoverview 审计轨迹测试
 * @description 测试AuditTrail类的各种功能
 */

import { AuditTrail, AuditTrailBuilder } from "./audit-trail.js";
import { EntityId } from "../identifiers/entity-id.js";
import {
  AuditChange,
  AuditChangeBuilder,
  AuditChangeType,
} from "./audit-change.interface.js";

describe("AuditTrail", () => {
  let entityId: EntityId;
  let changedBy: EntityId;
  let auditTrail: AuditTrail;

  beforeEach(() => {
    entityId = new EntityId();
    changedBy = new EntityId();
    auditTrail = new AuditTrail(entityId);
  });

  describe("构造函数", () => {
    it("应该创建空的审计轨迹", () => {
      expect(auditTrail.entityId.equals(entityId)).toBe(true);
      expect(auditTrail.changes).toHaveLength(0);
      expect(auditTrail.createdAt).toBeDefined();
    });

    it("应该创建带变更记录的审计轨迹", () => {
      const change = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date())
        .setChangedBy(changedBy)
        .setChangeType(AuditChangeType.CREATE)
        .setFieldChange("name", null, "test")
        .build();

      const trail = new AuditTrail(entityId, [change]);

      expect(trail.changes).toHaveLength(1);
      expect(trail.changes[0]).toEqual(change);
    });
  });

  describe("addChange", () => {
    it("应该添加变更记录", () => {
      const change = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date())
        .setChangedBy(changedBy)
        .setChangeType(AuditChangeType.CREATE)
        .setFieldChange("name", null, "test")
        .build();

      auditTrail.addChange(change);

      expect(auditTrail.changes).toHaveLength(1);
      expect(auditTrail.changes[0]).toEqual(change);
    });

    it("应该验证变更记录", () => {
      const invalidChange = {
        changeId: new EntityId(),
        timestamp: new Date(),
        // 缺少必需字段
      } as any;

      expect(() => auditTrail.addChange(invalidChange)).toThrow();
    });
  });

  describe("getChanges", () => {
    it("应该返回变更记录的副本", () => {
      const change = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date())
        .setChangedBy(changedBy)
        .setChangeType(AuditChangeType.CREATE)
        .setFieldChange("name", null, "test")
        .build();

      auditTrail.addChange(change);
      const changes = auditTrail.getChanges();

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual(change);
      expect(changes).not.toBe(auditTrail.changes);
    });
  });

  describe("getChangesByUser", () => {
    it("应该按用户查询变更记录", () => {
      const user1 = new EntityId();
      const user2 = new EntityId();

      const change1 = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date())
        .setChangedBy(user1)
        .setChangeType(AuditChangeType.CREATE)
        .setFieldChange("name", null, "test1")
        .build();

      const change2 = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date())
        .setChangedBy(user2)
        .setChangeType(AuditChangeType.UPDATE)
        .setFieldChange("name", "test1", "test2")
        .build();

      auditTrail.addChange(change1);
      auditTrail.addChange(change2);

      const user1Changes = auditTrail.getChangesByUser(user1);
      const user2Changes = auditTrail.getChangesByUser(user2);

      expect(user1Changes).toHaveLength(1);
      expect(user1Changes[0]).toEqual(change1);
      expect(user2Changes).toHaveLength(1);
      expect(user2Changes[0]).toEqual(change2);
    });
  });

  describe("getChangesByDateRange", () => {
    it("应该按时间范围查询变更记录", () => {
      const startDate = new Date("2024-01-01T00:00:00Z");
      const endDate = new Date("2024-01-03T00:00:00Z");
      const inRangeDate = new Date("2024-01-02T00:00:00Z");
      const outOfRangeDate = new Date("2024-01-04T00:00:00Z");

      const change1 = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(inRangeDate)
        .setChangedBy(changedBy)
        .setChangeType(AuditChangeType.CREATE)
        .setFieldChange("name", null, "test1")
        .build();

      const change2 = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(outOfRangeDate)
        .setChangedBy(changedBy)
        .setChangeType(AuditChangeType.UPDATE)
        .setFieldChange("name", "test1", "test2")
        .build();

      auditTrail.addChange(change1);
      auditTrail.addChange(change2);

      const changesInRange = auditTrail.getChangesByDateRange(
        startDate,
        endDate,
      );

      expect(changesInRange).toHaveLength(1);
      expect(changesInRange[0]).toEqual(change1);
    });
  });

  describe("getChangesByType", () => {
    it("应该按变更类型查询变更记录", () => {
      const createChange = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date())
        .setChangedBy(changedBy)
        .setChangeType(AuditChangeType.CREATE)
        .setFieldChange("name", null, "test")
        .build();

      const updateChange = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date())
        .setChangedBy(changedBy)
        .setChangeType(AuditChangeType.UPDATE)
        .setFieldChange("name", "test", "updated")
        .build();

      auditTrail.addChange(createChange);
      auditTrail.addChange(updateChange);

      const createChanges = auditTrail.getChangesByType(AuditChangeType.CREATE);
      const updateChanges = auditTrail.getChangesByType(AuditChangeType.UPDATE);

      expect(createChanges).toHaveLength(1);
      expect(createChanges[0]).toEqual(createChange);
      expect(updateChanges).toHaveLength(1);
      expect(updateChanges[0]).toEqual(updateChange);
    });
  });

  describe("getChangesByField", () => {
    it("应该按字段名查询变更记录", () => {
      const nameChange = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date())
        .setChangedBy(changedBy)
        .setChangeType(AuditChangeType.UPDATE)
        .setFieldChange("name", "old", "new")
        .build();

      const emailChange = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date())
        .setChangedBy(changedBy)
        .setChangeType(AuditChangeType.UPDATE)
        .setFieldChange("email", "old@test.com", "new@test.com")
        .build();

      auditTrail.addChange(nameChange);
      auditTrail.addChange(emailChange);

      const nameChanges = auditTrail.getChangesByField("name");
      const emailChanges = auditTrail.getChangesByField("email");

      expect(nameChanges).toHaveLength(1);
      expect(nameChanges[0]).toEqual(nameChange);
      expect(emailChanges).toHaveLength(1);
      expect(emailChanges[0]).toEqual(emailChange);
    });
  });

  describe("getLatestChanges", () => {
    it("应该获取最新的变更记录", () => {
      const change1 = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date("2024-01-01T00:00:00Z"))
        .setChangedBy(changedBy)
        .setChangeType(AuditChangeType.CREATE)
        .setFieldChange("name", null, "test1")
        .build();

      const change2 = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date("2024-01-02T00:00:00Z"))
        .setChangedBy(changedBy)
        .setChangeType(AuditChangeType.UPDATE)
        .setFieldChange("name", "test1", "test2")
        .build();

      auditTrail.addChange(change1);
      auditTrail.addChange(change2);

      const latestChanges = auditTrail.getLatestChanges(1);
      expect(latestChanges).toHaveLength(1);
      expect(latestChanges[0]).toEqual(change2);
    });

    it("应该获取指定数量的最新变更记录", () => {
      const changes = [];
      for (let i = 0; i < 5; i++) {
        const change = new AuditChangeBuilder()
          .setChangeId(new EntityId())
          .setTimestamp(new Date(2024, 0, i + 1))
          .setChangedBy(changedBy)
          .setChangeType(AuditChangeType.UPDATE)
          .setFieldChange("field", `old${i}`, `new${i}`)
          .build();
        changes.push(change);
        auditTrail.addChange(change);
      }

      const latestChanges = auditTrail.getLatestChanges(3);
      expect(latestChanges).toHaveLength(3);
      expect(latestChanges[0]).toEqual(changes[4]);
      expect(latestChanges[1]).toEqual(changes[3]);
      expect(latestChanges[2]).toEqual(changes[2]);
    });
  });

  describe("getChangeCount", () => {
    it("应该返回变更记录总数", () => {
      expect(auditTrail.getChangeCount()).toBe(0);

      const change = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date())
        .setChangedBy(changedBy)
        .setChangeType(AuditChangeType.CREATE)
        .setFieldChange("name", null, "test")
        .build();

      auditTrail.addChange(change);
      expect(auditTrail.getChangeCount()).toBe(1);
    });
  });

  describe("hasChanges", () => {
    it("应该检查是否有变更记录", () => {
      expect(auditTrail.hasChanges()).toBe(false);

      const change = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date())
        .setChangedBy(changedBy)
        .setChangeType(AuditChangeType.CREATE)
        .setFieldChange("name", null, "test")
        .build();

      auditTrail.addChange(change);
      expect(auditTrail.hasChanges()).toBe(true);
    });
  });

  describe("clearChanges", () => {
    it("应该清空所有变更记录", () => {
      const change = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date())
        .setChangedBy(changedBy)
        .setChangeType(AuditChangeType.CREATE)
        .setFieldChange("name", null, "test")
        .build();

      auditTrail.addChange(change);
      expect(auditTrail.hasChanges()).toBe(true);

      auditTrail.clearChanges();
      expect(auditTrail.hasChanges()).toBe(false);
      expect(auditTrail.getChangeCount()).toBe(0);
    });
  });

  describe("toJSON", () => {
    it("应该返回JSON表示", () => {
      const change = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date("2024-01-01T00:00:00Z"))
        .setChangedBy(changedBy)
        .setChangeType(AuditChangeType.CREATE)
        .setFieldChange("name", null, "test")
        .build();

      auditTrail.addChange(change);
      const json = auditTrail.toJSON();

      expect(json).toEqual({
        entityId: entityId.toJSON(),
        changes: [
          {
            changeId: change.changeId.toJSON(),
            timestamp: "2024-01-01T00:00:00.000Z",
            changedBy: changedBy.toJSON(),
            changeType: AuditChangeType.CREATE,
            fieldName: "name",
            oldValue: null,
            newValue: "test",
            reason: undefined,
            description: undefined,
            metadata: undefined,
          },
        ],
        createdAt: auditTrail.createdAt.toISOString(),
      });
    });
  });

  describe("equals", () => {
    it("应该正确比较相等的审计轨迹", () => {
      const change = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date())
        .setChangedBy(changedBy)
        .setChangeType(AuditChangeType.CREATE)
        .setFieldChange("name", null, "test")
        .build();

      auditTrail.addChange(change);

      const sameTrail = new AuditTrail(entityId, [change]);
      expect(auditTrail.equals(sameTrail)).toBe(true);
    });

    it("应该正确比较不相等的审计轨迹", () => {
      const change = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date())
        .setChangedBy(changedBy)
        .setChangeType(AuditChangeType.CREATE)
        .setFieldChange("name", null, "test")
        .build();

      auditTrail.addChange(change);

      const differentTrail = new AuditTrail(new EntityId(), [change]);
      expect(auditTrail.equals(differentTrail)).toBe(false);
    });

    it("应该正确处理null和undefined", () => {
      expect(auditTrail.equals(null)).toBe(false);
      expect(auditTrail.equals(undefined)).toBe(false);
    });

    it("应该正确处理非AuditTrail对象", () => {
      const other = { entityId: entityId };
      expect(auditTrail.equals(other as any)).toBe(false);
    });
  });

  describe("静态方法", () => {
    describe("builder", () => {
      it("应该创建审计轨迹构建器", () => {
        const builder = AuditTrail.builder(entityId);
        expect(builder).toBeInstanceOf(AuditTrailBuilder);
      });
    });

    describe("fromJSON", () => {
      it("应该从JSON创建审计轨迹", () => {
        const change = new AuditChangeBuilder()
          .setChangeId(new EntityId())
          .setTimestamp(new Date("2024-01-01T00:00:00Z"))
          .setChangedBy(changedBy)
          .setChangeType(AuditChangeType.CREATE)
          .setFieldChange("name", null, "test")
          .build();

        const json = {
          entityId: entityId.toJSON(),
          changes: [
            {
              changeId: change.changeId.toJSON(),
              timestamp: "2024-01-01T00:00:00.000Z",
              changedBy: changedBy.toJSON(),
              changeType: AuditChangeType.CREATE,
              fieldName: "name",
              oldValue: null,
              newValue: "test",
              reason: undefined,
              description: undefined,
              metadata: undefined,
            },
          ],
          createdAt: "2024-01-01T00:00:00.000Z",
        };

        const trailFromJson = AuditTrail.fromJSON(json);

        expect(trailFromJson.entityId.equals(entityId)).toBe(true);
        expect(trailFromJson.changes).toHaveLength(1);
        expect(trailFromJson.changes[0].fieldName).toBe("name");
      });
    });
  });
});

describe("AuditTrailBuilder", () => {
  let entityId: EntityId;
  let builder: AuditTrailBuilder;

  beforeEach(() => {
    entityId = new EntityId();
    builder = new AuditTrailBuilder(entityId);
  });

  describe("setCreatedAt", () => {
    it("应该设置创建时间", () => {
      const createdAt = new Date("2024-01-01T00:00:00Z");
      builder.setCreatedAt(createdAt);
      const trail = builder.build();

      expect(trail.createdAt).toEqual(createdAt);
    });
  });

  describe("addChange", () => {
    it("应该添加变更记录", () => {
      const change = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date())
        .setChangedBy(new EntityId())
        .setChangeType(AuditChangeType.CREATE)
        .setFieldChange("name", null, "test")
        .build();

      builder.addChange(change);
      const trail = builder.build();

      expect(trail.changes).toHaveLength(1);
      expect(trail.changes[0]).toEqual(change);
    });
  });

  describe("addChangeBuilder", () => {
    it("应该添加变更记录构建器", () => {
      const changeBuilder = new AuditChangeBuilder()
        .setChangeId(new EntityId())
        .setTimestamp(new Date())
        .setChangedBy(new EntityId())
        .setChangeType(AuditChangeType.CREATE)
        .setFieldChange("name", null, "test");

      builder.addChangeBuilder(changeBuilder);
      const trail = builder.build();

      expect(trail.changes).toHaveLength(1);
      expect(trail.changes[0].fieldName).toBe("name");
    });
  });

  describe("build", () => {
    it("应该构建审计轨迹", () => {
      const trail = builder.build();

      expect(trail).toBeInstanceOf(AuditTrail);
      expect(trail.entityId.equals(entityId)).toBe(true);
      expect(trail.changes).toHaveLength(0);
    });
  });
});
