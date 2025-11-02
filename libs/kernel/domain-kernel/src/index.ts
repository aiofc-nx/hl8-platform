/**
 * @fileoverview Domain Kernel Core Module - 领域核心模块
 * @description 基于Clean Architecture的领域核心模块，提供值对象、实体、聚合根等核心领域层组件
 * @author hl8-platform
 * @version 1.0.0
 */

// 值对象
export * from "./value-objects/index.js";

// 实体
export * from "./entities/index.js";

// 聚合根
export * from "./aggregates/index.js";

// 领域事件
export * from "./events/index.js";

// 领域服务
export * from "./services/index.js";

// 异常处理（基础异常）
export * from "./exceptions/index.js";

// 审计
export * from "./audit/index.js";

// 上下文
export * from "./context/index.js";

// 标识符
export * from "./identifiers/index.js";

// 验证
export * from "./validation/index.js";

// 业务规则
export * from "./business-rules/index.js";

// 仓储模式
export * from "./repositories/repository.interface.js";
export * from "./repositories/query-repository.interface.js";
export * from "./repositories/command-repository.interface.js";
export * from "./repositories/paginated-repository.interface.js";
export * from "./repositories/tenant-isolated-repository.interface.js";
export type {
  PaginatedResult,
  PaginationMetadata as RepositoryPaginationMetadata,
  PaginatedResultBuilder,
} from "./repositories/paginated-result.interface.js";
export * from "./repositories/query-criteria.interface.js";
export * from "./repositories/query-condition.interface.js";
export * from "./repositories/query-operator.enum.js";

// 工厂模式
export * from "./factories/aggregate-factory.interface.js";
export * from "./factories/entity-factory.interface.js";
export * from "./factories/value-object-factory.interface.js";
export * from "./factories/domain-event-factory.interface.js";
export * from "./factories/aggregate-reconstruction-factory.interface.js";
export type {
  AggregateCreationParams,
  AggregateCreationOptions,
  AggregateCreationMetadata,
  AggregateCreationResult,
  CreationStatistics,
  AggregateCreationValidationResult,
  ValidationStatistics as AggregateValidationStatistics,
  AggregateCreationParamsBuilder,
} from "./factories/aggregate-creation-params.interface.js";
export * from "./factories/entity-creation-params.interface.js";
export * from "./factories/aggregate-snapshot.interface.js";

// 规范模式
export * from "./specifications/specification.interface.js";
export * from "./specifications/and-specification.js";
export * from "./specifications/or-specification.js";
export * from "./specifications/not-specification.js";
export * from "./specifications/query-specification.interface.js";
export * from "./specifications/business-specification.interface.js";
export * from "./specifications/sorting-criteria.interface.js";
export type {
  PaginationCriteria,
  PaginationOptions,
  PaginationMetadata,
  PaginationStrategy,
  PaginationResult,
  PaginationInfo,
  PaginationCursor,
  CursorType,
  PaginationStatistics,
  PaginationResultMetadata,
  IPaginationCriteriaBuilder,
  IPaginationService,
  PaginationValidationResult,
  PaginationContext,
  PerformanceRequirement as PaginationPerformanceRequirement,
  UserPaginationPreferences,
} from "./specifications/pagination-criteria.interface.js";

// 业务规则验证框架
export {
  BusinessRuleSeverity as BusinessRuleSeverityLevel,
  BusinessRuleSeverityUtils,
  BusinessRuleSeverityInfoMap,
} from "./business-rules/business-rule-severity.enum.js";
export type { BusinessRuleSeverityInfo } from "./business-rules/business-rule-severity.enum.js";
export { BusinessRuleManager as BusinessRuleManagerImpl } from "./business-rules/business-rule-manager.js";
export * from "./business-rules/business-rule-composition.js";
export {
  BusinessRuleValidationContextBuilder,
  BusinessRuleValidationContextManager,
  ValidationMode,
  ValidationPriority,
} from "./business-rules/business-rule-validation-context.js";
export type {
  ValidationOptions as BusinessRuleValidationOptions,
  ValidationResult,
  ValidationStatistics,
  IBusinessRuleValidationContext,
} from "./business-rules/business-rule-validation-context.js";
export * from "./business-rules/business-rule-execution-engine.js";

// 增强异常处理
export {
  RepositoryException,
  RepositoryOperationFailedException,
  EntityNotFoundException,
  EntityAlreadyExistsException,
  RepositoryConnectionException,
  RepositoryTransactionException,
  RepositoryQueryException,
  RepositoryConfigurationException,
} from "./exceptions/repository-exceptions.js";
export {
  FactoryException,
  FactoryCreationFailedException,
  FactoryInvalidParametersException,
  FactoryMissingDependencyException,
  FactoryConfigurationException,
  FactoryUnsupportedTypeException,
  FactoryInitializationException,
} from "./exceptions/factory-exceptions.js";
export {
  SpecificationException,
  SpecificationEvaluationFailedException,
  SpecificationCompositionException,
  SpecificationValidationException,
  SpecificationConfigurationException,
  SpecificationUnsupportedTypeException,
  SpecificationExecutionException,
} from "./exceptions/specification-exceptions.js";
export {
  AggregateException,
  AggregateOperationFailedException,
  AggregateInvalidStateException,
  AggregateBusinessRuleViolationException,
  AggregateEventHandlingException,
  AggregateReconstructionException,
  AggregateVersionConflictException,
  AggregateConcurrencyException,
} from "./exceptions/aggregate-exceptions.js";
export {
  ServiceRegistryException,
  ServiceRegistrationFailedException,
  ServiceNotFoundException,
  ServiceAlreadyExistsException,
  ServiceMissingDependencyException,
  ServiceCircularDependencyException,
  ServiceConfigurationException,
  ServiceLifecycleException,
  ServiceValidationException,
} from "./exceptions/service-registry-exceptions.js";
export {
  ValueObjectValidationException,
  ValueObjectValidationFailedException,
  ValueObjectRuleViolationException,
  ValueObjectTypeMismatchException,
  ValueObjectInvalidFormatException,
  ValueObjectRangeException,
  ValueObjectLengthException,
  ValueObjectRequiredFieldMissingException,
} from "./exceptions/value-object-validation-exceptions.js";
export {
  ModelVersionException,
  ModelVersionIncompatibleException,
  ModelVersionMigrationFailedException,
  ModelVersionNotFoundException,
  ModelVersionInvalidFormatException,
  ModelVersionRollbackFailedException,
  ModelVersionValidationFailedException,
  ModelVersionConflictException,
} from "./exceptions/model-version-exceptions.js";
export * from "./exceptions/exception-context.interface.js";

// 值对象验证增强
export * from "./validation/value-object-validator.interface.js";
export * from "./validation/value-object-validator.js";
export * from "./validation/rules/value-object-validation-rules.js";

// 领域服务管理
export * from "./services/domain-service-registry.interface.js";
export * from "./services/domain-service-registry.js";
export type {
  IServiceLocator,
  ServiceMetadata,
} from "./services/service-locator.interface.js";
export { ServiceLifecycle as ServiceLocatorLifecycle } from "./services/service-locator.interface.js";
export * from "./services/service-locator.js";
export type {
  IDependencyContainer,
  DependencyMetadata,
  DependencyGraph,
  DependencyNode as DependencyContainerNode,
  DependencyEdge as DependencyContainerEdge,
} from "./services/dependency-container.interface.js";
export {
  DependencyLifecycle,
  DependencyEdgeType,
} from "./services/dependency-container.interface.js";
export * from "./services/service-registration.interface.js";
export { ServiceLifecycle } from "./services/service-lifecycle.enum.js";
export type {
  IServiceLifecycleManager,
  ServiceInstanceStats,
} from "./services/service-lifecycle.enum.js";
export { DependencyValidator } from "./services/dependency-validation.js";
export type {
  DependencyGraphInfo,
  DependencyNode as DependencyValidationNode,
  DependencyEdge as DependencyValidationEdge,
} from "./services/dependency-validation.js";

// 领域服务协调
export * from "./coordination/coordination-rule.interface.js";
export * from "./coordination/coordination-context.interface.js";
export * from "./coordination/coordination-result.interface.js";
export * from "./coordination/coordination-manager.js";

// 聚合根业务操作
export * from "./operations/business-operation.interface.js";
export * from "./operations/operation-handler.interface.js";
export * from "./operations/operation-manager.js";
