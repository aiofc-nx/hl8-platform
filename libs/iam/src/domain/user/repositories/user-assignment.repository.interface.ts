/**
 * @fileoverview 用户分配仓储接口
 * @description 定义用户分配聚合根的数据访问接口
 */

import { IRepository } from "@hl8/domain-kernel";
import { UserAssignment } from "../aggregates/user-assignment.aggregate.js";
import { EntityId, TenantId } from "@hl8/domain-kernel";

/**
 * 用户分配仓储接口
 * @description 定义用户分配聚合根的数据访问接口
 */
export interface IUserAssignmentRepository extends IRepository<UserAssignment> {
  /**
   * 根据用户ID和租户ID查找用户分配
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @returns 用户分配聚合根，如果不存在则返回null
   */
  findByUserIdAndTenantId(
    userId: EntityId,
    tenantId: TenantId,
  ): Promise<UserAssignment | null>;

  /**
   * 根据用户ID查找所有用户分配
   * @param userId 用户ID
   * @returns 用户分配聚合根数组
   */
  findByUserId(userId: EntityId): Promise<UserAssignment[]>;

  /**
   * 根据租户ID查找所有用户分配
   * @param tenantId 租户ID
   * @returns 用户分配聚合根数组
   */
  findByTenantId(tenantId: TenantId): Promise<UserAssignment[]>;

  /**
   * 检查用户是否已分配到租户
   * @param userId 用户ID
   * @param tenantId 租户ID
   * @returns 是否已分配
   */
  existsByUserIdAndTenantId(
    userId: EntityId,
    tenantId: TenantId,
  ): Promise<boolean>;
}
