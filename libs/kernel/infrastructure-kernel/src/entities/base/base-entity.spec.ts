/**
 * @fileoverview MikroORM基础实体测试
 * @description 测试BaseEntity的各种功能
 */

import { describe, it, expect } from "@jest/globals";
import { BaseEntity } from "./base-entity.js";
import { EntityId } from "@hl8/domain-kernel";
import { v4 as uuidv4 } from "uuid";

/**
 * 测试用的具体实体实现
 * @description 继承BaseEntity用于测试
 */
class TestEntity extends BaseEntity {
  name!: string;
}

describe("BaseEntity", () => {
  it("应该设置初始值", () => {
    const id = uuidv4();
    const entity = new TestEntity();
    entity.id = id;
    entity.name = "Test";

    expect(entity.id).toBe(id);
    expect(entity.createdAt).toBeInstanceOf(Date);
    expect(entity.version).toBe(1);
  });

  it("应该自动设置创建时间", () => {
    const entity = new TestEntity();
    entity.id = uuidv4();

    expect(entity.createdAt).toBeInstanceOf(Date);
    expect(entity.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("应该初始化版本号为1", () => {
    const entity = new TestEntity();
    entity.id = uuidv4();

    expect(entity.version).toBe(1);
  });

  it("should not be deleted by default", () => {
    const entity = new TestEntity();
    entity.id = uuidv4();

    expect(entity.isDeleted()).toBe(false);
    expect(entity.deletedAt).toBeUndefined();
  });

  it("应该正确执行软删除", () => {
    const entity = new TestEntity();
    entity.id = uuidv4();
    entity.softDelete();

    expect(entity.isDeleted()).toBe(true);
    expect(entity.deletedAt).toBeInstanceOf(Date);
    expect(entity.deletedAt!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("应该正确恢复已删除的实体", () => {
    const entity = new TestEntity();
    entity.id = uuidv4();
    entity.softDelete();
    expect(entity.isDeleted()).toBe(true);

    entity.restore();
    expect(entity.isDeleted()).toBe(false);
    expect(entity.deletedAt).toBeNull();
  });

  it("应该正确转换为EntityId", () => {
    const entity = new TestEntity();
    entity.id = uuidv4();
    const entityId = entity.toEntityId();

    expect(entityId).toBeInstanceOf(EntityId);
    expect(entityId.value).toBe(entity.id);
  });

  it("应该验证完整的实体数据", () => {
    const entity = new TestEntity();
    entity.id = uuidv4();
    entity.name = "Test";

    expect(() => entity.validate()).not.toThrow();
  });

  it("应该拒绝无效的版本号", () => {
    const entity = new TestEntity();
    entity.id = uuidv4();
    entity.version = 0;

    expect(() => entity.validate()).toThrow("版本号必须大于等于1");
  });

  it("应该拒绝空的ID", () => {
    const entity = new TestEntity();

    expect(() => entity.validate()).toThrow("实体ID不能为空");
  });
});
