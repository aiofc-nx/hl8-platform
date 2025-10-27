/**
 * Domain Kernel Core Module - TypeScript Interfaces
 *
 * This file defines the public API contracts for the domain-kernel library.
 * All interfaces are designed to be implemented by domain layer components.
 */

// ============================================================================
// Core Value Object Interface
// ============================================================================

/**
 * 值对象基类接口
 * 提供不可变值对象的基础功能
 */
export interface IValueObject<T = any> {
  /**
   * 获取值对象的值
   */
  getValue(): T;

  /**
   * 比较两个值对象是否相等
   * @param other 另一个值对象
   * @returns 是否相等
   */
  equals(other: IValueObject<T>): boolean;

  /**
   * 转换为字符串表示
   * @returns 字符串表示
   */
  toString(): string;

  /**
   * 转换为JSON对象
   * @returns JSON对象
   */
  toJSON(): object;

  /**
   * 克隆值对象
   * @returns 克隆的值对象
   */
  clone(): IValueObject<T>;
}

// ============================================================================
// Entity Interfaces
// ============================================================================

/**
 * 实体标识符接口
 */
export interface IEntityId {
  /**
   * 获取标识符值
   */
  getValue(): string;

  /**
   * 比较两个标识符是否相等
   * @param other 另一个标识符
   * @returns 是否相等
   */
  equals(other: IEntityId): boolean;

  /**
   * 验证标识符格式是否有效
   * @returns 是否有效
   */
  isValid(): boolean;

  /**
   * 转换为字符串
   * @returns 字符串表示
   */
  toString(): string;
}

/**
 * 审计信息接口
 */
export interface IAuditInfo {
  /**
   * 获取创建时间
   */
  getCreatedAt(): Date;

  /**
   * 获取更新时间
   */
  getUpdatedAt(): Date;

  /**
   * 获取创建者标识符
   */
  getCreatedBy(): IEntityId;

  /**
   * 获取更新者标识符
   */
  getUpdatedBy(): IEntityId;

  /**
   * 获取版本号
   */
  getVersion(): number;

  /**
   * 更新审计信息
   * @param updatedBy 更新者标识符
   */
  update(updatedBy: IEntityId): void;

  /**
   * 获取数据校验和
   * @returns 校验和
   */
  getChecksum(): string;

  /**
   * 验证数据完整性
   * @returns 是否完整
   */
  validateIntegrity(): boolean;
}

/**
 * 实体生命周期枚举
 */
export enum EntityLifecycle {
  CREATED = "CREATED",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DELETED = "DELETED",
}

/**
 * 实体基类接口
 */
export interface IEntity {
  /**
   * 获取实体标识符
   */
  getId(): IEntityId;

  /**
   * 获取审计信息
   */
  getAuditInfo(): IAuditInfo;

  /**
   * 获取生命周期状态
   */
  getLifecycleState(): EntityLifecycle;

  /**
   * 激活实体
   */
  activate(): void;

  /**
   * 停用实体
   */
  deactivate(): void;

  /**
   * 删除实体
   */
  delete(): void;

  /**
   * 比较两个实体是否相等
   * @param other 另一个实体
   * @returns 是否相等
   */
  equals(other: IEntity): boolean;

  /**
   * 转换为JSON对象
   * @returns JSON对象
   */
  toJSON(): object;
}

// ============================================================================
// Internal Entity Interface
// ============================================================================

/**
 * 内部实体接口
 * 聚合根内部的实体，执行具体业务操作
 */
export interface IInternalEntity extends IEntity {
  /**
   * 获取所属聚合根标识符
   */
  getAggregateRootId(): IEntityId;

  /**
   * 执行业务逻辑
   * @param params 业务参数
   * @returns 业务结果
   */
  executeBusinessLogic(params: any): any;

  /**
   * 验证业务规则
   * @returns 是否通过验证
   */
  validateBusinessRules(): boolean;

  /**
   * 更新状态
   * @param newState 新状态
   */
  updateState(newState: any): void;

  /**
   * 通知聚合根
   * @param event 领域事件
   */
  notifyAggregateRoot(event: IDomainEvent): void;
}

// ============================================================================
// Aggregate Root Interface
// ============================================================================

/**
 * 聚合根基类接口
 */
export interface IAggregateRoot extends IEntity {
  /**
   * 添加内部实体
   * @param entity 内部实体
   */
  addInternalEntity(entity: IInternalEntity): void;

  /**
   * 移除内部实体
   * @param entityId 实体标识符
   */
  removeInternalEntity(entityId: IEntityId): void;

  /**
   * 获取内部实体
   * @param entityId 实体标识符
   * @returns 内部实体
   */
  getInternalEntity(entityId: IEntityId): IInternalEntity | undefined;

  /**
   * 协调业务操作
   * @param operation 操作名称
   * @param params 操作参数
   * @returns 操作结果
   */
  coordinateBusinessOperation(operation: string, params: any): any;

  /**
   * 添加领域事件
   * @param event 领域事件
   */
  addDomainEvent(event: IDomainEvent): void;

  /**
   * 获取待发布事件
   * @returns 领域事件数组
   */
  getDomainEvents(): IDomainEvent[];

  /**
   * 清空待发布事件
   */
  clearDomainEvents(): void;

  /**
   * 验证业务不变量
   * @returns 是否通过验证
   */
  validateBusinessInvariants(): boolean;
}

// ============================================================================
// Domain Event Interface
// ============================================================================

/**
 * 领域事件接口
 */
export interface IDomainEvent {
  /**
   * 获取事件标识符
   */
  getEventId(): IEntityId;

  /**
   * 获取聚合根标识符
   */
  getAggregateId(): IEntityId;

  /**
   * 获取事件类型
   */
  getEventType(): string;

  /**
   * 获取事件数据
   */
  getEventData(): any;

  /**
   * 获取时间戳
   */
  getTimestamp(): Date;

  /**
   * 获取事件版本
   */
  getVersion(): number;

  /**
   * 转换为JSON对象
   * @returns JSON对象
   */
  toJSON(): object;
}

// ============================================================================
// Domain Service Interface
// ============================================================================

/**
 * 领域服务接口
 */
export interface IDomainService {
  /**
   * 执行业务逻辑
   * @param params 业务参数
   * @returns 业务结果
   */
  execute(params: any): any;

  /**
   * 验证业务规则
   * @param params 验证参数
   * @returns 是否通过验证
   */
  validate(params: any): boolean;
}

// ============================================================================
// Exception Interfaces
// ============================================================================

/**
 * 异常类型枚举
 */
export enum ExceptionType {
  BUSINESS = "BUSINESS",
  SYSTEM = "SYSTEM",
}

/**
 * 领域异常接口
 */
export interface IDomainException extends Error {
  /**
   * 获取异常类型
   */
  getType(): ExceptionType;

  /**
   * 获取错误码
   */
  getCode(): string;

  /**
   * 获取上下文信息
   */
  getContext(): any;

  /**
   * 获取时间戳
   */
  getTimestamp(): Date;
}

// ============================================================================
// Audit Interfaces
// ============================================================================

/**
 * 审计变更接口
 */
export interface IAuditChange {
  /**
   * 获取变更字段
   */
  getField(): string;

  /**
   * 获取旧值
   */
  getOldValue(): any;

  /**
   * 获取新值
   */
  getNewValue(): any;

  /**
   * 获取变更时间
   */
  getChangedAt(): Date;

  /**
   * 获取变更者
   */
  getChangedBy(): IEntityId;
}

/**
 * 审计轨迹接口
 */
export interface IAuditTrail {
  /**
   * 获取实体标识符
   */
  getEntityId(): IEntityId;

  /**
   * 添加变更记录
   * @param change 变更记录
   */
  addChange(change: IAuditChange): void;

  /**
   * 获取变更记录
   * @returns 变更记录数组
   */
  getChanges(): IAuditChange[];

  /**
   * 按用户查询变更
   * @param userId 用户标识符
   * @returns 变更记录数组
   */
  getChangesByUser(userId: IEntityId): IAuditChange[];

  /**
   * 按时间范围查询变更
   * @param start 开始时间
   * @param end 结束时间
   * @returns 变更记录数组
   */
  getChangesByDateRange(start: Date, end: Date): IAuditChange[];
}

// ============================================================================
// Utility Interfaces
// ============================================================================

/**
 * UUID生成器接口
 */
export interface IUuidGenerator {
  /**
   * 生成UUID v4
   * @returns UUID字符串
   */
  generate(): string;

  /**
   * 批量生成UUID
   * @param count 生成数量
   * @returns UUID字符串数组
   */
  generateBatch(count: number): string[];

  /**
   * 验证UUID格式
   * @param uuid UUID字符串
   * @returns 是否有效
   */
  validate(uuid: string): boolean;

  /**
   * 检测UUID冲突
   * @param uuid UUID字符串
   * @returns 是否冲突
   */
  detectConflict(uuid: string): boolean;
}

/**
 * 分离模式验证器接口
 */
export interface ISeparationValidator {
  /**
   * 验证聚合根是否直接执行业务逻辑
   * @param aggregateRoot 聚合根
   * @returns 是否通过验证
   */
  validateAggregateRoot(aggregateRoot: IAggregateRoot): boolean;

  /**
   * 验证内部实体访问控制
   * @param entity 内部实体
   * @param aggregateRoot 聚合根
   * @returns 是否通过验证
   */
  validateInternalEntityAccess(
    entity: IInternalEntity,
    aggregateRoot: IAggregateRoot,
  ): boolean;
}

/**
 * 事件存储接口
 */
export interface IEventStore {
  /**
   * 存储领域事件
   * @param event 领域事件
   */
  store(event: IDomainEvent): Promise<void>;

  /**
   * 批量存储领域事件
   * @param events 领域事件数组
   */
  storeBatch(events: IDomainEvent[]): Promise<void>;

  /**
   * 获取聚合根的所有事件
   * @param aggregateId 聚合根标识符
   * @returns 领域事件数组
   */
  getEvents(aggregateId: IEntityId): Promise<IDomainEvent[]>;

  /**
   * 获取指定版本之后的事件
   * @param aggregateId 聚合根标识符
   * @param fromVersion 起始版本
   * @returns 领域事件数组
   */
  getEventsFromVersion(
    aggregateId: IEntityId,
    fromVersion: number,
  ): Promise<IDomainEvent[]>;
}
