/**
 * @fileoverview 部门聚合根
 * @description 部门聚合根，管理部门信息（Phase 4 简化版本，Phase 8 将完善层级管理）
 */

import {
  AggregateRoot,
  EntityId,
  DepartmentId,
  OrganizationId,
} from "@hl8/domain-kernel";
import { DepartmentNameValueObject } from "../value-objects/department-name.value-object.js";
import { DepartmentPathValueObject } from "../value-objects/department-path.value-object.js";
import { DepartmentCreatedEvent } from "../events/department-created.event.js";

/**
 * 部门聚合根
 * @description 管理部门信息（Phase 4 简化版本，Phase 8 将完善层级管理）
 * @example
 * ```typescript
 * const department = Department.createRoot(
 *   organizationId,
 *   name
 * );
 * ```
 */
export class Department extends AggregateRoot {
  private _departmentId: DepartmentId;
  private _organizationId: OrganizationId;
  private _parentDepartmentId: DepartmentId | null;
  private _name: DepartmentNameValueObject;
  private _level: number;
  private _path: DepartmentPathValueObject;
  private _isRoot: boolean;

  /**
   * 设置父部门ID（用于从持久化重建）
   * @param parentDepartmentId 父部门ID
   */
  public setParentDepartmentId(parentDepartmentId: DepartmentId | null): void {
    this._parentDepartmentId = parentDepartmentId;
  }

  /**
   * 设置层级深度（用于从持久化重建）
   * @param level 层级深度
   */
  public setLevel(level: number): void {
    this._level = level;
  }

  /**
   * 设置路径（用于从持久化重建）
   * @param path 路径
   */
  public setPath(path: DepartmentPathValueObject): void {
    this._path = path;
  }

  /**
   * 设置是否为根部门（用于从持久化重建）
   * @param isRoot 是否根部门
   */
  public setIsRoot(isRoot: boolean): void {
    this._isRoot = isRoot;
  }

  /**
   * 创建部门聚合根（私有构造函数，使用静态工厂方法）
   * @param departmentId 部门ID
   * @param organizationId 组织ID
   * @param parentDepartmentId 父部门ID
   * @param name 部门名称
   * @param level 层级深度
   * @param path 路径
   * @param isRoot 是否根部门
   */
  private constructor(
    departmentId: DepartmentId,
    organizationId: OrganizationId,
    parentDepartmentId: DepartmentId | null,
    name: DepartmentNameValueObject,
    level: number,
    path: DepartmentPathValueObject,
    isRoot: boolean,
  ) {
    // 使用 DepartmentId 的值作为 EntityId
    super(EntityId.fromString(departmentId.value));
    this._departmentId = departmentId;
    this._organizationId = organizationId;
    this._parentDepartmentId = parentDepartmentId;
    this._name = name;
    this._level = level;
    this._path = path;
    this._isRoot = isRoot;
  }

  /**
   * 创建根部门（工厂方法）
   * @param organizationId 组织ID
   * @param name 部门名称
   * @returns 部门聚合根
   */
  public static createRoot(
    organizationId: OrganizationId,
    name: DepartmentNameValueObject,
  ): Department {
    const departmentId = new DepartmentId(organizationId);
    const path = new DepartmentPathValueObject(`/${departmentId.value}`);
    const department = new Department(
      departmentId,
      organizationId,
      null,
      name,
      1,
      path,
      true,
    );

    // 发布部门创建事件
    const createdEvent = new DepartmentCreatedEvent(
      EntityId.fromString(departmentId.value),
      {
        departmentId,
        organizationId,
        parentDepartmentId: null,
        name: name.value,
        level: department._level,
        isRoot: department._isRoot,
        createdAt: department.createdAt,
      },
    );

    department.addDomainEvent({
      type: "DepartmentCreated",
      aggregateRootId: EntityId.fromString(departmentId.value),
      timestamp: createdEvent.timestamp,
      data: createdEvent.eventData,
    });

    return department;
  }

  /**
   * 从持久化数据重建部门聚合根（工厂方法）
   * @param departmentId 部门ID
   * @param organizationId 组织ID
   * @param parentDepartmentId 父部门ID
   * @param name 部门名称
   * @param level 层级深度
   * @param path 路径
   * @param isRoot 是否根部门
   * @param createdAt 创建时间
   * @param version 版本号
   * @returns 部门聚合根
   */
  public static fromPersistence(
    departmentId: DepartmentId,
    organizationId: OrganizationId,
    parentDepartmentId: DepartmentId | null,
    name: DepartmentNameValueObject,
    level: number,
    path: DepartmentPathValueObject,
    isRoot: boolean,
    _createdAt: Date,
    _version: number,
  ): Department {
    const department = new Department(
      departmentId,
      organizationId,
      parentDepartmentId,
      name,
      level,
      path,
      isRoot,
    );
    // 注意：createdAt 由基类管理，版本号由AggregateRoot基类管理，这里不需要手动设置
    return department;
  }

  /**
   * 获取部门ID
   * @returns 部门ID值对象
   */
  public get departmentId(): DepartmentId {
    return this._departmentId;
  }

  /**
   * 获取组织ID
   * @returns 组织ID值对象
   */
  public get organizationId(): OrganizationId {
    return this._organizationId;
  }

  /**
   * 获取父部门ID
   * @returns 父部门ID值对象，如果是根部门则返回null
   */
  public get parentDepartmentId(): DepartmentId | null {
    return this._parentDepartmentId;
  }

  /**
   * 获取部门名称
   * @returns 部门名称值对象
   */
  public get name(): DepartmentNameValueObject {
    return this._name.clone() as DepartmentNameValueObject;
  }

  /**
   * 获取层级深度
   * @returns 层级深度（从1开始）
   */
  public get level(): number {
    return this._level;
  }

  /**
   * 获取路径
   * @returns 路径值对象
   */
  public get path(): DepartmentPathValueObject {
    return this._path.clone() as DepartmentPathValueObject;
  }

  /**
   * 是否根部门
   * @returns 是否根部门
   */
  public get isRoot(): boolean {
    return this._isRoot;
  }

  /**
   * 执行协调操作
   * @param operation 操作名称
   * @param _params 操作参数（目前未使用）
   * @returns 操作结果
   */
  protected performCoordination(operation: string, _params: unknown): unknown {
    // Department 目前没有需要协调的操作
    // Phase 8 将添加层级管理相关操作
    throw new Error(`未知操作: ${operation}`);
  }

  /**
   * 执行业务不变量验证
   * @returns 是否通过验证
   * @throws {Error} 当不变量被破坏时抛出
   */
  protected performBusinessInvariantValidation(): boolean {
    // 值对象在构造时已经验证，这里只需要检查层级
    if (this._level < 1) {
      throw new Error("部门层级深度必须大于0");
    }
    if (this._level > 8) {
      throw new Error("部门层级深度不能超过8层");
    }
    return true;
  }

  /**
   * 克隆聚合根
   * @returns 新的聚合根实例
   */
  public clone(): AggregateRoot {
    const cloned = new Department(
      this._departmentId,
      this._organizationId,
      this._parentDepartmentId,
      this._name.clone() as DepartmentNameValueObject,
      this._level,
      this._path.clone() as DepartmentPathValueObject,
      this._isRoot,
    );
    return cloned;
  }

  /**
   * 验证业务规则
   * @returns 是否通过验证
   */
  public validateBusinessRules(): boolean {
    return this.performBusinessInvariantValidation();
  }

  /**
   * 执行业务逻辑
   * @param operation 操作名称
   * @param params 参数
   * @returns 结果
   */
  public executeBusinessLogic(operation: string, params: unknown): unknown {
    // 这里可以根据operation调用不同的业务方法
    // Phase 8 将完善层级管理功能
    return { operation, params, executed: true };
  }
}
