/**
 * 事务装饰器
 *
 * @description 提供声明式事务管理
 *
 * ## 业务规则
 *
 * ### 装饰器行为规则
 * - 自动开启事务
 * - 方法成功执行时自动提交
 * - 方法抛出异常时自动回滚
 * - 支持嵌套事务（检测并复用现有事务）
 *
 * ### 上下文传递规则
 * - 将事务 EntityManager 存储到 CLS
 * - 方法内部可以通过 CLS 获取事务 EM
 * - 事务结束后自动清理上下文
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     @InjectEntityManager()
 *     private readonly em: EntityManager,
 *     private readonly cls: ClsService,
 *   ) {}
 *
 *   @Transactional()
 *   async createUser(data: CreateUserDto): Promise<User> {
 *     // 从 CLS 获取事务 EM
 *     const em = this.cls.get<EntityManager>('entityManager') || this.em;
 *
 *     const user = new User(data);
 *     await em.persistAndFlush(user);
 *
 *     return user;
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 */

import type { TransactionOptions } from "../types/transaction.types.js";

/**
 * 事务装饰器
 *
 * @description 将方法包装在数据库事务中
 *
 * @param options - 事务选项（可选）
 * @returns 方法装饰器
 *
 * ## 注意事项
 *
 * - 被装饰的方法必须是异步的
 * - 类必须注入 TransactionService 或 MikroORM
 * - 使用 CLS 传递事务上下文
 */
export function Transactional(options?: TransactionOptions): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 获取 TransactionService（需要类中注入）
      const transactionService = (this as any).transactionService;

      if (!transactionService) {
        throw new Error(
          `@Transactional 装饰器要求类注入 TransactionService。` +
            `请在 ${target.constructor.name} 中添加：constructor(private readonly transactionService: TransactionService)`,
        );
      }

      // 在事务中执行原方法
      return transactionService.runInTransaction(async (_em: any) => {
        return originalMethod.apply(this, args);
      }, options);
    };

    return descriptor;
  };
}
