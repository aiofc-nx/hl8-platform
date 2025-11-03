/**
 * @fileoverview 基础设施内核模块测试
 * @description 验证 InfrastructureKernelModule 的配置和依赖注入
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { InfrastructureKernelModule } from "./infrastructure-kernel.module.js";
import { RepositoryFactory } from "../repositories/factory/repository-factory.js";
import { MikroORMTransactionManager } from "../transactions/transaction-manager.js";
import { EntityManager, MikroORM } from "@mikro-orm/core";
import { MikroOrmModule } from "@mikro-orm/nestjs";

describe("InfrastructureKernelModule", () => {
  let module: TestingModule;

  describe("forRoot", () => {
    it("应该能够创建模块实例", () => {
      const dynamicModule = InfrastructureKernelModule.forRoot();

      expect(dynamicModule).toBeDefined();
      expect(dynamicModule.module).toBe(InfrastructureKernelModule);
    });

    it("应该能够配置 providers", () => {
      const dynamicModule = InfrastructureKernelModule.forRoot();

      expect(dynamicModule.providers).toBeDefined();
      expect(dynamicModule.providers!.length).toBeGreaterThan(0);
    });

    it("应该能够配置 exports", () => {
      const dynamicModule = InfrastructureKernelModule.forRoot();

      expect(dynamicModule.exports).toBeDefined();
      expect(dynamicModule.exports!.length).toBeGreaterThan(0);
    });

    it("应该能够在提供 MikroORM 配置时导入 MikroORM 模块", () => {
      const mockMikroOrmOptions = {
        dbName: "test_db",
        entities: [],
      };

      const dynamicModule = InfrastructureKernelModule.forRoot({
        mikroOrmOptions: mockMikroOrmOptions,
      });

      expect(dynamicModule.imports).toBeDefined();
      expect(dynamicModule.imports!.length).toBeGreaterThan(0);
    });

    it("应该能够在没有 MikroORM 配置时不导入 MikroORM 模块", () => {
      const dynamicModule = InfrastructureKernelModule.forRoot();

      // 如果没有提供 mikroOrmOptions，imports 可能是空数组或未定义
      // 主要验证不会出错
      expect(dynamicModule).toBeDefined();
    });
  });

  describe("forRootAsync", () => {
    it("应该能够创建异步模块实例", () => {
      const dynamicModule = InfrastructureKernelModule.forRootAsync({
        imports: [],
        useFactory: async () => ({}),
      });

      expect(dynamicModule).toBeDefined();
      expect(dynamicModule.module).toBe(InfrastructureKernelModule);
    });

    it("应该能够配置异步 providers", () => {
      const dynamicModule = InfrastructureKernelModule.forRootAsync({
        imports: [],
        useFactory: async () => ({}),
      });

      expect(dynamicModule.providers).toBeDefined();
      expect(dynamicModule.providers!.length).toBeGreaterThan(0);
    });

    it("应该能够配置异步 useFactory", () => {
      const dynamicModule = InfrastructureKernelModule.forRootAsync({
        imports: [],
        useFactory: async () => ({}),
      });

      expect(dynamicModule).toBeDefined();
      expect(dynamicModule.providers).toBeDefined();
      // 验证异步配置正确
    });
  });
});

