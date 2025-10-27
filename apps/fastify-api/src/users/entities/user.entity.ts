/**
 * 用户实体
 * @description 用户领域实体，定义用户的基本属性
 */
export class User {
  /**
   * 用户唯一标识符
   */
  id: number;

  /**
   * 用户名称
   */
  name: string;

  /**
   * 用户邮箱
   */
  email: string;

  /**
   * 用户密码（实际应用中应该加密存储）
   */
  password: string;

  /**
   * 用户创建时间
   */
  createdAt: Date;

  /**
   * 用户更新时间
   */
  updatedAt: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
