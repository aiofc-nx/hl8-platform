/**
 * @fileoverview MikroORM基础实体
 * @description 提供MikroORM持久化实体的基类，包含审计字段、版本控制和软删除
 */

import { PrimaryKey, Property, Entity, OptionalProps } from "@mikro-orm/core";
import { EntityId } from "@hl8/domain-kernel";

/**
 * MikroORM基础实体
 * @description 提供所有持久化实体的基础功能，包括ID、时间戳、版本控制和软删除
 */
@Entity({ abstract: true })
export abstract class BaseEntity {
  /**
   * 实体可选属性
   * @description MikroORM的hook机制，用于优化查询性能
   */
  [OptionalProps]?: "createdAt" | "updatedAt" | "deletedAt" | "version";

  /**
   * 主键：实体唯一标识符
   * @description 使用UUID v4格式，由MikroORM自动生成
   * PostgreSQL使用gen_random_uuid()，MongoDB自动忽略defaultRaw
   */
  @PrimaryKey({
    type: "uuid",
    defaultRaw: "gen_random_uuid()",
    fieldName: "_id", // MongoDB需要_id作为主键
  })
  id!: string;

  /**
   * 创建时间
   * @description 实体首次创建时的时间戳，自动设置为当前时间
   */
  @Property()
  createdAt = new Date();

  /**
   * 更新时间
   * @description 实体最后修改时的时间戳，每次更新时自动刷新
   */
  @Property({ onUpdate: () => new Date() })
  updatedAt = new Date();

  /**
   * 乐观锁版本号
   * @description 用于处理并发更新冲突，每次更新自动递增
   */
  @Property({ version: true })
  version = 1;

  /**
   * 软删除时间戳
   * @description 标记实体删除时间，支持软删除功能
   */
  @Property({ nullable: true })
  deletedAt?: Date | null;

  /**
   * 判断实体是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  }

  /**
   * 软删除实体
   * @description 标记实体为已删除，不实际删除数据
   */
  public softDelete(): void {
    this.deletedAt = new Date();
  }

  /**
   * 恢复已删除的实体
   * @description 取消软删除标记，恢复实体可用状态
   */
  public restore(): void {
    this.deletedAt = null;
  }

  /**
   * 转换为领域实体ID
   * @description 将MikroORM字符串ID转换为领域层的EntityId值对象
   * @returns 领域实体标识符
   */
  public toEntityId(): EntityId {
    return new EntityId(this.id);
  }

  /**
   * 验证实体完整性
   * @throws {Error} 当实体数据不完整时抛出异常
   */
  public validate(): void {
    if (!this.id) {
      throw new Error("实体ID不能为空");
    }

    if (this.version < 1) {
      throw new Error("版本号必须大于等于1");
    }

    if (!this.createdAt) {
      throw new Error("创建时间不能为空");
    }
  }
}
