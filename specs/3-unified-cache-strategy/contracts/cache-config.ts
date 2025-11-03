/**
 * @fileoverview 缓存配置类定义
 * @description 使用 @hl8/config 的 TypedConfigModule 进行类型安全的配置管理
 */

import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, Min } from 'class-validator';

/**
 * 缓存配置类
 * @description 定义缓存系统的全局配置，使用 class-validator 进行验证
 * 
 * **必须使用 @hl8/config 的 TypedConfigModule 进行管理**
 * 
 * @example
 * ```typescript
 * import { TypedConfigModule, fileLoader } from '@hl8/config';
 * import { CacheConfig } from '@hl8/cache';
 * 
 * TypedConfigModule.forRoot({
 *   schema: CacheConfig,
 *   load: [fileLoader({ path: './config/cache.yml' })],
 * })
 * ```
 */
export class CacheConfig {
  /**
   * 默认过期时间（毫秒）
   * @description 0 表示不过期，需要显式指定
   */
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  defaultTtl!: number;

  /**
   * 最大缓存项数量
   * @description 达到上限时按照淘汰策略淘汰缓存项
   */
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxSize!: number;

  /**
   * 是否启用统计
   * @description 启用后可以查询缓存统计信息（命中率等）
   */
  @IsBoolean()
  enableStats!: boolean;

  /**
   * 是否启用事件驱动失效
   * @description 启用后监听领域事件自动失效缓存
   */
  @IsBoolean()
  enableEventInvalidation!: boolean;

  /**
   * 清理间隔（毫秒）
   * @description 定期清理过期缓存项的间隔时间
   */
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  cleanupInterval!: number;

  /**
   * 是否启用压缩（未来功能）
   * @description 压缩缓存值以减少内存占用
   */
  @IsBoolean()
  enableCompression?: boolean;

  /**
   * 淘汰策略
   * @description 达到最大缓存大小时使用的淘汰策略
   * - LRU: 最近最少使用（Least Recently Used）
   * - FIFO: 先进先出（First In First Out）
   * - LFU: 最不经常使用（Least Frequently Used）
   */
  @IsIn(['LRU', 'FIFO', 'LFU'])
  evictionStrategy: 'LRU' | 'FIFO' | 'LFU' = 'LRU';
}

