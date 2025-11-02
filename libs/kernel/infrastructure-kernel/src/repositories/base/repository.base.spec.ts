/**
 * @fileoverview 基础仓储单元测试
 * @description 验证 MikroORMRepository 的所有方法实现
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { EntityManager } from "@mikro-orm/core";
import {
  EntityId,
  RepositoryOperationFailedException,
} from "@hl8/domain-kernel";
import { MikroORMRepository } from "./repository.base.js";
import { BaseEntity } from "../../entities/base/base-entity.js";
import { Entity, Property } from "@mikro-orm/core";

/**
 * 测试用的持久化实体
 */
@Entity()
class TestEntity extends BaseEntity {
  @Property()
  name!: string;
}

describe("MikroORMRepository", () => {
  let mockEm: EntityManager;
  let repository: MikroORMRepository<TestEntity>;
  const entityName = "TestEntity";

  beforeEach(() => {
    mockEm = {
      findOne: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn(),
      removeAndFlush: jest.fn(),
      count: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
    } as unknown as EntityManager;

    repository = new MikroORMRepository(mockEm, entityName);

    // 重置所有 mock
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("应该返回所有未删除的实体", async () => {
      const mockEntities = [
        { id: "1", name: "Entity 1", deletedAt: null },
        { id: "2", name: "Entity 2", deletedAt: null },
      ] as TestEntity[];

      (mockEm.find as jest.MockedFunction<any>).mockResolvedValue(mockEntities);

      const result = await repository.findAll();

      expect(result).toEqual(mockEntities);
      expect(mockEm.find).toHaveBeenCalledWith(entityName, { deletedAt: null });
    });

    it("应该在查询失败时抛出异常", async () => {
      const error = new Error("查询失败");
      (mockEm.find as jest.MockedFunction<any>).mockRejectedValue(error);

      await expect(repository.findAll()).rejects.toThrow(
        RepositoryOperationFailedException,
      );
    });
  });

  describe("count", () => {
    it("应该返回未删除实体的总数", async () => {
      (mockEm.count as jest.MockedFunction<any>).mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockEm.count).toHaveBeenCalledWith(entityName, {
        deletedAt: null,
      });
    });

    it("应该在统计失败时抛出异常", async () => {
      const error = new Error("统计失败");
      (mockEm.count as jest.MockedFunction<any>).mockRejectedValue(error);

      await expect(repository.count()).rejects.toThrow(
        RepositoryOperationFailedException,
      );
    });
  });

  describe("findAllPaginated", () => {
    it("应该返回分页结果", async () => {
      const mockEntities = [
        { id: "1", name: "Entity 1" },
        { id: "2", name: "Entity 2" },
      ] as TestEntity[];
      const totalCount = 10;

      (mockEm.findAndCount as jest.MockedFunction<any>).mockResolvedValue([
        mockEntities,
        totalCount,
      ]);

      const result = await repository.findAllPaginated(1, 2);

      expect(result.items).toEqual(mockEntities);
      expect(result.totalCount).toBe(totalCount);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(false);
      expect(result.totalPages).toBe(5);

      expect(mockEm.findAndCount).toHaveBeenCalledWith(
        entityName,
        { deletedAt: null },
        { limit: 2, offset: 0 },
      );
    });

    it("应该在页码小于1时抛出错误", async () => {
      // 错误会在方法内部抛出，不需要 mock findAndCount
      await expect(repository.findAllPaginated(0, 10)).rejects.toThrow(
        "页码必须大于等于1",
      );
    });

    it("应该在每页数量小于1时抛出错误", async () => {
      // 错误会在方法内部抛出，不需要 mock findAndCount
      await expect(repository.findAllPaginated(1, 0)).rejects.toThrow(
        "每页数量必须大于等于1",
      );
    });

    it("应该正确计算分页信息（最后一页）", async () => {
      (mockEm.findAndCount as jest.MockedFunction<any>).mockResolvedValue([
        [{ id: "10", name: "Entity 10" }],
        10,
      ]);

      const result = await repository.findAllPaginated(5, 2);

      expect(result.hasNext).toBe(false);
      expect(result.hasPrevious).toBe(true);
      expect(result.totalPages).toBe(5);
    });

    it("应该在查询失败时抛出异常", async () => {
      const error = new Error("查询失败");
      (mockEm.findAndCount as jest.MockedFunction<any>).mockRejectedValue(
        error,
      );

      await expect(repository.findAllPaginated(1, 10)).rejects.toThrow(
        RepositoryOperationFailedException,
      );
    });
  });

  describe("saveMany", () => {
    it("应该批量保存多个实体", async () => {
      const entities = [
        { id: "1", name: "Entity 1" },
        { id: "2", name: "Entity 2" },
      ] as TestEntity[];

      await repository.saveMany(entities);

      expect(mockEm.persist).toHaveBeenCalledTimes(2);
      expect(mockEm.persist).toHaveBeenCalledWith(entities[0]);
      expect(mockEm.persist).toHaveBeenCalledWith(entities[1]);
      expect(mockEm.flush).toHaveBeenCalledTimes(1);
    });

    it("应该在实体数组为空时直接返回", async () => {
      await repository.saveMany([]);

      expect(mockEm.persist).not.toHaveBeenCalled();
      expect(mockEm.flush).not.toHaveBeenCalled();
    });

    it("应该在保存失败时抛出异常", async () => {
      const entities = [{ id: "1", name: "Entity 1" }] as TestEntity[];
      const error = new Error("保存失败");
      (mockEm.flush as jest.MockedFunction<any>).mockRejectedValue(error);

      await expect(repository.saveMany(entities)).rejects.toThrow(
        RepositoryOperationFailedException,
      );
    });
  });

  describe("deleteMany", () => {
    it("应该批量删除多个实体", async () => {
      const ids = [EntityId.generate(), EntityId.generate()];
      const entities = [
        { id: ids[0].value, name: "Entity 1" },
        { id: ids[1].value, name: "Entity 2" },
      ] as TestEntity[];

      (mockEm.findOne as jest.MockedFunction<any>)
        .mockResolvedValueOnce(entities[0])
        .mockResolvedValueOnce(entities[1]);
      (mockEm.removeAndFlush as jest.MockedFunction<any>).mockResolvedValue(
        undefined,
      );

      await repository.deleteMany(ids);

      expect(mockEm.findOne).toHaveBeenCalledTimes(2);
      expect(mockEm.removeAndFlush).toHaveBeenCalledTimes(2);
    });

    it("应该在ID数组为空时直接返回", async () => {
      await repository.deleteMany([]);

      expect(mockEm.findOne).not.toHaveBeenCalled();
      expect(mockEm.removeAndFlush).not.toHaveBeenCalled();
    });

    it("应该跳过不存在的实体", async () => {
      const ids = [EntityId.generate(), EntityId.generate()];

      (mockEm.findOne as jest.MockedFunction<any>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: ids[1].value } as TestEntity);

      await repository.deleteMany(ids);

      expect(mockEm.removeAndFlush).toHaveBeenCalledTimes(1);
    });

    it("应该在删除失败时抛出异常", async () => {
      const ids = [EntityId.generate()];
      const entity = { id: ids[0].value } as TestEntity;
      const error = new Error("删除失败");

      (mockEm.findOne as jest.MockedFunction<any>).mockResolvedValue(entity);
      (mockEm.removeAndFlush as jest.MockedFunction<any>).mockRejectedValue(
        error,
      );

      await expect(repository.deleteMany(ids)).rejects.toThrow(
        RepositoryOperationFailedException,
      );
    });
  });
});
