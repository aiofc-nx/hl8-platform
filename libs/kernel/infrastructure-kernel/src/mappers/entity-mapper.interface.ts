/**
 * @fileoverview 实体映射器接口
 * @description 定义领域实体和持久化实体之间的转换接口
 */

/**
 * 实体映射器接口
 * @description 提供领域实体和持久化实体之间的双向转换能力
 * @template TDomain 领域实体类型
 * @template TPersistence 持久化实体类型
 */
export interface IEntityMapper<TDomain, TPersistence> {
  /**
   * 将持久化实体转换为领域实体
   * @description 使用自动映射和手动配置将持久化实体转换为领域实体，保持业务逻辑完整性
   * @param persistence 持久化实体
   * @returns 领域实体
   * @throws {Error} 当映射失败或验证失败时抛出
   */
  toDomain(persistence: TPersistence): TDomain;

  /**
   * 将领域实体转换为持久化实体
   * @description 使用自动映射和手动配置将领域实体转换为持久化实体，保持数据完整性
   * @param domain 领域实体
   * @returns 持久化实体
   * @throws {Error} 当映射失败或验证失败时抛出
   */
  toPersistence(domain: TDomain): TPersistence;

  /**
   * 批量将持久化实体转换为领域实体
   * @description 批量转换持久化实体列表为领域实体列表
   * @param persistenceList 持久化实体列表
   * @returns 领域实体列表
   */
  toDomainList(persistenceList: TPersistence[]): TDomain[];

  /**
   * 批量将领域实体转换为持久化实体
   * @description 批量转换领域实体列表为持久化实体列表
   * @param domainList 领域实体列表
   * @returns 持久化实体列表
   */
  toPersistenceList(domainList: TDomain[]): TPersistence[];
}
