/**
 * @fileoverview 事务管理器单元测试
 * @description 验证 MikroORMTransactionManager 的所有方法实现
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { MikroORM, EntityManager } from "@mikro-orm/core";
import { MikroORMTransactionManager } from "./transaction-manager.js";
import { TransactionContext } from "./transaction-context.js";

describe("MikroORMTransactionManager", () => {
  let mockOrm: MikroORM;
  let manager: MikroORMTransactionManager;

  beforeEach(() => {
    mockOrm = {
      em: {
        fork: jest.fn(() => ({
          transactional: jest.fn(),
          flush: jest.fn(),
          clear: jest.fn(),
        })),
      },
    } as unknown as MikroORM;

    manager = new MikroORMTransactionManager(mockOrm);
  });

  describe("构造函数", () => {
    it("应该能够创建事务管理器实例", () => {
      expect(manager).toBeDefined();
      expect(manager instanceof MikroORMTransactionManager).toBe(true);
    });

    it("应该在 ORM 为空时抛出错误", () => {
      expect(() => {
        new MikroORMTransactionManager(null as unknown as MikroORM);
      }).toThrow("MikroORM 实例不能为空");
    });
  });

  describe("isInTransaction", () => {
    it("应该在没有事务时返回 false", () => {
      expect(manager.isInTransaction()).toBe(false);
    });

    it("应该在有事务时返回 true", async () => {
      const mockEm = {
        transactional: jest.fn((cb: any) => cb(mockEm)),
        flush: jest.fn(),
      } as unknown as EntityManager;

      (mockOrm.em.fork as jest.MockedFunction<any>).mockReturnValue(mockEm);

      await manager.runInTransaction(async () => {
        expect(manager.isInTransaction()).toBe(true);
      });
    });
  });

  describe("getCurrentContext", () => {
    it("应该在没有事务时返回 undefined", () => {
      expect(manager.getCurrentContext()).toBeUndefined();
    });

    it("应该在有事务时返回事务上下文", async () => {
      const mockEm = {
        transactional: jest.fn((cb: any) => cb(mockEm)),
        flush: jest.fn(),
      } as unknown as EntityManager;

      (mockOrm.em.fork as jest.MockedFunction<any>).mockReturnValue(mockEm);

      await manager.runInTransaction(async () => {
        const context = manager.getCurrentContext();
        expect(context).toBeDefined();
        expect(context?.transactionId).toBeDefined();
        expect(context?.level).toBe(0);
      });
    });
  });

  describe("runInTransaction", () => {
    it("应该在事务中执行回调函数", async () => {
      const mockEm = {
        transactional: jest.fn((cb: any) => cb(mockEm)),
        flush: jest.fn(),
      } as unknown as EntityManager;

      (mockOrm.em.fork as jest.MockedFunction<any>).mockReturnValue(mockEm);

      let executed = false;
      await manager.runInTransaction(async (em) => {
        executed = true;
        expect(em).toBe(mockEm);
      });

      expect(executed).toBe(true);
      expect(mockOrm.em.fork).toHaveBeenCalled();
    });

    it("应该在回调抛出错误时自动回滚", async () => {
      const mockEm = {
        transactional: jest.fn(async (cb: any) => {
          await cb(mockEm);
        }),
        flush: jest.fn(),
      } as unknown as EntityManager;

      (mockOrm.em.fork as jest.MockedFunction<any>).mockReturnValue(mockEm);

      await expect(
        manager.runInTransaction(async () => {
          throw new Error("测试错误");
        }),
      ).rejects.toThrow("测试错误");
    });

    it("应该支持嵌套事务", async () => {
      const mockEm = {
        transactional: jest.fn((cb: any) => cb(mockEm)),
        flush: jest.fn(),
      } as unknown as EntityManager;

      (mockOrm.em.fork as jest.MockedFunction<any>).mockReturnValue(mockEm);

      let outerExecuted = false;
      let innerExecuted = false;

      await manager.runInTransaction(async (em) => {
        outerExecuted = true;
        expect(manager.isInTransaction()).toBe(true);

        await manager.runInTransaction(async (innerEm) => {
          innerExecuted = true;
          expect(innerEm).toBe(em); // 嵌套事务应复用父事务的 EM
          expect(manager.isInTransaction()).toBe(true);
        });
      });

      expect(outerExecuted).toBe(true);
      expect(innerExecuted).toBe(true);
      // 只 fork 一次（顶层事务）
      expect(mockOrm.em.fork).toHaveBeenCalledTimes(1);
    });
  });

  describe("begin", () => {
    it("应该能够开始新事务", async () => {
      const mockEm = {
        flush: jest.fn(),
      } as unknown as EntityManager;

      (mockOrm.em.fork as jest.MockedFunction<any>).mockReturnValue(mockEm);

      const context = await manager.begin();

      expect(context).toBeDefined();
      expect(context.transactionId).toBeDefined();
      expect(context.level).toBe(0);
      expect(context.entityManager).toBe(mockEm);
      expect(context.isCommitted).toBe(false);
      expect(context.isRolledBack).toBe(false);

      // 清理超时句柄，避免测试后仍有未清理的资源
      const timeoutHandle = (context as any)._timeoutHandle;
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    });

    it("应该在嵌套层级超过限制时抛出错误", async () => {
      const mockEm = {
        transactional: jest.fn((cb: any) => cb(mockEm)),
        flush: jest.fn(),
      } as unknown as EntityManager;

      (mockOrm.em.fork as jest.MockedFunction<any>).mockReturnValue(mockEm);

      // 创建嵌套事务直到达到限制
      // runInTransaction 创建顶层事务（level 0），然后我们可以创建最多 4 层嵌套（level 1-4）
      await manager.runInTransaction(async () => {
        const contexts: any[] = [];
        // 创建 4 层嵌套事务（level 1-4）
        for (let i = 0; i < 4; i++) {
          const context = await manager.begin();
          contexts.push(context);
          expect(context.level).toBe(i + 1);
        }

        // 第5层嵌套（level 5）应该失败（总共 6 层，超过 5 层限制）
        await expect(manager.begin()).rejects.toThrow(
          "事务嵌套层级超过最大限制",
        );

        // 清理：回滚所有创建的事务
        for (const ctx of contexts.reverse()) {
          try {
            await manager.rollback(ctx);
          } catch {
            // 忽略清理错误
          }
        }
      });
    });
  });

  describe("commit", () => {
    it("应该能够提交事务", async () => {
      const mockEm = {
        flush: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      } as unknown as EntityManager;

      (mockOrm.em.fork as jest.MockedFunction<any>).mockReturnValue(mockEm);

      const context = await manager.begin();
      await manager.commit(context);

      expect(context.isCommitted).toBe(true);
      expect(context.isRolledBack).toBe(false);
    });

    it("应该在事务已提交时抛出错误", async () => {
      const mockEm = {
        flush: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      } as unknown as EntityManager;

      (mockOrm.em.fork as jest.MockedFunction<any>).mockReturnValue(mockEm);

      const context = await manager.begin();
      await manager.commit(context);

      await expect(manager.commit(context)).rejects.toThrow(
        "已经完成（已提交或已回滚）",
      );
    });
  });

  describe("rollback", () => {
    it("应该能够回滚事务", async () => {
      const mockEm = {
        clear: jest.fn(),
      } as unknown as EntityManager;

      (mockOrm.em.fork as jest.MockedFunction<any>).mockReturnValue(mockEm);

      const context = await manager.begin();
      await manager.rollback(context);

      expect(context.isRolledBack).toBe(true);
      expect(context.isCommitted).toBe(false);
    });

    it("应该在事务不存在时抛出错误", async () => {
      const mockEm = {} as unknown as EntityManager;
      const fakeContext = new TransactionContext("fake-id", 0, mockEm);

      await expect(manager.rollback(fakeContext)).rejects.toThrow("不存在");
    });
  });
});
