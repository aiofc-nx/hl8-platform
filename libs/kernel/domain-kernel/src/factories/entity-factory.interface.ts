/**
 * @fileoverview Entity Factory Interface - 实体工厂接口
 * @description 实体创建工厂的通用接口定义
 */

import { Entity } from "../entities/base/entity.base.js";
import { EntityId } from "../identifiers/entity-id.js";
import { EntityCreationParams } from "./entity-creation-params.interface.js";
import { ValidationResult } from "../validation/index.js";

/**
 * 实体工厂接口
 * @description 提供实体创建和重构的工厂方法
 * @template T 实体类型
 */
export interface IEntityFactory<T extends Entity> {
  /**
   * 创建新实体
   * @description 根据创建参数创建新的实体实例
   * @param params 实体创建参数
   * @returns 新创建的实体实例
   * @throws {FactoryException} 当创建失败时抛出
   */
  create(params: EntityCreationParams): T;

  /**
   * 重构实体
   * @description 从持久化数据重构实体实例
   * @param id 实体标识符
   * @param data 持久化数据
   * @param version 版本号
   * @returns 重构的实体实例
   * @throws {FactoryException} 当重构失败时抛出
   */
  reconstitute(id: EntityId, data: unknown, version: number): T;

  /**
   * 克隆实体
   * @description 创建实体的深拷贝
   * @param entity 要克隆的实体
   * @returns 克隆的实体实例
   * @throws {FactoryException} 当克隆失败时抛出
   */
  clone(entity: T): T;

  /**
   * 验证创建参数
   * @description 验证实体创建参数的有效性
   * @param params 实体创建参数
   * @returns 验证结果
   */
  validateCreationParams(params: EntityCreationParams): ValidationResult;

  /**
   * 获取实体类型名称
   * @description 获取工厂处理的实体类型名称
   * @returns 实体类型名称
   */
  getEntityTypeName(): string;

  /**
   * 检查是否支持实体类型
   * @description 检查工厂是否支持指定的实体类型
   * @param entityType 实体类型
   * @returns 是否支持
   */
  supportsEntityType(entityType: string): boolean;
}

/**
 * 实体工厂构建器接口
 * @description 用于构建实体工厂的构建器
 * @template T 实体类型
 */
export interface IEntityFactoryBuilder<T extends Entity> {
  /**
   * 设置实体类型
   * @param entityType 实体类型
   * @returns 构建器实例
   */
  setEntityType(entityType: string): IEntityFactoryBuilder<T>;

  /**
   * 设置创建函数
   * @param createFn 创建函数
   * @returns 构建器实例
   */
  setCreateFunction(
    createFn: (params: EntityCreationParams) => T,
  ): IEntityFactoryBuilder<T>;

  /**
   * 设置重构函数
   * @param reconstituteFn 重构函数
   * @returns 构建器实例
   */
  setReconstituteFunction(
    reconstituteFn: (id: EntityId, data: unknown, version: number) => T,
  ): IEntityFactoryBuilder<T>;

  /**
   * 设置克隆函数
   * @param cloneFn 克隆函数
   * @returns 构建器实例
   */
  setCloneFunction(cloneFn: (entity: T) => T): IEntityFactoryBuilder<T>;

  /**
   * 设置验证函数
   * @param validateFn 验证函数
   * @returns 构建器实例
   */
  setValidationFunction(
    validateFn: (params: EntityCreationParams) => ValidationResult,
  ): IEntityFactoryBuilder<T>;

  /**
   * 构建实体工厂
   * @returns 实体工厂实例
   */
  build(): IEntityFactory<T>;
}

/**
 * 实体工厂注册表接口
 * @description 管理多个实体工厂的注册表
 */
export interface IEntityFactoryRegistry {
  /**
   * 注册实体工厂
   * @param entityType 实体类型
   * @param factory 实体工厂
   */
  registerFactory<T extends Entity>(
    entityType: string,
    factory: IEntityFactory<T>,
  ): void;

  /**
   * 获取实体工厂
   * @param entityType 实体类型
   * @returns 实体工厂或undefined
   */
  getFactory<T extends Entity>(
    entityType: string,
  ): IEntityFactory<T> | undefined;

  /**
   * 检查是否已注册
   * @param entityType 实体类型
   * @returns 是否已注册
   */
  isRegistered(entityType: string): boolean;

  /**
   * 注销实体工厂
   * @param entityType 实体类型
   */
  unregisterFactory(entityType: string): void;

  /**
   * 获取所有已注册的实体类型
   * @returns 实体类型列表
   */
  getRegisteredEntityTypes(): string[];

  /**
   * 清空所有注册
   */
  clear(): void;
}
