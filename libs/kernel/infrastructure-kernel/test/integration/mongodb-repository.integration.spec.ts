/**
 * @fileoverview MongoDB仓储集成测试
 * @description 使用TestContainers验证MikroORMRepository在MongoDB上的行为
 */

import { MikroORM, EntityManager } from "@mikro-orm/core";
import { MongoDriver } from "@mikro-orm/mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { v4 as uuidv4 } from "uuid";
import { MikroORMRepository } from "../../src/repositories/base/repository.base.js";
import { EntityId } from "@hl8/domain-kernel";
import { TestEntity } from "../fixtures/test-entities.js";

describe("MongoDB Repository Integration Tests", () => {
  let orm: MikroORM;
  let em: EntityManager;
  let mongoServer: MongoMemoryServer;
  let repository: MikroORMRepository<TestEntity>;

  beforeAll(async () => {
    // 使用MongoDB内存服务器进行测试
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: "test_db",
      },
    });
    const mongoUri = mongoServer.getUri();

    orm = await MikroORM.init({
      driver: MongoDriver,
      dbName: "test_db",
      entities: [TestEntity],
      clientUrl: mongoUri,
      debug: false,
      discovery: {
        disableDynamicFileAccess: true,
        requireEntitiesArray: true,
      },
    });

    em = orm.em.fork();

    // 创建仓储实例
    repository = new MikroORMRepository(em, "TestEntity");
  }, 60000); // 60秒超时

  afterAll(async () => {
    if (orm) {
      await orm.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe("Basic CRUD Operations", () => {
    it("应该能够保存实体到MongoDB", async () => {
      const id = uuidv4();
      const entity = new TestEntity();
      entity.id = id;
      entity.name = "Test Entity";
      entity.description = "Test Description";

      await repository.save(entity);

      const found = await repository.findById(new EntityId(id));
      expect(found).toBeTruthy();
      expect(found!.name).toBe("Test Entity");
      expect(found!.description).toBe("Test Description");
    });

    it("应该能够查找已保存的实体", async () => {
      const id = uuidv4();
      const entity = new TestEntity();
      entity.id = id;
      entity.name = "Find Test";
      await repository.save(entity);

      const found = await repository.findById(new EntityId(id));
      expect(found).toBeDefined();
      expect(found!.name).toBe("Find Test");
    });

    it("应该能够删除实体", async () => {
      const id = uuidv4();
      const entity = new TestEntity();
      entity.id = id;
      entity.name = "Delete Test";
      await repository.save(entity);

      let found = await repository.findById(new EntityId(id));
      expect(found).toBeDefined();

      await repository.delete(new EntityId(id));

      found = await repository.findById(new EntityId(id));
      expect(found).toBeNull();
    });

    it("应该能够检查实体是否存在", async () => {
      const id = uuidv4();
      const entity = new TestEntity();
      entity.id = id;
      entity.name = "Exists Test";
      await repository.save(entity);

      const exists = await repository.exists(new EntityId(id));
      expect(exists).toBe(true);

      const notExistsId = uuidv4();
      const notExists = await repository.exists(new EntityId(notExistsId));
      expect(notExists).toBe(false);
    });
  });

  describe("MongoDB Specific Features", () => {
    it("应该支持MongoDB文档存储", async () => {
      const id = uuidv4();
      const entity = new TestEntity();
      entity.id = id;
      entity.name = "Document Test";
      entity.description = "This is a test document in MongoDB";

      await repository.save(entity);

      const found = await repository.findById(new EntityId(id));
      expect(found).toBeDefined();
      expect(found!.description).toBe("This is a test document in MongoDB");
    });

    it("应该正确保存和检索MongoDB存储", async () => {
      const id = uuidv4();
      const entity = new TestEntity();
      entity.id = id;
      entity.name = "Storage Test";

      await repository.save(entity);

      const found = await repository.findById(new EntityId(id));
      expect(found).toBeDefined();
      expect(found!.id).toBe(id);
    });
  });
});
