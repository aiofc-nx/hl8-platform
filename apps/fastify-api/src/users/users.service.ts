import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "./entities/user.entity";

/**
 * 用户服务
 * @description 处理用户相关的业务逻辑
 */
@Injectable()
export class UsersService {
  private users: User[] = [];
  private nextId = 1;

  /**
   * 创建新用户
   * @param createUserDto 创建用户的数据
   * @returns 创建的用户对象
   */
  create(createUserDto: CreateUserDto): User {
    const user = new User({
      id: this.nextId++,
      ...createUserDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.users.push(user);
    return user;
  }

  /**
   * 获取所有用户
   * @returns 用户列表
   */
  findAll(): User[] {
    return this.users;
  }

  /**
   * 根据ID查找用户
   * @param id 用户ID
   * @returns 用户对象
   * @throws NotFoundException 当用户不存在时抛出
   */
  findOne(id: number): User {
    const user = this.users.find((user) => user.id === id);
    if (!user) {
      throw new NotFoundException(`用户 ID ${id} 不存在`);
    }
    return user;
  }

  /**
   * 更新用户信息
   * @param id 用户ID
   * @param updateUserDto 更新用户的数据
   * @returns 更新后的用户对象
   * @throws NotFoundException 当用户不存在时抛出
   */
  update(id: number, updateUserDto: UpdateUserDto): User {
    const userIndex = this.users.findIndex((user) => user.id === id);
    if (userIndex === -1) {
      throw new NotFoundException(`用户 ID ${id} 不存在`);
    }

    const updatedUser = {
      ...this.users[userIndex],
      ...updateUserDto,
      updatedAt: new Date(),
    };

    this.users[userIndex] = updatedUser;
    return updatedUser;
  }

  /**
   * 删除用户
   * @param id 用户ID
   * @returns 删除操作结果
   * @throws NotFoundException 当用户不存在时抛出
   */
  remove(id: number): { message: string } {
    const userIndex = this.users.findIndex((user) => user.id === id);
    if (userIndex === -1) {
      throw new NotFoundException(`用户 ID ${id} 不存在`);
    }

    this.users.splice(userIndex, 1);
    return { message: `用户 ID ${id} 已成功删除` };
  }
}
