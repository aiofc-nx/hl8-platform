/**
 * @fileoverview 服务定位器实现
 * @description 提供服务定位和发现功能的具体实现
 */

import {
  IServiceLocator,
  ServiceMetadata,
  ServiceLifecycle,
} from "./service-locator.interface.js";
import { IDomainServiceRegistry } from "./domain-service-registry.interface.js";

/**
 * 服务定位器实现类
 * @description 负责服务的定位和发现，提供灵活的服务查找机制
 */
export class ServiceLocator implements IServiceLocator {
  private readonly serviceCache = new Map<string, unknown>();
  private readonly metadataCache = new Map<string, ServiceMetadata>();
  private readonly interfaceMap = new Map<string, string[]>();
  private readonly tagMap = new Map<string, string[]>();

  constructor(private readonly registry: IDomainServiceRegistry) {}

  /**
   * 定位单个服务
   * @param serviceType 服务类型标识符
   * @returns 服务实例，如果未找到则返回 null
   */
  locate<T>(serviceType: string): T | null {
    // 首先检查缓存
    if (this.serviceCache.has(serviceType)) {
      return this.serviceCache.get(serviceType) as T;
    }

    // 从注册表获取服务
    const service = this.registry.get<T>(serviceType);
    if (service) {
      this.serviceCache.set(serviceType, service);
      this.updateMetadata(serviceType, service);
    }

    return service;
  }

  /**
   * 定位所有匹配的服务
   * @param serviceType 服务类型标识符
   * @returns 服务实例数组
   */
  locateAll<T>(serviceType: string): T[] {
    const services: T[] = [];
    const allServiceTypes = this.registry.getAllServiceTypes();

    for (const type of allServiceTypes) {
      if (type.includes(serviceType) || serviceType.includes(type)) {
        const service = this.locate<T>(type);
        if (service) {
          services.push(service);
        }
      }
    }

    return services;
  }

  /**
   * 检查服务是否可用
   * @param serviceType 服务类型标识符
   * @returns 如果服务可用返回 true，否则返回 false
   */
  isAvailable(serviceType: string): boolean {
    return this.registry.has(serviceType);
  }

  /**
   * 按接口类型定位服务
   * @param interfaceType 接口类型标识符
   * @returns 服务实例，如果未找到则返回 null
   */
  locateByInterface<T>(interfaceType: string): T | null {
    const serviceTypes = this.interfaceMap.get(interfaceType);
    if (!serviceTypes || serviceTypes.length === 0) {
      return null;
    }

    // 返回第一个匹配的服务
    for (const serviceType of serviceTypes) {
      const service = this.locate<T>(serviceType);
      if (service) {
        return service;
      }
    }

    return null;
  }

  /**
   * 按接口类型定位所有服务
   * @param interfaceType 接口类型标识符
   * @returns 服务实例数组
   */
  locateAllByInterface<T>(interfaceType: string): T[] {
    const services: T[] = [];
    const serviceTypes = this.interfaceMap.get(interfaceType) || [];

    for (const serviceType of serviceTypes) {
      const service = this.locate<T>(serviceType);
      if (service) {
        services.push(service);
      }
    }

    return services;
  }

  /**
   * 按标签定位服务
   * @param tag 服务标签
   * @returns 服务实例数组
   */
  locateByTag<T>(tag: string): T[] {
    const services: T[] = [];
    const serviceTypes = this.tagMap.get(tag) || [];

    for (const serviceType of serviceTypes) {
      const service = this.locate<T>(serviceType);
      if (service) {
        services.push(service);
      }
    }

    return services;
  }

  /**
   * 获取服务元数据
   * @param serviceType 服务类型标识符
   * @returns 服务元数据，如果未找到则返回 null
   */
  getServiceMetadata(serviceType: string): ServiceMetadata | null {
    if (this.metadataCache.has(serviceType)) {
      return this.metadataCache.get(serviceType)!;
    }

    // 尝试从注册表获取服务以触发元数据更新
    this.locate(serviceType);
    return this.metadataCache.get(serviceType) || null;
  }

  /**
   * 获取所有可用服务类型
   * @returns 服务类型数组
   */
  getAllAvailableTypes(): string[] {
    return this.registry.getAllServiceTypes();
  }

  /**
   * 刷新服务缓存
   */
  refreshCache(): void {
    this.serviceCache.clear();
    this.metadataCache.clear();
  }

  /**
   * 注册接口映射
   * @param interfaceType 接口类型
   * @param serviceType 服务类型
   */
  registerInterface(interfaceType: string, serviceType: string): void {
    if (!this.interfaceMap.has(interfaceType)) {
      this.interfaceMap.set(interfaceType, []);
    }

    const serviceTypes = this.interfaceMap.get(interfaceType)!;
    if (!serviceTypes.includes(serviceType)) {
      serviceTypes.push(serviceType);
    }
  }

  /**
   * 注册标签映射
   * @param tag 标签名称
   * @param serviceType 服务类型
   */
  registerTag(tag: string, serviceType: string): void {
    if (!this.tagMap.has(tag)) {
      this.tagMap.set(tag, []);
    }

    const serviceTypes = this.tagMap.get(tag)!;
    if (!serviceTypes.includes(serviceType)) {
      serviceTypes.push(serviceType);
    }
  }

  /**
   * 更新服务元数据
   * @param serviceType 服务类型标识符
   * @param service 服务实例
   */
  private updateMetadata(serviceType: string, service: unknown): void {
    const metadata: ServiceMetadata = {
      serviceType,
      service,
      dependencies: this.registry.getServiceDependencies(serviceType),
      lifecycle: ServiceLifecycle.SINGLETON, // 默认生命周期
      tags: [],
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 1,
      metadata: {},
    };

    this.metadataCache.set(serviceType, metadata);
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计信息
   */
  getCacheStats(): ServiceCacheStats {
    return {
      serviceCacheSize: this.serviceCache.size,
      metadataCacheSize: this.metadataCache.size,
      interfaceMapSize: this.interfaceMap.size,
      tagMapSize: this.tagMap.size,
      totalServiceTypes: this.registry.getAllServiceTypes().length,
      cacheHitRate: this.calculateCacheHitRate(),
      lastRefreshed: new Date(),
    };
  }

  /**
   * 计算缓存命中率
   * @returns 缓存命中率（0-1之间的数值）
   */
  private calculateCacheHitRate(): number {
    // 这是一个简化的实现，实际项目中可能需要更复杂的统计
    const totalServices = this.registry.getAllServiceTypes().length;
    const cachedServices = this.serviceCache.size;
    return totalServices > 0 ? cachedServices / totalServices : 0;
  }
}

/**
 * 服务缓存统计信息接口
 * @description 描述服务缓存的统计信息
 */
export interface ServiceCacheStats {
  /** 服务缓存大小 */
  serviceCacheSize: number;
  /** 元数据缓存大小 */
  metadataCacheSize: number;
  /** 接口映射大小 */
  interfaceMapSize: number;
  /** 标签映射大小 */
  tagMapSize: number;
  /** 总服务类型数 */
  totalServiceTypes: number;
  /** 缓存命中率 */
  cacheHitRate: number;
  /** 最后刷新时间 */
  lastRefreshed: Date;
}
