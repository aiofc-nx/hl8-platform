/**
 * @fileoverview Events API Contracts
 * @description API contracts for domain event processing framework
 * @author hl8-platform
 * @version 1.0.0
 */

import { DomainEvent, AggregateRoot } from "@hl8/domain-kernel";

/**
 * Represents an event handler with event type and processing logic
 */
export interface DomainEventHandler {
  /**
   * Type of event this handler processes
   */
  readonly eventType: string;

  /**
   * Handles the domain event
   * @param event - Domain event to handle
   * @param aggregate - Aggregate root that published the event
   */
  handle(event: DomainEvent, aggregate: AggregateRoot): void;

  /**
   * Gets the event type
   * @returns The event type
   */
  getEventType(): string;

  /**
   * Checks if this handler can handle the event
   * @param event - Domain event to check
   * @returns True if handler can handle the event
   */
  canHandle(event: DomainEvent): boolean;
}

/**
 * Event processor interface
 */
export interface EventProcessor {
  /**
   * Registers an event handler
   * @param handler - Event handler to register
   */
  registerHandler(handler: DomainEventHandler): void;

  /**
   * Unregisters an event handler
   * @param eventType - Type of event to unregister handler for
   */
  unregisterHandler(eventType: string): void;

  /**
   * Processes a domain event
   * @param event - Domain event to process
   * @param aggregate - Aggregate root that published the event
   */
  processEvent(event: DomainEvent, aggregate: AggregateRoot): void;

  /**
   * Processes multiple domain events
   * @param events - Array of domain events to process
   * @param aggregate - Aggregate root that published the events
   */
  processEvents(events: DomainEvent[], aggregate: AggregateRoot): void;

  /**
   * Gets all registered handlers
   * @returns Array of event handlers
   */
  getHandlers(): readonly DomainEventHandler[];

  /**
   * Gets handlers for a specific event type
   * @param eventType - Type of event
   * @returns Array of handlers for the event type
   */
  getHandlersForEvent(eventType: string): readonly DomainEventHandler[];

  /**
   * Clears all handlers
   */
  clearHandlers(): void;
}

/**
 * Event registry interface
 */
export interface EventRegistry {
  /**
   * Registers an event handler
   * @param handler - Event handler to register
   */
  register(handler: DomainEventHandler): void;

  /**
   * Unregisters an event handler
   * @param eventType - Type of event to unregister handler for
   */
  unregister(eventType: string): void;

  /**
   * Gets handlers for a specific event type
   * @param eventType - Type of event
   * @returns Array of handlers for the event type
   */
  getHandlers(eventType: string): readonly DomainEventHandler[];

  /**
   * Gets all registered handlers
   * @returns Array of event handlers
   */
  getAllHandlers(): readonly DomainEventHandler[];

  /**
   * Checks if there are handlers for an event type
   * @param eventType - Type of event
   * @returns True if there are handlers for the event type
   */
  hasHandlers(eventType: string): boolean;

  /**
   * Clears all handlers
   */
  clear(): void;
}

/**
 * Factory for creating event handlers
 */
export interface EventHandlerFactory {
  /**
   * Creates a simple event handler
   * @param eventType - Type of event to handle
   * @param handleFn - Event handling function
   * @returns Event handler
   */
  createHandler(
    eventType: string,
    handleFn: (event: DomainEvent, aggregate: AggregateRoot) => void,
  ): DomainEventHandler;

  /**
   * Creates a conditional event handler
   * @param eventType - Type of event to handle
   * @param condition - Condition function
   * @param handleFn - Event handling function
   * @returns Conditional event handler
   */
  createConditionalHandler(
    eventType: string,
    condition: (event: DomainEvent, aggregate: AggregateRoot) => boolean,
    handleFn: (event: DomainEvent, aggregate: AggregateRoot) => void,
  ): DomainEventHandler;

  /**
   * Creates a composite event handler
   * @param eventType - Type of event to handle
   * @param handlers - Array of handlers to compose
   * @returns Composite event handler
   */
  createCompositeHandler(
    eventType: string,
    handlers: DomainEventHandler[],
  ): DomainEventHandler;

  /**
   * Creates an async event handler
   * @param eventType - Type of event to handle
   * @param handleFn - Async event handling function
   * @returns Async event handler
   */
  createAsyncHandler(
    eventType: string,
    handleFn: (event: DomainEvent, aggregate: AggregateRoot) => Promise<void>,
  ): DomainEventHandler;
}

/**
 * Event processing result interface
 */
export interface EventProcessingResult {
  /**
   * Whether event processing succeeded
   */
  readonly success: boolean;

  /**
   * Number of handlers that processed the event
   */
  readonly handlerCount: number;

  /**
   * Array of errors that occurred during processing
   */
  readonly errors: readonly string[];

  /**
   * Processing time in milliseconds
   */
  readonly processingTime: number;

  /**
   * Gets the processing errors
   * @returns Array of error messages
   */
  getErrors(): readonly string[];

  /**
   * Checks if processing was successful
   * @returns True if processing succeeded
   */
  isSuccess(): boolean;

  /**
   * Checks if processing failed
   * @returns True if processing failed
   */
  isFailure(): boolean;
}

/**
 * Event processing result builder
 */
export interface EventProcessingResultBuilder {
  /**
   * Creates a successful processing result
   * @param handlerCount - Number of handlers that processed the event
   * @param processingTime - Processing time in milliseconds
   * @returns Successful processing result
   */
  success(handlerCount: number, processingTime: number): EventProcessingResult;

  /**
   * Creates a failed processing result
   * @param errors - Array of error messages
   * @param handlerCount - Number of handlers that processed the event
   * @param processingTime - Processing time in milliseconds
   * @returns Failed processing result
   */
  failure(
    errors: string[],
    handlerCount: number,
    processingTime: number,
  ): EventProcessingResult;

  /**
   * Creates a processing result from boolean
   * @param success - Whether processing succeeded
   * @param handlerCount - Number of handlers that processed the event
   * @param errors - Array of error messages (if failed)
   * @param processingTime - Processing time in milliseconds
   * @returns Processing result
   */
  fromBoolean(
    success: boolean,
    handlerCount: number,
    errors: string[],
    processingTime: number,
  ): EventProcessingResult;
}

/**
 * Common event processing patterns
 */
export interface CommonEventProcessingPatterns {
  /**
   * Creates a retry event handler
   * @param eventType - Type of event to handle
   * @param handler - Handler to retry
   * @param maxRetries - Maximum number of retries
   * @param retryDelay - Delay between retries in milliseconds
   * @returns Retry event handler
   */
  createRetryHandler(
    eventType: string,
    handler: DomainEventHandler,
    maxRetries: number,
    retryDelay: number,
  ): DomainEventHandler;

  /**
   * Creates a timeout event handler
   * @param eventType - Type of event to handle
   * @param handler - Handler to timeout
   * @param timeoutMs - Timeout in milliseconds
   * @returns Timeout event handler
   */
  createTimeoutHandler(
    eventType: string,
    handler: DomainEventHandler,
    timeoutMs: number,
  ): DomainEventHandler;

  /**
   * Creates a circuit breaker event handler
   * @param eventType - Type of event to handle
   * @param handler - Handler to protect
   * @param failureThreshold - Number of failures before opening circuit
   * @param timeoutMs - Timeout before attempting to close circuit
   * @returns Circuit breaker event handler
   */
  createCircuitBreakerHandler(
    eventType: string,
    handler: DomainEventHandler,
    failureThreshold: number,
    timeoutMs: number,
  ): DomainEventHandler;
}

/**
 * Event middleware interface
 */
export interface EventMiddleware {
  /**
   * Executes middleware before event processing
   * @param event - Domain event
   * @param aggregate - Aggregate root
   * @returns Promise resolving to modified event
   */
  before(event: DomainEvent, aggregate: AggregateRoot): Promise<DomainEvent>;

  /**
   * Executes middleware after event processing
   * @param event - Domain event
   * @param aggregate - Aggregate root
   * @param result - Processing result
   * @returns Promise resolving to modified result
   */
  after(
    event: DomainEvent,
    aggregate: AggregateRoot,
    result: EventProcessingResult,
  ): Promise<EventProcessingResult>;

  /**
   * Executes middleware on event processing error
   * @param error - Processing error
   * @param event - Domain event
   * @param aggregate - Aggregate root
   * @returns Promise resolving to error handling result
   */
  onError(
    error: Error,
    event: DomainEvent,
    aggregate: AggregateRoot,
  ): Promise<EventProcessingResult>;
}

/**
 * Event subscription interface
 */
export interface EventSubscription {
  /**
   * Event type being subscribed to
   */
  readonly eventType: string;

  /**
   * Handler for the event
   */
  readonly handler: DomainEventHandler;

  /**
   * Whether subscription is active
   */
  readonly active: boolean;

  /**
   * Unsubscribes from the event
   */
  unsubscribe(): void;

  /**
   * Resubscribes to the event
   */
  resubscribe(): void;
}
