/**
 * @fileoverview Coordination API Contracts
 * @description API contracts for domain service coordination framework
 * @author hl8-platform
 * @version 1.0.0
 */

import { Entity } from "@hl8/domain-kernel";

/**
 * Represents a coordination rule for domain service operations with execution logic
 */
export interface CoordinationRule {
  /**
   * Unique identifier for the operation
   */
  readonly operationName: string;

  /**
   * Executes the coordinated operation
   * @param context - Coordination context
   * @returns Promise resolving to coordination result
   */
  execute(context: CoordinationContext): Promise<CoordinationResult>;

  /**
   * Gets the operation name
   * @returns The operation name
   */
  getOperationName(): string;

  /**
   * Gets the operation dependencies
   * @returns Array of dependency names
   */
  getDependencies(): readonly string[];
}

/**
 * Represents the context for coordinated operations with parameters and entities
 */
export interface CoordinationContext {
  /**
   * Name of the operation being executed
   */
  readonly operation: string;

  /**
   * Operation parameters
   */
  readonly parameters: Record<string, unknown>;

  /**
   * Entities involved in the operation
   */
  readonly entities: readonly Entity[];

  /**
   * When the operation started
   */
  readonly timestamp: Date;

  /**
   * Unique identifier for tracking
   */
  readonly correlationId: string;

  /**
   * Gets a parameter value
   * @param key - Parameter key
   * @returns Parameter value or undefined
   */
  getParameter<T>(key: string): T | undefined;

  /**
   * Gets an entity by type
   * @param entityType - Type of entity to get
   * @returns Entity or undefined
   */
  getEntity<T extends Entity>(entityType: string): T | undefined;

  /**
   * Gets all entities of a specific type
   * @param entityType - Type of entities to get
   * @returns Array of entities
   */
  getEntities<T extends Entity>(entityType: string): readonly T[];
}

/**
 * Represents the result of coordinated operations with success status and data
 */
export interface CoordinationResult {
  /**
   * Whether operation succeeded
   */
  readonly success: boolean;

  /**
   * Operation result data
   */
  readonly data: unknown | null;

  /**
   * Array of error messages
   */
  readonly errors: readonly string[];

  /**
   * Execution time in milliseconds
   */
  readonly executionTime: number;

  /**
   * Gets the operation data
   * @returns Operation data or null
   */
  getData(): unknown | null;

  /**
   * Gets the operation errors
   * @returns Array of error messages
   */
  getErrors(): readonly string[];

  /**
   * Checks if operation was successful
   * @returns True if operation succeeded
   */
  isSuccess(): boolean;

  /**
   * Checks if operation failed
   * @returns True if operation failed
   */
  isFailure(): boolean;
}

/**
 * Coordination manager interface
 */
export interface CoordinationManager {
  /**
   * Registers a coordination rule
   * @param rule - Coordination rule to register
   */
  registerRule(rule: CoordinationRule): void;

  /**
   * Unregisters a coordination rule
   * @param operationName - Name of operation to unregister
   */
  unregisterRule(operationName: string): void;

  /**
   * Executes a coordinated operation
   * @param operationName - Name of operation to execute
   * @param context - Coordination context
   * @returns Promise resolving to coordination result
   */
  executeOperation(
    operationName: string,
    context: CoordinationContext,
  ): Promise<CoordinationResult>;

  /**
   * Gets all registered rules
   * @returns Array of coordination rules
   */
  getRules(): readonly CoordinationRule[];

  /**
   * Gets a specific rule
   * @param operationName - Name of operation
   * @returns Coordination rule or undefined
   */
  getRule(operationName: string): CoordinationRule | undefined;

  /**
   * Validates rule dependencies
   * @param rule - Rule to validate
   * @returns True if all dependencies are satisfied
   */
  validateDependencies(rule: CoordinationRule): boolean;

  /**
   * Clears all rules
   */
  clearRules(): void;
}

/**
 * Factory for creating coordination rules
 */
export interface CoordinationRuleFactory {
  /**
   * Creates a simple coordination rule
   * @param operationName - Name of the operation
   * @param executeFn - Execution function
   * @param dependencies - Array of dependencies
   * @returns Coordination rule
   */
  createRule(
    operationName: string,
    executeFn: (context: CoordinationContext) => Promise<CoordinationResult>,
    dependencies?: string[],
  ): CoordinationRule;

  /**
   * Creates a sequential coordination rule
   * @param operationName - Name of the operation
   * @param steps - Array of step functions
   * @param dependencies - Array of dependencies
   * @returns Sequential coordination rule
   */
  createSequentialRule(
    operationName: string,
    steps: Array<(context: CoordinationContext) => Promise<CoordinationResult>>,
    dependencies?: string[],
  ): CoordinationRule;

  /**
   * Creates a parallel coordination rule
   * @param operationName - Name of the operation
   * @param steps - Array of step functions
   * @param dependencies - Array of dependencies
   * @returns Parallel coordination rule
   */
  createParallelRule(
    operationName: string,
    steps: Array<(context: CoordinationContext) => Promise<CoordinationResult>>,
    dependencies?: string[],
  ): CoordinationRule;
}

/**
 * Coordination context builder
 */
export interface CoordinationContextBuilder {
  /**
   * Creates a coordination context
   * @param operation - Name of the operation
   * @param parameters - Operation parameters
   * @param entities - Entities involved
   * @param correlationId - Correlation ID
   * @returns Coordination context
   */
  create(
    operation: string,
    parameters: Record<string, unknown>,
    entities: Entity[],
    correlationId: string,
  ): CoordinationContext;

  /**
   * Creates a coordination context with timestamp
   * @param operation - Name of the operation
   * @param parameters - Operation parameters
   * @param entities - Entities involved
   * @param correlationId - Correlation ID
   * @param timestamp - Operation timestamp
   * @returns Coordination context
   */
  createWithTimestamp(
    operation: string,
    parameters: Record<string, unknown>,
    entities: Entity[],
    correlationId: string,
    timestamp: Date,
  ): CoordinationContext;
}

/**
 * Coordination result builder
 */
export interface CoordinationResultBuilder {
  /**
   * Creates a successful coordination result
   * @param data - Operation data
   * @param executionTime - Execution time in milliseconds
   * @returns Successful coordination result
   */
  success(data: unknown, executionTime: number): CoordinationResult;

  /**
   * Creates a failed coordination result
   * @param errors - Array of error messages
   * @param executionTime - Execution time in milliseconds
   * @returns Failed coordination result
   */
  failure(errors: string[], executionTime: number): CoordinationResult;

  /**
   * Creates a coordination result from boolean
   * @param success - Whether operation succeeded
   * @param data - Operation data (if successful)
   * @param errors - Array of error messages (if failed)
   * @param executionTime - Execution time in milliseconds
   * @returns Coordination result
   */
  fromBoolean(
    success: boolean,
    data: unknown | null,
    errors: string[],
    executionTime: number,
  ): CoordinationResult;
}

/**
 * Common coordination patterns
 */
export interface CommonCoordinationPatterns {
  /**
   * Creates a retry coordination rule
   * @param operationName - Name of the operation
   * @param rule - Rule to retry
   * @param maxRetries - Maximum number of retries
   * @param retryDelay - Delay between retries in milliseconds
   * @returns Retry coordination rule
   */
  createRetryRule(
    operationName: string,
    rule: CoordinationRule,
    maxRetries: number,
    retryDelay: number,
  ): CoordinationRule;

  /**
   * Creates a timeout coordination rule
   * @param operationName - Name of the operation
   * @param rule - Rule to timeout
   * @param timeoutMs - Timeout in milliseconds
   * @returns Timeout coordination rule
   */
  createTimeoutRule(
    operationName: string,
    rule: CoordinationRule,
    timeoutMs: number,
  ): CoordinationRule;

  /**
   * Creates a circuit breaker coordination rule
   * @param operationName - Name of the operation
   * @param rule - Rule to protect
   * @param failureThreshold - Number of failures before opening circuit
   * @param timeoutMs - Timeout before attempting to close circuit
   * @returns Circuit breaker coordination rule
   */
  createCircuitBreakerRule(
    operationName: string,
    rule: CoordinationRule,
    failureThreshold: number,
    timeoutMs: number,
  ): CoordinationRule;
}
