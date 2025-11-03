/**
 * @fileoverview 基础设施内核模块
 * @description 提供基础设施层核心功能的 NestJS 模块，支持依赖注入
 */

import { Module, DynamicModule, Global } from "@nestjs/common";
import type { InjectionToken, OptionalFactoryDependency } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { EntityManager, MikroORM } from "@mikro-orm/core";
import { RepositoryFactory } from "../repositories/factory/repository-factory.js";
import { MikroORMTransactionManager } from "../transactions/transaction-manager.js";

/**
 * 基础设施内核模块选项
 * @description 配置基础设施内核模块的参数
 */
export interface InfrastructureKernelModuleOptions {
  /** MikroORM 配置选项（可选，如果已在其他模块中配置则可省略） */
  mikroOrmOptions?: unknown;
}

/**
 * 基础设施内核模块
 * @description 提供仓储工厂、事务管理器等基础设施组件的依赖注入支持
 */
@Global()
@Module({})
export class InfrastructureKernelModule {
  /**
   * 创建基础设施内核模块
   * @description 配置模块并提供所有基础设施组件的依赖注入支持
   * @param options 模块选项，可选
   * @returns 动态模块
   */
  static forRoot(options?: InfrastructureKernelModuleOptions): DynamicModule {
    const imports: any[] = [];

    // 如果提供了 MikroORM 配置，则导入 MikroORM 模块
    if (options?.mikroOrmOptions) {
      imports.push(MikroOrmModule.forRoot(options.mikroOrmOptions as any));
    }

    return {
      module: InfrastructureKernelModule,
      imports,
      providers: [
        // 仓储工厂
        {
          provide: "IRepositoryFactory",
          useFactory: (em: EntityManager) => new RepositoryFactory(em),
          inject: [EntityManager],
        },
        {
          provide: RepositoryFactory,
          useFactory: (em: EntityManager) => new RepositoryFactory(em),
          inject: [EntityManager],
        },
        // 事务管理器（需要 MikroORM 实例，从 EntityManager 中获取）
        {
          provide: "ITransactionManager",
          useFactory: (em: EntityManager) => {
            // 从 EntityManager 获取 MikroORM 实例
            const orm = em.config as any as MikroORM;
            return new MikroORMTransactionManager(orm);
          },
          inject: [EntityManager],
        },
        {
          provide: MikroORMTransactionManager,
          useFactory: (em: EntityManager) => {
            // 从 EntityManager 获取 MikroORM 实例
            const orm = em.config as any as MikroORM;
            return new MikroORMTransactionManager(orm);
          },
          inject: [EntityManager],
        },
      ],
      exports: [
        // 导出接口标识符
        "IRepositoryFactory",
        "ITransactionManager",
        // 导出实现类
        RepositoryFactory,
        MikroORMTransactionManager,
      ],
    };
  }

  /**
   * 创建异步基础设施内核模块
   * @description 支持异步配置模块选项
   * @param options 模块选项工厂
   * @returns 动态模块
   */
  static forRootAsync(options: {
    useFactory: (
      ...args: unknown[]
    ) =>
      | Promise<InfrastructureKernelModuleOptions>
      | InfrastructureKernelModuleOptions;
    inject?: (InjectionToken | OptionalFactoryDependency)[];
  }): DynamicModule {
    const imports: any[] = [];

    return {
      module: InfrastructureKernelModule,
      imports,
      providers: [
        // 仓储工厂
        {
          provide: "IRepositoryFactory",
          useFactory: async (em: any, ...args: unknown[]) => {
            await options.useFactory(...args);
            return new RepositoryFactory(em);
          },
          inject: [
            EntityManager,
            ...((options.inject ?? []) as (
              | InjectionToken
              | OptionalFactoryDependency
            )[]),
          ],
        },
        {
          provide: RepositoryFactory,
          useFactory: async (em: any, ...args: unknown[]) => {
            await options.useFactory(...args);
            return new RepositoryFactory(em);
          },
          inject: [
            EntityManager,
            ...((options.inject ?? []) as (
              | InjectionToken
              | OptionalFactoryDependency
            )[]),
          ],
        },
        // 事务管理器
        {
          provide: "ITransactionManager",
          useFactory: async (em: EntityManager, ...args: unknown[]) => {
            await options.useFactory(...args);
            // 从 EntityManager 获取 MikroORM 实例
            const orm = em.config as any as MikroORM;
            return new MikroORMTransactionManager(orm);
          },
          inject: [
            EntityManager,
            ...((options.inject ?? []) as (
              | InjectionToken
              | OptionalFactoryDependency
            )[]),
          ],
        },
        {
          provide: MikroORMTransactionManager,
          useFactory: async (em: EntityManager, ...args: unknown[]) => {
            await options.useFactory(...args);
            // 从 EntityManager 获取 MikroORM 实例
            const orm = em.config as any as MikroORM;
            return new MikroORMTransactionManager(orm);
          },
          inject: [
            EntityManager,
            ...((options.inject ?? []) as (
              | InjectionToken
              | OptionalFactoryDependency
            )[]),
          ],
        },
      ],
      exports: [
        // 导出接口标识符
        "IRepositoryFactory",
        "ITransactionManager",
        // 导出实现类
        RepositoryFactory,
        MikroORMTransactionManager,
      ],
    };
  }
}
