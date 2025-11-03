/**
 * @fileoverview 用户仓储接口
 * @description 定义用户聚合根的数据访问接口
 */

import { IRepository } from "@hl8/domain-kernel";
import { User } from "../aggregates/user.aggregate.js";
import { EmailValueObject } from "../value-objects/email.value-object.js";
import { PhoneNumberValueObject } from "../value-objects/phone-number.value-object.js";

/**
 * 用户仓储接口
 * @description 提供用户聚合根的数据访问抽象，支持标准CRUD和业务查询
 */
export interface IUserRepository extends IRepository<User> {
  /**
   * 根据邮箱查找用户
   * @param email 邮箱值对象
   * @returns 用户聚合根或null
   * @throws {RepositoryException} 当查找失败时抛出
   */
  findByEmail(email: EmailValueObject): Promise<User | null>;

  /**
   * 根据手机号查找用户
   * @param phoneNumber 手机号值对象
   * @returns 用户聚合根或null
   * @throws {RepositoryException} 当查找失败时抛出
   */
  findByPhoneNumber(phoneNumber: PhoneNumberValueObject): Promise<User | null>;

  /**
   * 检查邮箱是否已存在
   * @param email 邮箱值对象
   * @returns 是否存在
   * @throws {RepositoryException} 当检查失败时抛出
   */
  existsByEmail(email: EmailValueObject): Promise<boolean>;

  /**
   * 检查手机号是否已存在
   * @param phoneNumber 手机号值对象
   * @returns 是否存在
   * @throws {RepositoryException} 当检查失败时抛出
   */
  existsByPhoneNumber(phoneNumber: PhoneNumberValueObject): Promise<boolean>;
}
