import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";

describe("UsersService", () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it("应该被定义", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("应该创建新用户", () => {
      const createUserDto: CreateUserDto = {
        name: "测试用户",
        email: "test@example.com",
        password: "password123",
      };

      const user = service.create(createUserDto);
      expect(user).toBeDefined();
      expect(user.name).toBe(createUserDto.name);
      expect(user.email).toBe(createUserDto.email);
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeDefined();
    });
  });

  describe("findAll", () => {
    it("应该返回空数组当没有用户时", () => {
      expect(service.findAll()).toEqual([]);
    });

    it("应该返回所有用户", () => {
      const createUserDto: CreateUserDto = {
        name: "测试用户",
        email: "test@example.com",
        password: "password123",
      };

      service.create(createUserDto);
      const users = service.findAll();
      expect(users).toHaveLength(1);
    });
  });

  describe("findOne", () => {
    it("应该找到指定ID的用户", () => {
      const createUserDto: CreateUserDto = {
        name: "测试用户",
        email: "test@example.com",
        password: "password123",
      };

      const createdUser = service.create(createUserDto);
      const foundUser = service.findOne(createdUser.id);
      expect(foundUser).toEqual(createdUser);
    });

    it("应该抛出异常当用户不存在时", () => {
      expect(() => service.findOne(999)).toThrow("用户 ID 999 不存在");
    });
  });
});
