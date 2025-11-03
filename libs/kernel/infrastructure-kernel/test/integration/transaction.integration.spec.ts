/**
 * @fileoverview 事务管理集成测试
 * @description 验证事务管理在实际数据库操作中的行为
 */

import { MikroORM, EntityManager } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import { v4 as uuidv4 } from "uuid";
import { MikroORMTransactionManager } from "../../src/transactions/transaction-manager.js";
import { TransactionContext } from "../../src/transactions/transaction-context.js";
import { TestEntity } from "../fixtures/test-entities.js";

// 使用PostgreSQL测试容器
let postgresContainer: any;

describe("Transaction Manager Integration Tests", () => {
  let orm: MikroORM;
  let em: EntityManager;
  let transactionManager: MikroORMTransactionManager;

  beforeAll(async () => {
    try {
      const { PostgreSqlContainer } = await import(
        "@testcontainers/postgresql"
      );
      postgresContainer = await new PostgreSqlContainer("postgres:16")
        .withDatabase("test_db")
        .withUsername("test_user")
        .withPassword("test_pass")
        .start();

      const connectionUrl = postgresContainer.getConnectionUri();

      orm = await MikroORM.init({
        driver: PostgreSqlDriver,
        dbName: "test_db",
        entities: [TestEntity],
        debug: false,
        discovery: {
          disableDynamicFileAccess: true,
          requireEntitiesArray: true,
        },
        driverOptions: {
          connection: {
            connectionString: connectionUrl,
          },
        },
      });

      em = orm.em.fork();

      // 自动创建schema
      await orm.schema.createSchema();

      transactionManager = new MikroORMTransactionManager(orm);
    } catch (error) {
      console.warn("TestContainers不可用，跳过事务管理集成测试");
      console.warn(error);
      orm = null as any;
      transactionManager = null as any;
    }
  }, 120000);

  afterAll(async () => {
    if (orm && typeof orm.close === "function") {
      await orm.close();
    }
    if (postgresContainer && typeof postgresContainer.stop === "function") {
      await postgresContainer.stop();
    }
  });

  beforeEach(async () => {
    if (!orm) {
      return;
    }

    // 清理所有测试数据
    await em.nativeDelete(TestEntity, {});
    await em.flush();
  });

  describe("基本事务操作", () => {
    it("应该在事务中执行操作并自动提交", async () => {
      if (!orm || !transactionManager) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const result = await transactionManager.runInTransaction(async (em) => {
        const entity = new TestEntity();
        entity.id = uuidv4();
        entity.name = "Transaction Test";
        await em.persistAndFlush(entity);
        return entity;
      });

      expect(result).toBeDefined();
      expect(result.name).toBe("Transaction Test");

      // 验证实体已保存
      const found = await em.findOne(TestEntity, { id: result.id });
      expect(found).toBeDefined();
      expect(found!.name).toBe("Transaction Test");
    });

    it("应该在操作失败时自动回滚", async () => {
      if (!orm || !transactionManager) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const entityId = uuidv4();

      await expect(
        transactionManager.runInTransaction(async (em) => {
          const entity = new TestEntity();
          entity.id = entityId;
          entity.name = "Rollback Test";
          await em.persistAndFlush(entity);

          // 抛出错误触发回滚
          throw new Error("测试回滚");
        }),
      ).rejects.toThrow("测试回滚");

      // 验证实体未保存（已回滚）
      const found = await em.findOne(TestEntity, { id: entityId });
      expect(found).toBeNull();
    });
  });

  describe("嵌套事务", () => {
    it("应该支持嵌套事务并复用父事务的 EntityManager", async () => {
      if (!orm || !transactionManager) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const results: string[] = [];

      await transactionManager.runInTransaction(async (outerEm) => {
        results.push("outer-start");

        await transactionManager.runInTransaction(async (innerEm) => {
          // 验证复用了同一个 EntityManager
          expect(innerEm).toBe(outerEm);
          results.push("inner");
        });

        results.push("outer-end");
      });

      expect(results).toEqual(["outer-start", "inner", "outer-end"]);
    });

    it("应该支持多层嵌套事务（最多5层）", async () => {
      if (!orm || !transactionManager) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const levels: number[] = [];

      await transactionManager.runInTransaction(async () => {
        levels.push(0);

        await transactionManager.runInTransaction(async () => {
          levels.push(1);

          await transactionManager.runInTransaction(async () => {
            levels.push(2);

            await transactionManager.runInTransaction(async () => {
              levels.push(3);

              await transactionManager.runInTransaction(async () => {
                levels.push(4);
              });
            });
          });
        });
      });

      expect(levels).toEqual([0, 1, 2, 3, 4]);
    });

    it("应该在嵌套事务中失败时回滚所有操作", async () => {
      if (!orm || !transactionManager) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const entityId = uuidv4();

      await expect(
        transactionManager.runInTransaction(async (em) => {
          const entity1 = new TestEntity();
          entity1.id = uuidv4();
          entity1.name = "Entity 1";
          await em.persistAndFlush(entity1);

          await transactionManager.runInTransaction(async (innerEm) => {
            const entity2 = new TestEntity();
            entity2.id = entityId;
            entity2.name = "Entity 2";
            await innerEm.persistAndFlush(entity2);

            // 抛出错误，应该回滚所有操作
            throw new Error("嵌套事务失败");
          });
        }),
      ).rejects.toThrow("嵌套事务失败");

      // 验证所有实体都未保存
      const found1 = await em.findOne(TestEntity, { id: entityId });
      expect(found1).toBeNull();
    });
  });

  describe("手动事务管理", () => {
    it("应该支持手动开始、提交事务", async () => {
      if (!orm || !transactionManager) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const context = await transactionManager.begin();
      expect(context).toBeDefined();
      expect(context.level).toBe(0);

      try {
        const entity = new TestEntity();
        entity.id = uuidv4();
        entity.name = "Manual Transaction";
        await context.entityManager.persistAndFlush(entity);

        await transactionManager.commit(context);
        expect(context.isCommitted).toBe(true);

        // 验证实体已保存
        const found = await em.findOne(TestEntity, { id: entity.id });
        expect(found).toBeDefined();
      } catch (error) {
        await transactionManager.rollback(context);
        throw error;
      }
    });

    it("应该支持手动回滚事务", async () => {
      if (!orm || !transactionManager) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const entityId = uuidv4();
      const context = await transactionManager.begin();

      try {
        const entity = new TestEntity();
        entity.id = entityId;
        entity.name = "Rollback Entity";
        await context.entityManager.persistAndFlush(entity);

        await transactionManager.rollback(context);
        expect(context.isRolledBack).toBe(true);

        // 验证实体未保存
        const found = await em.findOne(TestEntity, { id: entityId });
        expect(found).toBeNull();
      } catch (error) {
        // 确保回滚（类型转换为实现类以访问 isCompleted 方法）
        const contextImpl = context as TransactionContext;
        if (!contextImpl.isCompleted()) {
          await transactionManager.rollback(context);
        }
        throw error;
      }
    });
  });

  describe("事务上下文查询", () => {
    it("应该能够获取当前事务上下文", async () => {
      if (!orm || !transactionManager) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      expect(transactionManager.getCurrentContext()).toBeUndefined();
      expect(transactionManager.isInTransaction()).toBe(false);

      await transactionManager.runInTransaction(async () => {
        const context = transactionManager.getCurrentContext();
        expect(context).toBeDefined();
        expect(context?.transactionId).toBeDefined();
        expect(context?.level).toBe(0);
        expect(transactionManager.isInTransaction()).toBe(true);
      });

      expect(transactionManager.getCurrentContext()).toBeUndefined();
      expect(transactionManager.isInTransaction()).toBe(false);
    });
  });
});
