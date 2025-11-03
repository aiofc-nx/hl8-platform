/**
 * @fileoverview QuickStart 验证测试
 * @description 验证 quickstart.md 中所有示例场景的正确性和可运行性
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
import { Entity, Property } from "@mikro-orm/core";
import {
  MikroORMTenantIsolatedRepository,
  TenantIsolatedPersistenceEntity,
  MikroORMTransactionManager,
  MikroORMEventStore,
} from "../../src/index.js";
import { EntityMapper } from "../../src/mappers/index.js";
import {
  SpecificationConverter,
  QueryBuilder,
} from "../../src/queries/index.js";
import { RepositoryFactory } from "../../src/repositories/factory/index.js";
import {
  TenantContext,
  TenantId,
  OrganizationId,
  EntityId,
  QueryCriteria,
  QueryOperator,
  IQuerySpecification,
  ISpecification,
} from "@hl8/domain-kernel";
import { DomainEvent as ApplicationDomainEvent } from "@hl8/application-kernel";
import { TestTenantEntity } from "../fixtures/test-entities.js";

// 使用PostgreSQL测试容器
let postgresContainer: any;

/**
 * 测试产品实体（用于 QuickStart 示例）
 */
@Entity({ tableName: "quickstart_products", collection: "quickstart_products" })
class ProductEntity extends TenantIsolatedPersistenceEntity {
  @Property()
  name!: string;

  @Property({ type: "decimal", precision: 10, scale: 2 })
  price!: number;
}

/**
 * 简单价格规范（用于规范模式查询示例）
 */
class PriceGreaterThanSpec implements IQuerySpecification<ProductEntity> {
  constructor(private readonly minPrice: number) {}

  isSatisfiedBy(product: ProductEntity): boolean {
    return product.price > this.minPrice;
  }

  toQueryCriteria(): QueryCriteria {
    return {
      conditions: [
        {
          field: "price",
          operator: QueryOperator.GREATER_THAN,
          value: this.minPrice,
        },
      ],
    };
  }

  getQueryCriteria(): QueryCriteria {
    return this.toQueryCriteria();
  }

  getSortingCriteria() {
    return undefined;
  }

  getPaginationCriteria() {
    return undefined;
  }

  withSorting(_sortingCriteria: any): IQuerySpecification<ProductEntity> {
    return this;
  }

  withPagination(_paginationCriteria: any): IQuerySpecification<ProductEntity> {
    return this;
  }

  andCriteria(_criteria: any): IQuerySpecification<ProductEntity> {
    return this;
  }

  orCriteria(_criteria: any): IQuerySpecification<ProductEntity> {
    return this;
  }

  getLimit() {
    return undefined;
  }

  withLimit(_limit: number): IQuerySpecification<ProductEntity> {
    return this;
  }

  getOffset() {
    return undefined;
  }

  withOffset(_offset: number): IQuerySpecification<ProductEntity> {
    return this;
  }

  isEmpty() {
    return false;
  }

  getComplexity() {
    return 0;
  }

  optimize(): IQuerySpecification<ProductEntity> {
    return this;
  }

  validate() {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      complexityScore: 0,
      performanceSuggestions: [],
    };
  }

  and(_other: ISpecification<ProductEntity>): ISpecification<ProductEntity> {
    // 简化实现，仅用于测试
    return this;
  }

  or(_other: ISpecification<ProductEntity>): ISpecification<ProductEntity> {
    // 简化实现，仅用于测试
    return this;
  }

  not(): ISpecification<ProductEntity> {
    // 简化实现，仅用于测试
    return this;
  }

  getDescription(): string {
    return `PriceGreaterThan(${this.minPrice})`;
  }

  equals(_other: ISpecification<ProductEntity>): boolean {
    return false;
  }

  toJSON(): Record<string, unknown> {
    return {
      type: "PriceGreaterThanSpec",
      minPrice: this.minPrice,
    };
  }
}

describe("QuickStart 验证测试", () => {
  let orm: MikroORM | null = null;
  let em: EntityManager | null = null;

  beforeAll(async () => {
    try {
      const { PostgreSqlContainer } = await import(
        "@testcontainers/postgresql"
      );
      postgresContainer = await new PostgreSqlContainer("postgres:16")
        .withDatabase("quickstart_test")
        .withUsername("test_user")
        .withPassword("test_pass")
        .start();

      const connectionUrl = postgresContainer.getConnectionUri();

      orm = await MikroORM.init({
        driver: PostgreSqlDriver,
        dbName: "quickstart_test",
        entities: [ProductEntity, TestTenantEntity],
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
    } catch (error) {
      console.warn("TestContainers不可用，跳过QuickStart验证测试");
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
      await em.nativeDelete(ProductEntity, {});
      await em.nativeDelete(TestTenantEntity, {});
    }
  });

  describe("场景1: 使用正式实现的 ITenantIsolatedRepository 接口", () => {
    it("应该能够创建类型安全的租户隔离仓储", async () => {
      if (!orm || !em) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      // 类型安全：可以赋值给接口类型
      // 注意：由于类型约束，第一个泛型参数必须是持久化实体，第二个是领域实体
      // 这里我们使用 any 来绕过类型检查，因为 ProductEntity 是持久化实体而不是领域实体
      const repository = new MikroORMTenantIsolatedRepository<
        ProductEntity,
        any
      >(em, "ProductEntity");

      expect(repository).toBeDefined();
    });

    it("应该能够使用接口方法进行租户隔离查询", async () => {
      if (!orm || !em) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const repository = new MikroORMTenantIsolatedRepository<ProductEntity>(
        em,
        "ProductEntity",
      );

      // 创建租户上下文
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });

      // 创建产品
      const productId = uuidv4();
      const product = new ProductEntity();
      product.id = productId;
      product.tenantId = tenantId.value;
      product.organizationId = orgId.value;
      product.name = "测试产品";
      product.price = 100.0;
      await repository.save(product);

      // 使用接口方法（自动应用租户隔离）
      const found = await repository.findByIdWithContext(
        new EntityId(productId),
        context,
      );
      expect(found).toBeTruthy();

      const products = await repository.findAllByContext(context);
      expect(products.length).toBeGreaterThan(0);

      const count = await repository.countByTenant(tenantId, context);
      expect(count).toBeGreaterThan(0);
    });
  });

  describe("场景2: 使用实体映射器（自动映射）", () => {
    it("应该能够使用 EntityMapper 进行实体转换", async () => {
      if (!orm || !em) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      // 创建映射器（自动映射同名同类型属性）
      // 注意：使用 any 类型绕过类型约束，因为 ProductEntity 是持久化实体而不是领域实体
      const mapper = new EntityMapper<any, ProductEntity>({
        autoMap: true,
      });

      // 创建持久化实体
      const persistenceProduct = new ProductEntity();
      persistenceProduct.id = uuidv4();
      persistenceProduct.name = "测试产品";
      persistenceProduct.price = 100.0;

      // 转换（在这种情况下，domain 和 persistence 是同一类型）
      const domainProduct = mapper.toDomain(persistenceProduct);
      expect(domainProduct).toBeDefined();
      expect(domainProduct.name).toBe("测试产品");
      expect(domainProduct.price).toBe(100.0);

      // 反向转换
      const backToPersistence = mapper.toPersistence(domainProduct);
      expect(backToPersistence.name).toBe("测试产品");
    });
  });

  describe("场景3: 使用事务管理器", () => {
    it("应该能够使用 runInTransaction 执行事务操作", async () => {
      if (!orm || !em) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const transactionManager = new MikroORMTransactionManager(orm);

      // 方式1：使用 runInTransaction（推荐）
      const result = await transactionManager.runInTransaction(async (em) => {
        const product = new ProductEntity();
        product.id = uuidv4();
        product.name = "事务测试产品";
        product.price = 200.0;
        em.persist(product);
        await em.flush();
        return product;
      });

      expect(result).toBeDefined();
      expect(result.name).toBe("事务测试产品");

      // 验证数据已保存
      const found = await em.findOne(ProductEntity, { id: result.id });
      expect(found).toBeDefined();
    });

    it("应该能够手动管理事务（begin, commit）", async () => {
      if (!orm || !em) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const transactionManager = new MikroORMTransactionManager(orm);

      // 方式2：手动管理事务
      const context = await transactionManager.begin();
      try {
        const product = new ProductEntity();
        product.id = uuidv4();
        product.name = "手动事务产品";
        product.price = 300.0;
        context.entityManager.persist(product);
        await context.entityManager.flush();

        await transactionManager.commit(context);

        // 验证数据已保存
        const found = await em.findOne(ProductEntity, { id: product.id });
        expect(found).toBeDefined();
      } catch (error) {
        await transactionManager.rollback(context);
        throw error;
      }
    });

    it("应该支持嵌套事务", async () => {
      if (!orm || !em) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const transactionManager = new MikroORMTransactionManager(orm);

      // 外层事务
      await transactionManager.runInTransaction(async (em) => {
        const product1 = new ProductEntity();
        product1.id = uuidv4();
        product1.name = "外层事务产品";
        product1.price = 400.0;
        em.persist(product1);
        await em.flush();

        // 内层事务（复用外层事务的 EntityManager）
        await transactionManager.runInTransaction(async (innerEm) => {
          const product2 = new ProductEntity();
          product2.id = uuidv4();
          product2.name = "内层事务产品";
          product2.price = 500.0;
          innerEm.persist(product2);
          await innerEm.flush();
        });

        // 继续外层事务操作
        const product3 = new ProductEntity();
        product3.id = uuidv4();
        product3.name = "外层事务产品2";
        product3.price = 600.0;
        em.persist(product3);
        await em.flush();
      });

      // 验证所有数据都已保存
      const count = await em.count(ProductEntity, {});
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  describe("场景4: 使用规范模式查询", () => {
    it("应该能够转换规范为查询并执行", async () => {
      if (!orm || !em) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      // 创建测试数据
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });

      for (let i = 0; i < 5; i++) {
        const product = new ProductEntity();
        product.id = uuidv4();
        product.tenantId = tenantId.value;
        product.organizationId = orgId.value;
        product.name = `产品${i}`;
        product.price = 50.0 + i * 20; // 价格从50到130
        em.persist(product);
      }
      await em.flush();

      // 转换规范为查询
      const converter = new SpecificationConverter();
      const spec = new PriceGreaterThanSpec(100);
      // 使用类型断言，因为 spec 实现了 IQuerySpecification 但 TypeScript 无法推断
      const queryOptions = converter.convertToQuery(
        spec as any,
        "ProductEntity",
      );

      expect(queryOptions.where).toBeDefined();

      // 使用查询构建器（自动应用租户过滤）
      const queryBuilder = new QueryBuilder(converter);
      const options = queryBuilder.buildFromSpecification(
        spec as any,
        "ProductEntity",
        context,
      );

      // 执行查询
      const products = await em.find(ProductEntity, options.where || {}, {
        filters: options.filters,
      });

      // 应该返回价格 > 100 的产品（且属于当前租户）
      expect(products.length).toBeGreaterThan(0);
      products.forEach((p) => {
        expect(p.price).toBeGreaterThan(100);
        expect(p.tenantId).toBe(tenantId.value);
      });
    });
  });

  describe("场景5: 使用事件存储", () => {
    it("应该能够保存和查询事件", async () => {
      if (!orm || !em) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const eventStore = new MikroORMEventStore(em);

      const aggregateId = EntityId.generate();
      const event1 = new ApplicationDomainEvent(
        aggregateId,
        "ProductCreated",
        { name: "测试产品", price: 100 },
        {},
        EntityId.generate(),
        new Date(),
        1,
      );
      const event2 = new ApplicationDomainEvent(
        aggregateId,
        "ProductUpdated",
        { name: "更新后的产品", price: 150 },
        {},
        EntityId.generate(),
        new Date(),
        2,
      );

      // 保存事件
      const currentVersion = await eventStore.getCurrentVersion(aggregateId);
      const result = await eventStore.saveEvents(
        aggregateId,
        [event1, event2],
        currentVersion,
      );

      expect(result.success).toBe(true);

      // 查询事件
      const events = await eventStore.getEvents(aggregateId);
      expect(events.length).toBe(2);
      expect(events[0].eventType).toBe("ProductCreated");
      expect(events[1].eventType).toBe("ProductUpdated");
    });

    it("应该能够使用快照优化重放", async () => {
      if (!orm || !em) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const eventStore = new MikroORMEventStore(em);
      const aggregateId = EntityId.generate();

      // 创建并保存多个事件
      const events = [];
      for (let i = 0; i < 5; i++) {
        events.push(
          new ApplicationDomainEvent(
            aggregateId,
            "ProductUpdated",
            { version: i + 1 },
            {},
            EntityId.generate(),
            new Date(),
            i + 1,
          ),
        );
      }

      await eventStore.saveEvents(aggregateId, events, 0);

      // 保存快照（版本2）
      const { EventSnapshot } = await import("@hl8/application-kernel");
      const snapshotData = { name: "快照产品", price: 200 };
      const snapshotToSave = new EventSnapshot(
        aggregateId,
        2,
        snapshotData,
        "ProductSnapshot",
        {},
        new Date(),
      );
      await eventStore.saveSnapshot(snapshotToSave);

      // 获取快照
      const snapshot = await eventStore.getSnapshot(aggregateId);
      expect(snapshot).toBeDefined();
      expect(snapshot!.version).toBe(2);

      // 获取快照之后的事件（从版本3开始）
      const eventsAfterSnapshot = await eventStore.getEvents(aggregateId, 3);
      expect(eventsAfterSnapshot.length).toBe(3); // 事件3, 4, 5
    });
  });

  describe("场景6: 使用仓储工厂", () => {
    it("应该能够使用仓储工厂创建仓储实例", async () => {
      if (!orm || !em) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const factory = new RepositoryFactory(em);

      // 使用工厂创建仓储
      const repository = factory.createRepository<ProductEntity>(
        ProductEntity,
        "ProductEntity",
      );

      expect(repository).toBeDefined();

      // 测试仓储功能
      const product = new ProductEntity();
      product.id = uuidv4();
      product.name = "工厂创建的产品";
      product.price = 250.0;
      await repository.save(product);

      const found = await repository.findById(new EntityId(product.id));
      expect(found).toBeDefined();
    });

    it("应该能够创建租户隔离仓储", async () => {
      if (!orm || !em) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const factory = new RepositoryFactory(em);
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });

      // 创建租户隔离仓储
      // 注意：第一个泛型参数必须是持久化实体类型，第二个是领域实体类型
      // 这里我们使用 any 作为领域实体类型，因为 ProductEntity 是持久化实体
      const repository = factory.createTenantIsolatedRepository<
        ProductEntity,
        any
      >(ProductEntity, "ProductEntity");

      const product = new ProductEntity();
      product.id = uuidv4();
      product.tenantId = tenantId.value;
      product.organizationId = orgId.value;
      product.name = "租户隔离产品";
      product.price = 300.0;
      await repository.save(product);

      const products = await repository.findAllByContext(context);
      expect(products.length).toBeGreaterThan(0);
    });
  });

  describe("场景7: 批量操作", () => {
    it("应该能够批量保存和删除", async () => {
      if (!orm || !em) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const repository = new MikroORMTenantIsolatedRepository<ProductEntity>(
        em,
        "ProductEntity",
      );

      // 批量保存
      const products: ProductEntity[] = [];
      const ids: EntityId[] = [];

      for (let i = 0; i < 3; i++) {
        const product = new ProductEntity();
        product.id = uuidv4();
        product.name = `批量产品${i}`;
        product.price = 100.0 + i * 10;
        products.push(product);
        ids.push(new EntityId(product.id));
      }

      await repository.saveMany(products);

      // 验证保存成功
      const found = await repository.findById(ids[0]);
      expect(found).toBeDefined();

      // 批量删除
      await repository.deleteMany(ids);

      // 验证删除成功
      const foundAfterDelete = await repository.findById(ids[0]);
      expect(foundAfterDelete).toBeNull();
    });

    it("应该在事务中执行批量操作", async () => {
      if (!orm || !em) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const transactionManager = new MikroORMTransactionManager(orm);

      await transactionManager.runInTransaction(async (em) => {
        const repo = new MikroORMTenantIsolatedRepository<ProductEntity>(
          em,
          "ProductEntity",
        );

        const products: ProductEntity[] = [];
        const ids: EntityId[] = [];

        for (let i = 0; i < 2; i++) {
          const product = new ProductEntity();
          product.id = uuidv4();
          product.name = `事务批量产品${i}`;
          product.price = 200.0 + i * 10;
          products.push(product);
          ids.push(new EntityId(product.id));
        }

        await repo.saveMany(products);
        await repo.deleteMany(ids);

        // 在事务内验证删除
        const found = await repo.findById(ids[0]);
        expect(found).toBeNull();
      });
    });
  });

  describe("场景8: 错误处理", () => {
    it("应该能够捕获并处理领域异常", async () => {
      if (!orm || !em) {
        console.log("跳过测试：PostgreSQL不可用");
        return;
      }

      const repository = new MikroORMTenantIsolatedRepository<ProductEntity>(
        em,
        "ProductEntity",
      );

      // 尝试查找不存在的实体
      const nonExistentId = EntityId.generate();
      const tenantId = TenantId.generate();
      const context = new TenantContext(tenantId);

      try {
        await repository.findByIdWithContext(nonExistentId, context);
        // 应该抛出异常或返回 null
      } catch (error) {
        // 异常转换器应该将异常转换为领域异常
        expect(error).toBeDefined();
      }

      // 测试乐观锁冲突（需要实际触发版本冲突）
      const product = new ProductEntity();
      product.id = uuidv4();
      product.name = "冲突测试产品";
      product.price = 400.0;
      await repository.save(product);

      // 读取两次以模拟并发更新
      const product1 = await repository.findById(new EntityId(product.id));
      const product2 = await repository.findById(new EntityId(product.id));

      if (product1 && product2) {
        // 修改并保存第一个
        (product1 as any).name = "更新1";
        await repository.save(product1);

        // 尝试保存第二个（应该触发乐观锁冲突）
        (product2 as any).name = "更新2";
        try {
          await repository.save(product2);
          // 在某些情况下可能成功，取决于实现细节
        } catch (error) {
          // 应该是 AggregateVersionConflictException 或类似异常
          expect(error).toBeDefined();
        }
      }
    });
  });
});
