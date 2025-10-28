/**
 * @fileoverview Operations API Contracts
 * @description API contracts for aggregate root business operations framework
 * @author hl8-platform
 * @version 1.0.0
 */

import { AggregateRoot } from "@hl8/domain-kernel";

/**
 * Represents a business operation with pre/post conditions and execution logic
 */
export interface BusinessOperation {
  /**
   * Unique identifier for the operation
   */
  readonly operationName: string;

  /**
   * Executes the business operation
   * @param params - Operation parameters
   * @param aggregate - Aggregate root
   * @returns Promise resolving to operation result
   */
  execute(params: unknown, aggregate: AggregateRoot): Promise<unknown>;

  /**
   * Validates pre-conditions
   * @param params - Operation parameters
   * @param aggregate - Aggregate root
   * @returns True if pre-conditions are met
   */
  validatePreConditions(params: unknown, aggregate: AggregateRoot): boolean;

  /**
   * Validates post-conditions
   * @param result - Operation result
   * @param aggregate - Aggregate root
   * @returns True if post-conditions are met
   */
  validatePostConditions(result: unknown, aggregate: AggregateRoot): boolean;

  /**
   * Gets the operation name
   * @returns The operation name
   */
  getOperationName(): string;
}

/**
 * Represents an operation handler with execution and validation logic
 */
export interface OperationHandler<TParams = unknown, TResult = unknown> {
  /**
   * Handles the operation execution
   * @param params - Operation parameters
   * @param aggregate - Aggregate root
   * @returns Promise resolving to operation result
   */
  handle(params: TParams, aggregate: AggregateRoot): Promise<TResult>;

  /**
   * Validates pre-conditions
   * @param params - Operation parameters
   * @param aggregate - Aggregate root
   * @returns True if pre-conditions are met
   */
  validatePreConditions(params: TParams, aggregate: AggregateRoot): boolean;

  /**
   * Validates post-conditions
   * @param result - Operation result
   * @param aggregate - Aggregate root
   * @returns True if post-conditions are met
   */
  validatePostConditions(result: TResult, aggregate: AggregateRoot): boolean;
}

/**
 * Operation manager interface
 */
export interface OperationManager {
  /**
   * Registers a business operation
   * @param operation - Business operation to register
   */
  registerOperation(operation: BusinessOperation): void;

  /**
   * Unregisters a business operation
   * @param operationName - Name of operation to unregister
   */
  unregisterOperation(operationName: string): void;

  /**
   * Executes a business operation
   * @param operationName - Name of operation to execute
   * @param params - Operation parameters
   * @param aggregate - Aggregate root
   * @returns Promise resolving to operation result
   */
  executeOperation(
    operationName: string,
    params: unknown,
    aggregate: AggregateRoot,
  ): Promise<unknown>;

  /**
   * Gets all registered operations
   * @returns Array of business operations
   */
  getOperations(): readonly BusinessOperation[];

  /**
   * Gets a specific operation
   * @param operationName - Name of operation
   * @returns Business operation or undefined
   */
  getOperation(operationName: string): BusinessOperation | undefined;

  /**
   * Validates operation dependencies
   * @param operation - Operation to validate
   * @returns True if all dependencies are satisfied
   */
  validateDependencies(operation: BusinessOperation): boolean;

  /**
   * Clears all operations
   */
  clearOperations(): void;
}

/**
 * Factory for creating business operations
 */
export interface BusinessOperationFactory {
  /**
   * Creates a simple business operation
   * @param operationName - Name of the operation
   * @param executeFn - Execution function
   * @param preConditionFn - Pre-condition validation function
   * @param postConditionFn - Post-condition validation function
   * @returns Business operation
   */
  createOperation(
    operationName: string,
    executeFn: (params: unknown, aggregate: AggregateRoot) => Promise<unknown>,
    preConditionFn: (params: unknown, aggregate: AggregateRoot) => boolean,
    postConditionFn: (result: unknown, aggregate: AggregateRoot) => boolean,
  ): BusinessOperation;

  /**
   * Creates a business operation from handler
   * @param operationName - Name of the operation
   * @param handler - Operation handler
   * @returns Business operation
   */
  createOperationFromHandler<TParams, TResult>(
    operationName: string,
    handler: OperationHandler<TParams, TResult>,
  ): BusinessOperation;

  /**
   * Creates a composite business operation
   * @param operationName - Name of the operation
   * @param operations - Array of operations to compose
   * @returns Composite business operation
   */
  createCompositeOperation(
    operationName: string,
    operations: BusinessOperation[],
  ): BusinessOperation;

  /**
   * Creates a conditional business operation
   * @param operationName - Name of the operation
   * @param condition - Condition function
   * @param operation - Operation to execute when condition is true
   * @param fallbackOperation - Operation to execute when condition is false
   * @returns Conditional business operation
   */
  createConditionalOperation(
    operationName: string,
    condition: (params: unknown, aggregate: AggregateRoot) => boolean,
    operation: BusinessOperation,
    fallbackOperation?: BusinessOperation,
  ): BusinessOperation;
}

/**
 * Operation result interface
 */
export interface OperationResult<T = unknown> {
  /**
   * Whether operation succeeded
   */
  readonly success: boolean;

  /**
   * Operation result data
   */
  readonly data: T | null;

  /**
   * Error message if operation failed
   */
  readonly error: string | null;

  /**
   * Execution time in milliseconds
   */
  readonly executionTime: number;

  /**
   * Gets the operation data
   * @returns Operation data or null
   */
  getData(): T | null;

  /**
   * Gets the error message
   * @returns Error message or null
   */
  getError(): string | null;

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
 * Operation result builder
 */
export interface OperationResultBuilder {
  /**
   * Creates a successful operation result
   * @param data - Operation data
   * @param executionTime - Execution time in milliseconds
   * @returns Successful operation result
   */
  success<T>(data: T, executionTime: number): OperationResult<T>;

  /**
   * Creates a failed operation result
   * @param error - Error message
   * @param executionTime - Execution time in milliseconds
   * @returns Failed operation result
   */
  failure<T>(error: string, executionTime: number): OperationResult<T>;

  /**
   * Creates an operation result from boolean
   * @param success - Whether operation succeeded
   * @param data - Operation data (if successful)
   * @param error - Error message (if failed)
   * @param executionTime - Execution time in milliseconds
   * @returns Operation result
   */
  fromBoolean<T>(
    success: boolean,
    data: T | null,
    error: string | null,
    executionTime: number,
  ): OperationResult<T>;
}

/**
 * Common operation patterns
 */
export interface CommonOperationPatterns {
  /**
   * Creates a retry operation
   * @param operationName - Name of the operation
   * @param operation - Operation to retry
   * @param maxRetries - Maximum number of retries
   * @param retryDelay - Delay between retries in milliseconds
   * @returns Retry operation
   */
  createRetryOperation(
    operationName: string,
    operation: BusinessOperation,
    maxRetries: number,
    retryDelay: number,
  ): BusinessOperation;

  /**
   * Creates a timeout operation
   * @param operationName - Name of the operation
   * @param operation - Operation to timeout
   * @param timeoutMs - Timeout in milliseconds
   * @returns Timeout operation
   */
  createTimeoutOperation(
    operationName: string,
    operation: BusinessOperation,
    timeoutMs: number,
  ): BusinessOperation;

  /**
   * Creates a validation operation
   * @param operationName - Name of the operation
   * @param operation - Operation to validate
   * @param validationFn - Validation function
   * @returns Validation operation
   */
  createValidationOperation(
    operationName: string,
    operation: BusinessOperation,
    validationFn: (params: unknown, aggregate: AggregateRoot) => boolean,
  ): BusinessOperation;
}

/**
 * Operation decorator interface
 */
export interface OperationDecorator {
  /**
   * Decorates an operation with additional behavior
   * @param operation - Operation to decorate
   * @returns Decorated operation
   */
  decorate(operation: BusinessOperation): BusinessOperation;
}

/**
 * Operation middleware interface
 */
export interface OperationMiddleware {
  /**
   * Executes middleware before operation
   * @param params - Operation parameters
   * @param aggregate - Aggregate root
   * @returns Promise resolving to modified parameters
   */
  before(params: unknown, aggregate: AggregateRoot): Promise<unknown>;

  /**
   * Executes middleware after operation
   * @param result - Operation result
   * @param aggregate - Aggregate root
   * @returns Promise resolving to modified result
   */
  after(result: unknown, aggregate: AggregateRoot): Promise<unknown>;

  /**
   * Executes middleware on operation error
   * @param error - Operation error
   * @param params - Operation parameters
   * @param aggregate - Aggregate root
   * @returns Promise resolving to error handling result
   */
  onError(
    error: Error,
    params: unknown,
    aggregate: AggregateRoot,
  ): Promise<unknown>;
}
