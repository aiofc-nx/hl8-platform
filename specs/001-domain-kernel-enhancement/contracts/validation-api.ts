/**
 * @fileoverview Validation API Contracts
 * @description API contracts for value object validation framework
 * @author hl8-platform
 * @version 1.0.0
 */

/**
 * Represents a validation rule with name, validation logic, and error reporting
 */
export interface ValidationRule<T = unknown> {
  /**
   * Unique identifier for the rule
   */
  readonly ruleName: string;

  /**
   * Validates the provided value
   * @param value - The value to validate
   * @returns Validation result with success status and errors
   */
  validate(value: T): ValidationResult;

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
}

/**
 * Represents the result of validation with success status and error details
 */
export interface ValidationResult {
  /**
   * Whether validation passed
   */
  readonly isValid: boolean;

  /**
   * Array of validation errors
   */
  readonly errors: readonly ValidationError[];

  /**
   * Gets the validation errors
   * @returns Array of validation errors
   */
  getErrors(): readonly ValidationError[];

  /**
   * Checks if there are any errors
   * @returns True if there are errors
   */
  hasErrors(): boolean;
}

/**
 * Represents a specific validation error with field and context information
 */
export interface ValidationError {
  /**
   * Field that failed validation
   */
  readonly field: string;

  /**
   * Human-readable error message
   */
  readonly message: string;

  /**
   * Error code for programmatic handling
   */
  readonly code: string;

  /**
   * Value that failed validation
   */
  readonly value: unknown;

  /**
   * Additional context information
   */
  readonly context: Record<string, unknown>;
}

/**
 * Factory for creating validation rules
 */
export interface ValidationRuleFactory {
  /**
   * Creates a simple validation rule
   * @param ruleName - Name of the rule
   * @param validateFn - Validation function
   * @param description - Rule description
   * @returns Validation rule
   */
  createRule<T>(
    ruleName: string,
    validateFn: (value: T) => ValidationResult,
    description: string,
  ): ValidationRule<T>;

  /**
   * Creates a composite validation rule
   * @param ruleName - Name of the composite rule
   * @param rules - Array of rules to compose
   * @param description - Rule description
   * @returns Composite validation rule
   */
  createCompositeRule<T>(
    ruleName: string,
    rules: ValidationRule<T>[],
    description: string,
  ): ValidationRule<T>;

  /**
   * Creates a conditional validation rule
   * @param ruleName - Name of the rule
   * @param condition - Condition function
   * @param rule - Rule to apply when condition is true
   * @param description - Rule description
   * @returns Conditional validation rule
   */
  createConditionalRule<T>(
    ruleName: string,
    condition: (value: T) => boolean,
    rule: ValidationRule<T>,
    description: string,
  ): ValidationRule<T>;
}

/**
 * Value object validator interface
 */
export interface ValueObjectValidator<T = unknown> {
  /**
   * Adds a validation rule
   * @param rule - Validation rule to add
   */
  addValidationRule(rule: ValidationRule<T>): void;

  /**
   * Removes a validation rule
   * @param ruleName - Name of rule to remove
   */
  removeValidationRule(ruleName: string): void;

  /**
   * Validates the value with all rules
   * @param value - Value to validate
   * @returns Validation result
   */
  validate(value: T): ValidationResult;

  /**
   * Gets all validation rules
   * @returns Array of validation rules
   */
  getValidationRules(): readonly ValidationRule<T>[];

  /**
   * Clears all validation rules
   */
  clearValidationRules(): void;
}

/**
 * Validation result builder
 */
export interface ValidationResultBuilder {
  /**
   * Creates a successful validation result
   * @returns Successful validation result
   */
  success(): ValidationResult;

  /**
   * Creates a failed validation result
   * @param errors - Array of validation errors
   * @returns Failed validation result
   */
  failure(errors: ValidationError[]): ValidationResult;

  /**
   * Creates a validation result from boolean
   * @param isValid - Whether validation passed
   * @param errors - Array of validation errors (if any)
   * @returns Validation result
   */
  fromBoolean(isValid: boolean, errors?: ValidationError[]): ValidationResult;
}

/**
 * Validation error builder
 */
export interface ValidationErrorBuilder {
  /**
   * Creates a validation error
   * @param field - Field that failed validation
   * @param message - Error message
   * @param code - Error code
   * @param value - Value that failed validation
   * @param context - Additional context
   * @returns Validation error
   */
  create(
    field: string,
    message: string,
    code: string,
    value: unknown,
    context?: Record<string, unknown>,
  ): ValidationError;

  /**
   * Creates a validation error with default context
   * @param field - Field that failed validation
   * @param message - Error message
   * @param code - Error code
   * @param value - Value that failed validation
   * @returns Validation error
   */
  createSimple(
    field: string,
    message: string,
    code: string,
    value: unknown,
  ): ValidationError;
}

/**
 * Common validation rule implementations
 */
export interface CommonValidationRules {
  /**
   * Creates a required field rule
   * @param fieldName - Name of the field
   * @returns Required field validation rule
   */
  required(fieldName: string): ValidationRule<unknown>;

  /**
   * Creates a minimum length rule
   * @param fieldName - Name of the field
   * @param minLength - Minimum length
   * @returns Minimum length validation rule
   */
  minLength(fieldName: string, minLength: number): ValidationRule<string>;

  /**
   * Creates a maximum length rule
   * @param fieldName - Name of the field
   * @param maxLength - Maximum length
   * @returns Maximum length validation rule
   */
  maxLength(fieldName: string, maxLength: number): ValidationRule<string>;

  /**
   * Creates a pattern matching rule
   * @param fieldName - Name of the field
   * @param pattern - Regular expression pattern
   * @param message - Error message
   * @returns Pattern validation rule
   */
  pattern(
    fieldName: string,
    pattern: RegExp,
    message: string,
  ): ValidationRule<string>;

  /**
   * Creates a range validation rule
   * @param fieldName - Name of the field
   * @param min - Minimum value
   * @param max - Maximum value
   * @returns Range validation rule
   */
  range(fieldName: string, min: number, max: number): ValidationRule<number>;
}
