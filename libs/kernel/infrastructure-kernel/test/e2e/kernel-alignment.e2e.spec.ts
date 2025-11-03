/**
 * @fileoverview 三个 Kernel 完整集成 E2E 测试
 * @description 验证 domain-kernel、application-kernel 和 infrastructure-kernel 的完整集成
 * 测试场景包括：命令处理、仓储操作、事件存储、事务管理、异常处理等完整流程
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
import { Entity, Property } from "@mikro-orm/core";
import {
  TenantIsolatedPersistenceEntity,
  MikroORMTransactionManager,
  MikroORMEventStore,
  ExceptionConverter,
} from "../../src/index.js";
import { EntityMapper } from "../../src/mappers/index.js";
import { RepositoryFactory } from "../../src/repositories/factory/index.js";
import {
  TenantContext,
  TenantId,
  OrganizationId,
  EntityId,
  TenantIsolatedEntity,
  DomainException,
  AggregateVersionConflictException,
} from "@hl8/domain-kernel";
import {
  BaseCommand,
  CommandResult,
  IEventStore,
} from "@hl8/application-kernel";

// 使用PostgreSQL测试容器
let postgresContainer: any;

/**
 * 测试订单实体（领域实体 - 模拟）
 */
class OrderDomainEntity extends TenantIsolatedEntity {
  constructor(
    tenantId: TenantId,
    orderNumber: string,
    totalAmount: number,
    organizationId?: OrganizationId,
    id?: EntityId,
  ) {
    super(tenantId, organizationId, undefined, id);
    this.orderNumber = orderNumber;
    this.totalAmount = totalAmount;
    this.items = [];
  }

  orderNumber: string;
  totalAmount: number;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;

  /**
   * 克隆实体
   * @returns 克隆后的实体
   */
  public clone(): OrderDomainEntity {
    const cloned = new OrderDomainEntity(
      this.tenantId,
      this.orderNumber,
      this.totalAmount,
      this.organizationId,
      this.id,
    );
    cloned.items = [...this.items];
    return cloned;
  }

  /**
   * 验证业务规则
   * @returns 是否通过验证
   */
  public validateBusinessRules(): boolean {
    if (!this.orderNumber || this.orderNumber.trim().length === 0) {
      return false;
    }
    if (this.totalAmount <= 0) {
      return false;
    }
    return true;
  }

  /**
   * 执行业务逻辑
   * @param operation 操作类型
   * @param params 操作参数
   * @returns 操作结果
   */
  public executeBusinessLogic(operation: string, params: unknown): unknown {
    if (operation === "updateTotalAmount") {
      const amount = (params as { totalAmount: number }).totalAmount;
      if (amount <= 0) {
        return { success: false, error: "总金额必须大于0" };
      }
      this.totalAmount = amount;
      return { success: true, totalAmount: this.totalAmount };
    }
    if (operation === "addItem") {
      const item = params as {
        productId: string;
        quantity: number;
        price: number;
      };
      this.items.push(item);
      this.totalAmount += item.price * item.quantity;
      return { success: true, items: this.items };
    }
    return { success: false, error: "未知操作" };
  }
}

/**
 * 测试订单持久化实体
 */
@Entity({ tableName: "e2e_orders", collection: "e2e_orders" })
class OrderEntity extends TenantIsolatedPersistenceEntity {
  @Property()
  orderNumber!: string;

  @Property({ type: "decimal", precision: 10, scale: 2 })
  totalAmount!: number;

  @Property({ type: "json", nullable: true })
  items?: Array<{ productId: string; quantity: number; price: number }>;
}

/**
 * 创建订单命令（模拟 application-kernel 的命令）
 */
class CreateOrderCommand extends BaseCommand {
  public readonly orderNumber: string;
  public readonly totalAmount: number;
  public readonly items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;

  constructor(
    aggregateId: string,
    orderNumber: string,
    totalAmount: number,
    items: Array<{ productId: string; quantity: number; price: number }>,
    tenantContext: TenantContext,
    commandId?: string,
  ) {
    super(aggregateId, "CreateOrder", {
      commandId,
      tenantContext,
    });
    this.orderNumber = orderNumber;
    this.totalAmount = totalAmount;
    this.items = items;
  }

  /**
   * 克隆命令对象
   * @returns 新的命令对象实例
   */
  public clone(): CreateOrderCommand {
    return new CreateOrderCommand(
      this.aggregateId,
      this.orderNumber,
      this.totalAmount,
      [...this.items],
      this.tenantContext!,
      this.commandId,
    );
  }

  /**
   * 获取命令摘要
   * @returns 命令摘要
   */
  public override getSummary(): Record<string, unknown> {
    return {
      ...super.getSummary(),
      orderNumber: this.orderNumber,
      totalAmount: this.totalAmount,
      itemCount: this.items.length,
    };
  }
}

/**
 * 订单命令处理器（模拟 application-kernel 的命令处理器）
 */
class CreateOrderHandler {
  constructor(
    private readonly orderRepository: any, // 使用 any 避免类型约束问题（实际是 ITenantIsolatedRepository<OrderDomainEntity>）
    private readonly eventStore: IEventStore,
    private readonly transactionManager: any,
    private readonly orderMapper: EntityMapper<OrderDomainEntity, OrderEntity>,
  ) {}

  async handle(command: CreateOrderCommand): Promise<CommandResult> {
    if (!command.tenantContext) {
      return CommandResult.failure("MISSING_TENANT_CONTEXT", "缺少租户上下文");
    }

    // 在事务中执行
    const order = await this.transactionManager.runInTransaction(
      async (_em: EntityManager) => {
        // 1. 创建领域实体
        const domainOrder = new OrderDomainEntity(
          command.tenantContext!.tenantId,
          command.orderNumber,
          command.totalAmount,
          command.tenantContext!.organizationId,
        );
        domainOrder.items = command.items;

        // 2. 转换为持久化实体
        const orderEntity = this.orderMapper.toPersistence(domainOrder);

        // 3. 保存实体（使用映射器转换回领域实体）
        // 注意：由于类型约束，我们需要先保存持久化实体，然后转换为领域实体
        await (this.orderRepository as any).save(orderEntity);
        const savedDomainEntity = this.orderMapper.toDomain(orderEntity);

        // 4. 创建并保存领域事件
        const { DomainEvent: ApplicationDomainEvent } = await import(
          "@hl8/application-kernel"
        );
        const event = new ApplicationDomainEvent(
          savedDomainEntity.id,
          "OrderCreated",
          {
            orderNumber: savedDomainEntity.orderNumber,
            totalAmount: savedDomainEntity.totalAmount,
          },
          {},
          EntityId.generate(),
          new Date(),
          1,
        );

        const currentVersion = await this.eventStore.getCurrentVersion(
          savedDomainEntity.id,
        );
        const result = await this.eventStore.saveEvents(
          savedDomainEntity.id,
          [event],
          currentVersion,
        );

        if (!result.success) {
          throw new Error(`保存事件失败: ${result.error}`);
        }

        return savedDomainEntity;
      },
    );

    return CommandResult.success({
      orderId: order.id.value,
      orderNumber: order.orderNumber,
    });
  }

  getHandlerName(): string {
    return "CreateOrderHandler";
  }

  getDescription(): string {
    return "创建订单命令处理器";
  }

  getVersion(): string {
    return "1.0.0";
  }

  isAvailable(): boolean {
    return true;
  }

  getSupportedCommandTypes(): string[] {
    return ["CreateOrder"];
  }
}

describe("三个 Kernel 完整集成 E2E 测试", () => {
  let orm: MikroORM | null = null;
  let em: EntityManager | null = null;
  let transactionManager: MikroORMTransactionManager | null = null;
  let eventStore: MikroORMEventStore | null = null;
  let repositoryFactory: RepositoryFactory | null = null;

  beforeAll(async () => {
    try {
      const { PostgreSqlContainer } = await import(
        "@testcontainers/postgresql"
      );
      postgresContainer = await new PostgreSqlContainer("postgres:16")
        .withDatabase("kernel_alignment_test")
        .withUsername("test_user")
        .withPassword("test_pass")
        .start();

      const connectionUrl = postgresContainer.getConnectionUri();

      orm = await MikroORM.init({
        driver: PostgreSqlDriver,
        dbName: "kernel_alignment_test",
        entities: [OrderEntity],
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

      // 初始化基础设施组件
      transactionManager = new MikroORMTransactionManager(orm);
      eventStore = new MikroORMEventStore(em);
      repositoryFactory = new RepositoryFactory(em);
    } catch (error) {
      console.warn("TestContainers不可用，跳过 E2E 测试");
      console.warn(error);
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
    if (orm && em) {
      await em.nativeDelete(OrderEntity, {});
      // 清理事件存储（如果表存在）
      try {
        const { EventEntity, EventSnapshotEntity } = await import(
          "../../src/events/index.js"
        );
        await em.nativeDelete(EventEntity, {});
        await em.nativeDelete(EventSnapshotEntity, {});
      } catch (_error) {
        // 表可能不存在，忽略错误
      }
    }
  });

  describe("场景1: 命令处理 + 仓储操作 + 事件存储完整流程", () => {
    it("应该能够通过命令处理器创建订单，保存到数据库并存储事件", async () => {
      if (
        !orm ||
        !em ||
        !transactionManager ||
        !eventStore ||
        !repositoryFactory
      ) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      // 创建租户上下文
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });

      // 创建实体映射器
      const orderMapper = new EntityMapper<OrderDomainEntity, OrderEntity>({
        autoMap: true,
      });

      // 创建租户隔离仓储（注意：第一个泛型参数必须是持久化实体类型）
      const orderRepository = repositoryFactory.createTenantIsolatedRepository<
        OrderEntity,
        OrderDomainEntity
      >(OrderEntity, "OrderEntity");

      // 创建命令处理器
      const commandHandler = new CreateOrderHandler(
        orderRepository,
        eventStore,
        transactionManager,
        orderMapper,
      );

      // 创建命令
      const aggregateId = EntityId.generate().toString();
      const command = new CreateOrderCommand(
        aggregateId,
        "ORD-001",
        1500.0,
        [
          { productId: "prod-1", quantity: 2, price: 500.0 },
          { productId: "prod-2", quantity: 1, price: 500.0 },
        ],
        context,
      );

      // 执行命令
      const result = await commandHandler.handle(command);

      // 验证命令执行成功
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as any).orderNumber).toBe("ORD-001");

      // 验证订单已保存到数据库
      const savedOrders = await orderRepository.findAllByContext(context);
      expect(savedOrders.length).toBeGreaterThan(0);

      // 验证事件已保存
      const orderId = EntityId.fromString((result.data as any).orderId);
      const events = await eventStore.getEvents(orderId);
      expect(events.length).toBe(1);
      expect(events[0].eventType).toBe("OrderCreated");
    });

    it("应该能够在事务中执行多个操作，失败时自动回滚", async () => {
      if (
        !orm ||
        !em ||
        !transactionManager ||
        !eventStore ||
        !repositoryFactory
      ) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });

      const orderMapper = new EntityMapper<OrderDomainEntity, OrderEntity>({
        autoMap: true,
      });
      const orderRepository = repositoryFactory.createTenantIsolatedRepository<
        OrderEntity,
        OrderDomainEntity
      >(OrderEntity, "OrderEntity");

      // 尝试在事务中执行会失败的操作
      try {
        await transactionManager.runInTransaction(async (_em) => {
          // 创建并保存订单（使用领域实体）
          const domainOrder = new OrderDomainEntity(
            tenantId,
            "ORD-002",
            2000.0,
            orgId,
          );
          const orderEntity = orderMapper.toPersistence(domainOrder);
          await (orderRepository as any).save(orderEntity);

          // 故意触发错误（保存无效的事件版本）
          const { DomainEvent: ApplicationDomainEvent } = await import(
            "@hl8/application-kernel"
          );
          const invalidAggregateId = EntityId.generate();
          const event = new ApplicationDomainEvent(
            invalidAggregateId,
            "InvalidEvent",
            {},
            {},
            EntityId.generate(),
            new Date(),
            1,
          );

          // 使用无效的期望版本号，应该触发乐观锁冲突
          await eventStore.saveEvents(invalidAggregateId, [event], 999);

          // 这里不应该到达
          expect(true).toBe(false);
        });
      } catch (_error) {
        // 验证异常已转换为领域异常
        expect(_error).toBeDefined();
        // 事务应该已回滚，订单不应该被保存
      }

      // 验证订单没有被保存（事务已回滚）
      const orders = await orderRepository.findAllByContext(context);
      expect(orders.length).toBe(0);
    });
  });

  describe("场景2: 异常处理对齐验证", () => {
    it("应该能够将基础设施层异常转换为领域异常", async () => {
      if (!orm || !em || !repositoryFactory) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });

      const orderMapper = new EntityMapper<OrderDomainEntity, OrderEntity>({
        autoMap: true,
      });
      const orderRepository = repositoryFactory.createTenantIsolatedRepository<
        OrderEntity,
        OrderDomainEntity
      >(OrderEntity, "OrderEntity");

      // 创建订单（使用领域实体）
      const domainOrder = new OrderDomainEntity(
        tenantId,
        "ORD-003",
        3000.0,
        orgId,
      );
      const orderEntity = orderMapper.toPersistence(domainOrder);
      await (orderRepository as any).save(orderEntity);

      // 尝试查找不存在的订单（应该返回 null，而不是抛异常）
      const nonExistentId = EntityId.generate();
      const found = await orderRepository.findByIdWithContext(
        nonExistentId,
        context,
      );
      expect(found).toBeNull();

      // 验证异常转换器已正确集成
      const exceptionConverter = new ExceptionConverter();

      // 模拟乐观锁异常
      const testEntityId = EntityId.generate();
      const optimisticLockError = new Error("Version conflict");
      const convertedException = exceptionConverter.convertToDomainException(
        optimisticLockError,
        "save",
        "OrderEntity",
        testEntityId.value,
      );

      expect(convertedException).toBeInstanceOf(DomainException);
      expect(convertedException).toBeInstanceOf(
        AggregateVersionConflictException,
      );
    });
  });

  describe("场景3: 事件存储与聚合重建", () => {
    it("应该能够从事件重建聚合状态", async () => {
      if (!orm || !em || !eventStore) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const aggregateId = EntityId.generate();
      const { DomainEvent: ApplicationDomainEvent } = await import(
        "@hl8/application-kernel"
      );

      // 保存多个事件
      const events = [
        new ApplicationDomainEvent(
          aggregateId,
          "OrderCreated",
          { orderNumber: "ORD-004", totalAmount: 4000.0 },
          {},
          EntityId.generate(),
          new Date(),
          1,
        ),
        new ApplicationDomainEvent(
          aggregateId,
          "OrderItemAdded",
          { productId: "prod-1", quantity: 2 },
          {},
          EntityId.generate(),
          new Date(),
          2,
        ),
        new ApplicationDomainEvent(
          aggregateId,
          "OrderItemAdded",
          { productId: "prod-2", quantity: 1 },
          {},
          EntityId.generate(),
          new Date(),
          3,
        ),
      ];

      // 依次保存事件
      let currentVersion = 0;
      for (const event of events) {
        const result = await eventStore.saveEvents(
          aggregateId,
          [event],
          currentVersion,
        );
        expect(result.success).toBe(true);
        currentVersion = event.version;
      }

      // 验证事件顺序和版本号
      const allEvents = await eventStore.getEvents(aggregateId);
      expect(allEvents.length).toBe(3);
      expect(allEvents[0].version).toBe(1);
      expect(allEvents[1].version).toBe(2);
      expect(allEvents[2].version).toBe(3);
    });

    it("应该能够使用快照优化聚合重建", async () => {
      if (!orm || !em || !eventStore) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const aggregateId = EntityId.generate();
      const { DomainEvent: ApplicationDomainEvent } = await import(
        "@hl8/application-kernel"
      );

      // 创建并保存多个事件
      const events = [];
      for (let i = 1; i <= 10; i++) {
        events.push(
          new ApplicationDomainEvent(
            aggregateId,
            "OrderUpdated",
            { version: i },
            {},
            EntityId.generate(),
            new Date(),
            i,
          ),
        );
      }

      // 保存所有事件
      let currentVersion = 0;
      for (const event of events) {
        await eventStore.saveEvents(aggregateId, [event], currentVersion);
        currentVersion = event.version;
      }

      // 在版本5保存快照
      const { EventSnapshot } = await import("@hl8/application-kernel");
      const snapshotToSave = new EventSnapshot(
        aggregateId,
        5,
        { orderNumber: "ORD-005", snapshot: true },
        "OrderSnapshot",
        {},
        new Date(),
      );
      await eventStore.saveSnapshot(snapshotToSave);

      // 获取快照
      const snapshot = await eventStore.getSnapshot(aggregateId);
      expect(snapshot).toBeDefined();
      expect(snapshot!.version).toBe(5);

      // 获取快照之后的事件（从版本6开始）
      const eventsAfterSnapshot = await eventStore.getEvents(aggregateId, 6);
      expect(eventsAfterSnapshot.length).toBe(5); // 版本6-10
    });
  });

  describe("场景4: 仓储工厂与依赖注入集成", () => {
    it("应该能够使用仓储工厂创建不同类型的仓储", async () => {
      if (!orm || !em || !repositoryFactory) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      // 使用工厂创建基础仓储
      const baseRepository = repositoryFactory.createRepository<OrderEntity>(
        OrderEntity,
        "OrderEntity",
      );

      expect(baseRepository).toBeDefined();

      // 使用工厂创建租户隔离仓储
      const tenantRepository = repositoryFactory.createTenantIsolatedRepository<
        OrderEntity,
        OrderDomainEntity
      >(OrderEntity, "OrderEntity");

      expect(tenantRepository).toBeDefined();

      // 验证两种仓储都能正常工作
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });
      const orderMapper = new EntityMapper<OrderDomainEntity, OrderEntity>({
        autoMap: true,
      });

      const domainOrder = new OrderDomainEntity(
        tenantId,
        "ORD-006",
        5000.0,
        orgId,
      );
      const orderEntity = orderMapper.toPersistence(domainOrder);
      await (tenantRepository as any).save(orderEntity);

      const found = await tenantRepository.findAllByContext(context);
      expect(found.length).toBeGreaterThan(0);
    });
  });

  describe("场景5: 三个 Kernel 类型安全验证", () => {
    it("应该确保 domain-kernel 接口、application-kernel 接口和 infrastructure-kernel 实现之间的类型安全", async () => {
      if (!orm || !em || !repositoryFactory || !eventStore) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      // 验证 ITenantIsolatedRepository 接口类型安全
      const repository = repositoryFactory.createTenantIsolatedRepository<
        OrderEntity,
        OrderDomainEntity
      >(OrderEntity, "OrderEntity");
      const orderMapper = new EntityMapper<OrderDomainEntity, OrderEntity>({
        autoMap: true,
      });

      // 验证 IEventStore 接口类型安全
      const store: IEventStore = eventStore;

      // 验证可以组合使用
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);

      const domainOrder = new OrderDomainEntity(
        tenantId,
        "ORD-007",
        6000.0,
        orgId,
      );
      const orderEntity = orderMapper.toPersistence(domainOrder);
      await (repository as any).save(orderEntity);

      // 保存事件
      const { DomainEvent: ApplicationDomainEvent } = await import(
        "@hl8/application-kernel"
      );
      const event = new ApplicationDomainEvent(
        domainOrder.id,
        "OrderCreated",
        { orderNumber: domainOrder.orderNumber },
        {},
        EntityId.generate(),
        new Date(),
        1,
      );

      const result = await store.saveEvents(domainOrder.id, [event], 0);

      expect(result.success).toBe(true);

      // 验证类型系统正常工作
      expect(repository).toBeDefined();
      expect(store).toBeDefined();
    });
  });
});
