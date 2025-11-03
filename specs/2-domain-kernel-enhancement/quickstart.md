# Quick Start Guide: Domain Kernel Enhancement with DDD Patterns

**Feature**: Domain Kernel Enhancement  
**Date**: 2024-12-19  
**Status**: Complete

## Overview

This guide provides a quick start for using the enhanced domain kernel with comprehensive DDD patterns including Repository interfaces, Factory patterns, Specification patterns, Domain Event Handlers, and service management.

## Installation

```bash
# Install the enhanced domain kernel
pnpm add @hl8/domain-kernel

# Install peer dependencies
pnpm add class-validator class-transformer uuid
```

## Basic Usage

### 1. Repository Pattern

```typescript
import { IRepository, IQueryRepository, IPaginatedRepository } from "@hl8/domain-kernel";

// Define repository interface
interface IUserRepository extends IQueryRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findByAgeRange(minAge: number, maxAge: number): Promise<User[]>;
}

// Use repository in domain service
class UserDomainService extends DomainService {
  constructor(private readonly userRepository: IUserRepository) {
    super();
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }

  async findActiveUsers(): Promise<User[]> {
    const spec = new ActiveUserSpecification();
    return await this.userRepository.findBySpecification(spec);
  }
}
```

### 2. Factory Pattern

```typescript
import { IAggregateFactory, IEntityFactory, IValueObjectFactory } from "@hl8/domain-kernel";

// Aggregate factory
class UserAggregateFactory implements IAggregateFactory<UserAggregate> {
  create(params: AggregateCreationParams): UserAggregate {
    const { email, name } = params.data;
    return new UserAggregate(email, name);
  }

  createFromEvents(events: DomainEvent[]): UserAggregate {
    // Reconstruct aggregate from events
    const aggregate = new UserAggregate("", "");
    events.forEach((event) => aggregate.applyEvent(event));
    return aggregate;
  }

  validateCreationParams(params: AggregateCreationParams): ValidationResult {
    // Validate creation parameters
    return ValidationResult.success();
  }
}

// Value object factory
class EmailFactory implements IValueObjectFactory<Email> {
  create(value: unknown): Email {
    if (typeof value !== "string") {
      throw new FactoryException("Email must be a string", "EmailFactory", value);
    }
    return new Email(value);
  }

  createWithValidation(value: unknown, rules: ValidationRule[]): Email {
    const email = this.create(value);
    // Apply additional validation rules
    return email;
  }

  validateValue(value: unknown): ValidationResult {
    if (typeof value !== "string") {
      return ValidationResult.failure(["Email must be a string"]);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return ValidationResult.failure(["Invalid email format"]);
    }
    return ValidationResult.success();
  }
}
```

### 3. Specification Pattern

```typescript
import { ISpecification, AndSpecification, OrSpecification } from "@hl8/domain-kernel";

// Business specification
class ActiveUserSpecification implements IBusinessSpecification<User> {
  isSatisfiedBy(candidate: User): boolean {
    return candidate.status === "ACTIVE" && !candidate.isDeleted;
  }

  and(other: ISpecification<User>): ISpecification<User> {
    return new AndSpecification(this, other);
  }

  or(other: ISpecification<User>): ISpecification<User> {
    return new OrSpecification(this, other);
  }

  not(): ISpecification<User> {
    return new NotSpecification(this);
  }

  getDescription(): string {
    return "Active user specification";
  }

  getBusinessRule(): BusinessRule {
    return new BusinessRule("activeUser", "User must be active", this.isSatisfiedBy);
  }

  getSeverity(): BusinessRuleSeverity {
    return BusinessRuleSeverity.ERROR;
  }

  getErrorMessage(): string {
    return "User must be active and not deleted";
  }
}

// Query specification
class UserEmailSpecification implements IQuerySpecification<User> {
  constructor(private readonly email: string) {}

  isSatisfiedBy(candidate: User): boolean {
    return candidate.email === this.email;
  }

  getQueryCriteria(): QueryCriteria {
    return {
      conditions: [
        {
          field: "email",
          operator: QueryOperator.EQUALS,
          value: this.email,
          logicalOperator: LogicalOperator.AND,
        },
      ],
      joins: [],
      groupBy: [],
      having: [],
    };
  }

  getSorting(): SortingCriteria[] {
    return [];
  }

  getPagination(): PaginationCriteria {
    return { page: 1, limit: 10, offset: 0 };
  }
}

// Compose specifications
const activeUsers = new ActiveUserSpecification();
const emailSpec = new UserEmailSpecification("user@example.com");
const activeUserWithEmail = activeUsers.and(emailSpec);
```

### 4. Domain Service Registry

```typescript
import { IDomainServiceRegistry, IServiceLocator } from "@hl8/domain-kernel";

// Service registry
class DomainServiceRegistry implements IDomainServiceRegistry {
  private services = new Map<string, unknown>();
  private dependencies = new Map<string, string[]>();

  register<T>(serviceType: string, service: T, dependencies?: string[]): void {
    this.services.set(serviceType, service);
    if (dependencies) {
      this.dependencies.set(serviceType, dependencies);
    }
  }

  get<T>(serviceType: string): T | null {
    return this.services.get(serviceType) as T | null;
  }

  has(serviceType: string): boolean {
    return this.services.has(serviceType);
  }

  validateDependencies(): ValidationResult {
    // Validate all service dependencies
    return ValidationResult.success();
  }

  getServiceDependencies(serviceType: string): string[] {
    return this.dependencies.get(serviceType) || [];
  }
}

// Service locator
class ServiceLocator implements IServiceLocator {
  constructor(private readonly registry: IDomainServiceRegistry) {}

  locate<T>(serviceType: string): T | null {
    return this.registry.get<T>(serviceType);
  }

  locateAll<T>(serviceType: string): T[] {
    // Return all services of the given type
    return [];
  }

  isAvailable(serviceType: string): boolean {
    return this.registry.has(serviceType);
  }
}
```

### 5. Enhanced Exception Handling

```typescript
import { RepositoryException, FactoryException, SpecificationException, AggregateException } from "@hl8/domain-kernel";

// Repository exception
try {
  await userRepository.findById(userId);
} catch (error) {
  throw new RepositoryException("Failed to find user", "findById", "User", userId, error);
}

// Factory exception
try {
  const user = userFactory.create(invalidParams);
} catch (error) {
  throw new FactoryException("Failed to create user", "UserFactory", invalidParams, error);
}

// Specification exception
try {
  const result = specification.isSatisfiedBy(candidate);
} catch (error) {
  throw new SpecificationException("Failed to evaluate specification", "ActiveUserSpecification", candidate, error);
}
```

### 6. Value Object Validation

```typescript
import { IValueObjectValidator, IValueObjectValidationRule } from "@hl8/domain-kernel";

// Value object validator
class EmailValidator implements IValueObjectValidator<Email> {
  private rules: IValueObjectValidationRule<Email>[] = [];

  validate(value: Email, rules: IValueObjectValidationRule<Email>[]): IValueObjectValidationResult {
    const violations: FieldViolation[] = [];

    for (const rule of rules) {
      const result = rule.validate(value);
      if (!result.isValid) {
        violations.push({
          field: "email",
          value: value.value,
          violation: result.errors[0],
          rule: rule.name,
          severity: ViolationSeverity.ERROR,
          code: "INVALID_EMAIL",
          context: {},
        });
      }
    }

    return {
      isValid: violations.length === 0,
      errors: violations.map((v) => v.violation),
      warnings: [],
      valueObjectType: "Email",
      validationRules: rules.map((r) => r.name),
      fieldViolations: violations,
      statistics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        rulesCount: rules.length,
        executedRulesCount: rules.length,
        violationsCount: violations.length,
        fieldsCount: 1,
        validatedFieldsCount: 1,
      },
    };
  }

  addRule(rule: IValueObjectValidationRule<Email>): void {
    this.rules.push(rule);
  }

  removeRule(ruleName: string): boolean {
    const index = this.rules.findIndex((r) => r.name === ruleName);
    if (index >= 0) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }
}
```

### 7. Domain Model Versioning

```typescript
import { IModelVersion, IVersionCompatibilityChecker } from "@hl8/domain-kernel";

// Model version
const version1: IModelVersion = {
  major: 1,
  minor: 0,
  patch: 0,
  metadata: { description: "Initial version" },
  createdAt: new Date("2024-01-01"),
  breakingChanges: [],
  description: "Initial domain model",
  tags: ["initial", "stable"],
};

const version2: IModelVersion = {
  major: 2,
  minor: 0,
  patch: 0,
  metadata: { description: "Major refactoring" },
  createdAt: new Date("2024-06-01"),
  breakingChanges: ["User.email field renamed to User.emailAddress"],
  description: "Major refactoring with breaking changes",
  tags: ["breaking", "refactor"],
};

// Version compatibility checker
class VersionCompatibilityChecker implements IVersionCompatibilityChecker {
  isCompatible(from: IModelVersion, to: IModelVersion): boolean {
    // Same major version or newer major version
    return to.major >= from.major;
  }

  getCompatibilityIssues(from: IModelVersion, to: IModelVersion): string[] {
    const issues: string[] = [];

    if (to.major > from.major) {
      issues.push(`Major version upgrade from ${from.major} to ${to.major}`);
    }

    if (to.breakingChanges.length > 0) {
      issues.push(...to.breakingChanges);
    }

    return issues;
  }

  canMigrate(from: IModelVersion, to: IModelVersion): boolean {
    return this.isCompatible(from, to) && to.breakingChanges.length === 0;
  }
}
```

## Advanced Usage

### Custom Repository Implementation

```typescript
class UserRepositoryImpl implements IUserRepository {
  async findById(id: EntityId): Promise<User | null> {
    // Implementation details
    return null;
  }

  async save(entity: User): Promise<void> {
    // Implementation details
  }

  async findBySpecification(spec: ISpecification<User>): Promise<User[]> {
    // Implementation details
    return [];
  }

  async findByEmail(email: string): Promise<User | null> {
    // Implementation details
    return null;
  }
}
```

### Custom Factory Implementation

```typescript
class UserAggregateFactoryImpl implements IAggregateFactory<UserAggregate> {
  create(params: AggregateCreationParams): UserAggregate {
    const { email, name } = params.data;
    return new UserAggregate(email, name);
  }

  createFromEvents(events: DomainEvent[]): UserAggregate {
    const aggregate = new UserAggregate("", "");
    events.forEach((event) => aggregate.applyEvent(event));
    return aggregate;
  }

  validateCreationParams(params: AggregateCreationParams): ValidationResult {
    const errors: string[] = [];

    if (!params.data.email) {
      errors.push("Email is required");
    }

    if (!params.data.name) {
      errors.push("Name is required");
    }

    return errors.length === 0 ? ValidationResult.success() : ValidationResult.failure(errors);
  }
}
```

### Custom Specification Implementation

```typescript
class UserAgeSpecification implements IBusinessSpecification<User> {
  constructor(
    private readonly minAge: number,
    private readonly maxAge: number,
  ) {}

  isSatisfiedBy(candidate: User): boolean {
    return candidate.age >= this.minAge && candidate.age <= this.maxAge;
  }

  getDescription(): string {
    return `User age between ${this.minAge} and ${this.maxAge}`;
  }

  getBusinessRule(): BusinessRule {
    return new BusinessRule("userAge", `User age must be between ${this.minAge} and ${this.maxAge}`, this.isSatisfiedBy);
  }

  getSeverity(): BusinessRuleSeverity {
    return BusinessRuleSeverity.ERROR;
  }

  getErrorMessage(): string {
    return `User age must be between ${this.minAge} and ${this.maxAge}`;
  }
}
```

## Testing

```typescript
import { describe, it, expect, beforeEach } from "@jest/globals";

describe("Domain Kernel Enhancement", () => {
  let userRepository: IUserRepository;
  let userFactory: IAggregateFactory<UserAggregate>;
  let serviceRegistry: IDomainServiceRegistry;

  beforeEach(() => {
    userRepository = new UserRepositoryImpl();
    userFactory = new UserAggregateFactoryImpl();
    serviceRegistry = new DomainServiceRegistry();
  });

  it("should create user aggregate using factory", () => {
    const params: AggregateCreationParams = {
      aggregateType: "UserAggregate",
      data: { email: "user@example.com", name: "张三" },
      dependencies: new Map(),
      metadata: {},
    };

    const user = userFactory.create(params);
    expect(user).toBeInstanceOf(UserAggregate);
    expect(user.email).toBe("user@example.com");
  });

  it("should validate user specification", () => {
    const spec = new ActiveUserSpecification();
    const user = new User("user@example.com", 25);
    user.status = "ACTIVE";

    expect(spec.isSatisfiedBy(user)).toBe(true);
  });

  it("should compose specifications", () => {
    const activeSpec = new ActiveUserSpecification();
    const ageSpec = new UserAgeSpecification(18, 65);
    const composedSpec = activeSpec.and(ageSpec);

    const user = new User("user@example.com", 25);
    user.status = "ACTIVE";

    expect(composedSpec.isSatisfiedBy(user)).toBe(true);
  });

  it("should handle repository exceptions", async () => {
    const invalidId = new EntityId();

    await expect(userRepository.findById(invalidId)).rejects.toThrow(RepositoryException);
  });
});
```

## Best Practices

1. **Use Repository Interfaces** for data access abstraction
2. **Implement Factory Patterns** for complex object creation
3. **Create Composable Specifications** for business rules and queries
4. **Register Services** in a service registry for dependency management
5. **Use Specific Exception Types** for better error handling
6. **Validate Value Objects** with specialized validators
7. **Version Your Domain Models** for long-term maintenance
8. **Test All Patterns** with comprehensive unit and integration tests

## Troubleshooting

### Common Issues

1. **Repository Interface Errors**: Ensure all required methods are implemented
2. **Factory Creation Failures**: Check that all required parameters are provided
3. **Specification Evaluation Errors**: Verify that specifications are properly composed
4. **Service Registration Issues**: Ensure all dependencies are registered before use
5. **Exception Handling Problems**: Use specific exception types for better error context

### Debug Tips

1. Enable detailed logging for all patterns
2. Use validation results to understand failures
3. Check service dependencies and registration
4. Verify specification logic and composition
5. Monitor exception context and stack traces

## Next Steps

1. Explore the full API documentation for all patterns
2. Implement custom repositories for your domain
3. Create factory implementations for complex objects
4. Design specification patterns for business rules
5. Set up service registry and dependency management
6. Implement comprehensive exception handling
7. Add value object validation for data integrity
8. Plan domain model versioning strategy
