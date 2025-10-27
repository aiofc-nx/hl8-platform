# Data Model: Config Integration

**Feature**: Config Integration  
**Date**: 2024-12-19  
**Purpose**: Define configuration data structures and relationships

## Core Entities

### AppConfig

**Purpose**: Main application configuration schema  
**Type**: TypeScript Class with validation decorators

**Fields**:

- `app`: AppConfigSection - Application-specific settings
- `database`: DatabaseConfig - Database connection settings
- `server`: ServerConfig - Server and port settings
- `logging`: LoggingConfig - Logging configuration

**Validation Rules**:

- All fields required
- Nested validation for each section

### AppConfigSection

**Purpose**: Application-specific configuration  
**Type**: TypeScript Class

**Fields**:

- `name`: string - Application name
- `version`: string - Application version
- `environment`: string - Environment (development, staging, production)
- `debug`: boolean - Debug mode flag

**Validation Rules**:

- `name`: Required, non-empty string
- `version`: Required, semantic version format
- `environment`: Required, enum values
- `debug`: Optional, boolean

### DatabaseConfig

**Purpose**: Database connection configuration  
**Type**: TypeScript Class

**Fields**:

- `host`: string - Database host
- `port`: number - Database port
- `username`: string - Database username
- `password`: string - Database password
- `database`: string - Database name
- `ssl`: boolean - SSL connection flag

**Validation Rules**:

- `host`: Required, valid hostname format
- `port`: Required, number between 1-65535
- `username`: Required, non-empty string
- `password`: Required, non-empty string
- `database`: Required, non-empty string
- `ssl`: Optional, boolean

### ServerConfig

**Purpose**: Server configuration  
**Type**: TypeScript Class

**Fields**:

- `port`: number - Server port
- `host`: string - Server host
- `cors`: CorsConfig - CORS settings

**Validation Rules**:

- `port`: Required, number between 1-65535
- `host`: Required, valid hostname format
- `cors`: Required, nested validation

### CorsConfig

**Purpose**: CORS configuration  
**Type**: TypeScript Class

**Fields**:

- `enabled`: boolean - CORS enabled flag
- `origins`: string[] - Allowed origins
- `methods`: string[] - Allowed HTTP methods
- `credentials`: boolean - Allow credentials

**Validation Rules**:

- `enabled`: Required, boolean
- `origins`: Required, array of valid URLs
- `methods`: Required, array of valid HTTP methods
- `credentials`: Optional, boolean

### LoggingConfig

**Purpose**: Logging configuration  
**Type**: TypeScript Class

**Fields**:

- `level`: string - Log level
- `format`: string - Log format
- `output`: string[] - Output destinations

**Validation Rules**:

- `level`: Required, enum values (error, warn, info, debug)
- `format`: Required, enum values (json, text)
- `output`: Required, array of valid destinations

## Configuration Sources

### File Sources

- `config/app.yml` - Main YAML configuration
- `config/app.json` - JSON configuration (alternative)
- `.env` - Environment variables

### Environment Variable Mapping

- `APP__NAME` → `app.name`
- `APP__VERSION` → `app.version`
- `APP__ENVIRONMENT` → `app.environment`
- `APP__DEBUG` → `app.debug`
- `DATABASE__HOST` → `database.host`
- `DATABASE__PORT` → `database.port`
- `DATABASE__USERNAME` → `database.username`
- `DATABASE__PASSWORD` → `database.password`
- `DATABASE__DATABASE` → `database.database`
- `DATABASE__SSL` → `database.ssl`
- `SERVER__PORT` → `server.port`
- `SERVER__HOST` → `server.host`

## State Transitions

### Configuration Loading States

1. **Initialization**: Configuration module starts loading
2. **File Loading**: Configuration files are read and parsed
3. **Environment Variable Processing**: Environment variables are applied
4. **Validation**: Configuration is validated against schema
5. **Caching**: Valid configuration is cached
6. **Ready**: Configuration is available for injection

### Error States

1. **File Not Found**: Configuration file missing
2. **Parse Error**: Invalid configuration format
3. **Validation Error**: Configuration fails validation
4. **Type Error**: Configuration type mismatch

## Relationships

### Entity Relationships

- `AppConfig` contains `AppConfigSection`
- `AppConfig` contains `DatabaseConfig`
- `AppConfig` contains `ServerConfig`
- `AppConfig` contains `LoggingConfig`
- `ServerConfig` contains `CorsConfig`

### Configuration Hierarchy

```
AppConfig (root)
├── AppConfigSection
├── DatabaseConfig
├── ServerConfig
│   └── CorsConfig
└── LoggingConfig
```

## Validation Rules Summary

### Required Fields

- All top-level configuration sections
- Database connection details
- Server port and host
- Logging level and format

### Format Validation

- Semantic versioning for app version
- Valid hostname format for hosts
- Port numbers in valid range (1-65535)
- Enum values for environment and log level

### Business Rules

- Debug mode only allowed in development environment
- SSL required for production database connections
- CORS origins must be valid URLs
- Log level must be appropriate for environment
