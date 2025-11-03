/**
 * @fileoverview Business Rules API Contracts
 * @description API contracts for business rule validation framework
 * @author hl8-platform
 * @version 1.0.0
 */

import { Entity } from "@hl8/domain-kernel";

/**
 * Represents a business rule with name, description, validation logic, and severity level
 */
export interface BusinessRule {
  /**
   * Unique identifier for the rule
   */
  readonly ruleName: string;

  /**
   * Human-readable description
   */
  readonly description: string;

  /**
   * Rule severity level
   */
  readonly severity: "ERROR" | "WARNING";

  /**
   * Validates the provided entity
   * @param entity - The entity to validate
   * @returns Business rule validation result
   */
  validate(entity: Entity): BusinessRuleValidationResult;

  /**
   * Gets the rule name
   * @returns The rule name
   */
  getRuleName(): string;

  /**
   * Gets the rule description
   * @returns The rule description
   */
  getDescription(): string;

  /**
   * Gets the rule severity
   * @returns The rule severity
   */
  getSeverity(): "ERROR" | "WARNING";
}

/**
 * Represents business rule validation with violations and context
 */
export interface BusinessRuleValidationResult {
  /**
   * Whether all rules passed
   */
  readonly isValid: boolean;

  /**
   * Array of rule violations
   */
  readonly violations: readonly BusinessRuleViolation[];

  /**
   * Type of entity being validated
   */
  readonly entityType: string;

  /**
   * ID of entity being validated
   */
  readonly entityId: string;

  /**
   * Gets the rule violations
   * @returns Array of rule violations
   */
  getViolations(): readonly BusinessRuleViolation[];

  /**
   * Checks if there are any violations
   * @returns True if there are violations
   */
  hasViolations(): boolean;

  /**
   * Gets violations by severity
   * @param severity - Severity level to filter by
   * @returns Array of violations with specified severity
   */
  getViolationsBySeverity(
    severity: "ERROR" | "WARNING",
  ): readonly BusinessRuleViolation[];
}

/**
 * Represents a specific business rule violation with context
 */
export interface BusinessRuleViolation {
  /**
   * Name of violated rule
   */
  readonly ruleName: string;

  /**
   * Human-readable violation message
   */
  readonly message: string;

  /**
   * Violation severity
   */
  readonly severity: "ERROR" | "WARNING";

  /**
   * Additional context information
   */
  readonly context: Record<string, unknown>;
}

/**
 * Business rule manager interface
 */
export interface BusinessRuleManager {
  /**
   * Adds a business rule
   * @param rule - Business rule to add
   */
  addRule(rule: BusinessRule): void;

  /**
   * Removes a business rule
   * @param ruleName - Name of rule to remove
   */
  removeRule(ruleName: string): void;

  /**
   * Validates an entity with all rules
   * @param entity - Entity to validate
   * @returns Business rule validation result
   */
  validateEntity(entity: Entity): BusinessRuleValidationResult;

  /**
   * Validates an entity with specific rules
   * @param entity - Entity to validate
   * @param ruleNames - Names of rules to apply
   * @returns Business rule validation result
   */
  validateEntityWithRules(
    entity: Entity,
    ruleNames: string[],
  ): BusinessRuleValidationResult;

  /**
   * Gets all business rules
   * @returns Array of business rules
   */
  getRules(): readonly BusinessRule[];

  /**
   * Gets business rules by severity
   * @param severity - Severity level to filter by
   * @returns Array of rules with specified severity
   */
  getRulesBySeverity(severity: "ERROR" | "WARNING"): readonly BusinessRule[];

  /**
   * Clears all business rules
   */
  clearRules(): void;
}

/**
 * Factory for creating business rules
 */
export interface BusinessRuleFactory {
  /**
   * Creates a simple business rule
   * @param ruleName - Name of the rule
   * @param description - Rule description
   * @param severity - Rule severity
   * @param validateFn - Validation function
   * @returns Business rule
   */
  createRule(
    ruleName: string,
    description: string,
    severity: "ERROR" | "WARNING",
    validateFn: (entity: Entity) => BusinessRuleValidationResult,
  ): BusinessRule;

  /**
   * Creates a conditional business rule
   * @param ruleName - Name of the rule
   * @param description - Rule description
   * @param severity - Rule severity
   * @param condition - Condition function
   * @param rule - Rule to apply when condition is true
   * @returns Conditional business rule
   */
  createConditionalRule(
    ruleName: string,
    description: string,
    severity: "ERROR" | "WARNING",
    condition: (entity: Entity) => boolean,
    rule: BusinessRule,
  ): BusinessRule;

  /**
   * Creates a composite business rule
   * @param ruleName - Name of the composite rule
   * @param description - Rule description
   * @param rules - Array of rules to compose
   * @returns Composite business rule
   */
  createCompositeRule(
    ruleName: string,
    description: string,
    rules: BusinessRule[],
  ): BusinessRule;
}

/**
 * Business rule validation result builder
 */
export interface BusinessRuleValidationResultBuilder {
  /**
   * Creates a successful validation result
   * @param entityType - Type of entity
   * @param entityId - ID of entity
   * @returns Successful validation result
   */
  success(entityType: string, entityId: string): BusinessRuleValidationResult;

  /**
   * Creates a failed validation result
   * @param entityType - Type of entity
   * @param entityId - ID of entity
   * @param violations - Array of violations
   * @returns Failed validation result
   */
  failure(
    entityType: string,
    entityId: string,
    violations: BusinessRuleViolation[],
  ): BusinessRuleValidationResult;

  /**
   * Creates a validation result from violations
   * @param entityType - Type of entity
   * @param entityId - ID of entity
   * @param violations - Array of violations
   * @returns Validation result
   */
  fromViolations(
    entityType: string,
    entityId: string,
    violations: BusinessRuleViolation[],
  ): BusinessRuleValidationResult;
}

/**
 * Business rule violation builder
 */
export interface BusinessRuleViolationBuilder {
  /**
   * Creates a business rule violation
   * @param ruleName - Name of violated rule
   * @param message - Violation message
   * @param severity - Violation severity
   * @param context - Additional context
   * @returns Business rule violation
   */
  create(
    ruleName: string,
    message: string,
    severity: "ERROR" | "WARNING",
    context?: Record<string, unknown>,
  ): BusinessRuleViolation;

  /**
   * Creates a simple business rule violation
   * @param ruleName - Name of violated rule
   * @param message - Violation message
   * @param severity - Violation severity
   * @returns Business rule violation
   */
  createSimple(
    ruleName: string,
    message: string,
    severity: "ERROR" | "WARNING",
  ): BusinessRuleViolation;
}

/**
 * Common business rule implementations
 */
export interface CommonBusinessRules {
  /**
   * Creates a required field rule
   * @param fieldName - Name of the field
   * @param getValue - Function to get field value
   * @returns Required field business rule
   */
  requiredField(
    fieldName: string,
    getValue: (entity: Entity) => unknown,
  ): BusinessRule;

  /**
   * Creates a range validation rule
   * @param fieldName - Name of the field
   * @param getValue - Function to get field value
   * @param min - Minimum value
   * @param max - Maximum value
   * @returns Range validation business rule
   */
  range(
    fieldName: string,
    getValue: (entity: Entity) => number,
    min: number,
    max: number,
  ): BusinessRule;

  /**
   * Creates a custom validation rule
   * @param ruleName - Name of the rule
   * @param description - Rule description
   * @param severity - Rule severity
   * @param validateFn - Validation function
   * @returns Custom business rule
   */
  custom(
    ruleName: string,
    description: string,
    severity: "ERROR" | "WARNING",
    validateFn: (entity: Entity) => BusinessRuleValidationResult,
  ): BusinessRule;
}
