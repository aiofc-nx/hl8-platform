# Quickstart: Config Integration

**Feature**: Config Integration  
**Date**: 2024-12-19  
**Purpose**: Quick start guide for integrating @hl8/config into Fastify API

## Prerequisites

- Node.js >= 20
- TypeScript 5.9.3
- @hl8/config module built and available
- Fastify API application with NestJS

## Installation

### 1. Add Dependencies

```bash
cd apps/fastify-api
pnpm add @hl8/config
```

### 2. Create Configuration Schema

Create `src/config/app.config.ts`:

```typescript
import { IsString, IsNumber, IsBoolean, IsArray, ValidateNested, IsEnum } from "class-validator";
import { Type } from "class-transformer";

export class AppConfigSection {
  @IsString()
  name!: string;

  @IsString()
  version!: string;

  @IsEnum(["development", "staging", "production"])
  environment!: string;

  @IsBoolean()
  debug?: boolean;
}

export class DatabaseConfig {
  @IsString()
  host!: string;

  @IsNumber()
  @Type(() => Number)
  port!: number;

  @IsString()
  username!: string;

  @IsString()
  password!: string;

  @IsString()
  database!: string;

  @IsBoolean()
  ssl?: boolean;
}

export class CorsConfig {
  @IsBoolean()
  enabled!: boolean;

  @IsArray()
  @IsString({ each: true })
  origins!: string[];

  @IsArray()
  @IsString({ each: true })
  methods!: string[];

  @IsBoolean()
  credentials?: boolean;
}

export class ServerConfig {
  @IsNumber()
  @Type(() => Number)
  port!: number;

  @IsString()
  host!: string;

  @ValidateNested()
  @Type(() => CorsConfig)
  cors!: CorsConfig;
}

export class LoggingConfig {
  @IsEnum(["error", "warn", "info", "debug"])
  level!: string;

  @IsEnum(["json", "text"])
  format!: string;

  @IsArray()
  @IsString({ each: true })
  output!: string[];
}

export class AppConfig {
  @ValidateNested()
  @Type(() => AppConfigSection)
  app!: AppConfigSection;

  @ValidateNested()
  @Type(() => DatabaseConfig)
  database!: DatabaseConfig;

  @ValidateNested()
  @Type(() => ServerConfig)
  server!: ServerConfig;

  @ValidateNested()
  @Type(() => LoggingConfig)
  logging!: LoggingConfig;
}
```

### 3. Create Configuration Files

Create `config/app.yml`:

```yaml
app:
  name: "fastify-api"
  version: "1.0.0"
  environment: "development"
  debug: true

database:
  host: "localhost"
  port: 5432
  username: "postgres"
  password: "password"
  database: "fastify_api"
  ssl: false

server:
  port: 3000
  host: "0.0.0.0"
  cors:
    enabled: true
    origins:
      - "http://localhost:3000"
      - "http://localhost:3001"
    methods:
      - "GET"
      - "POST"
      - "PUT"
      - "DELETE"
    credentials: true

logging:
  level: "info"
  format: "json"
  output:
    - "console"
```

Create `config/.env.example`:

```env
# Application Configuration
APP__NAME=fastify-api
APP__VERSION=1.0.0
APP__ENVIRONMENT=development
APP__DEBUG=true

# Database Configuration
DATABASE__HOST=localhost
DATABASE__PORT=5432
DATABASE__USERNAME=postgres
DATABASE__PASSWORD=password
DATABASE__DATABASE=fastify_api
DATABASE__SSL=false

# Server Configuration
SERVER__PORT=3000
SERVER__HOST=0.0.0.0

# CORS Configuration
SERVER__CORS__ENABLED=true
SERVER__CORS__ORIGINS=http://localhost:3000,http://localhost:3001
SERVER__CORS__METHODS=GET,POST,PUT,DELETE
SERVER__CORS__CREDENTIALS=true

# Logging Configuration
LOGGING__LEVEL=info
LOGGING__FORMAT=json
LOGGING__OUTPUT=console
```

### 4. Update App Module

Update `src/app.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { TypedConfigModule, fileLoader, dotenvLoader } from "@hl8/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UsersModule } from "./users/users.module";
import { AppConfig } from "./config/app.config";

@Module({
  imports: [
    TypedConfigModule.forRoot({
      schema: AppConfig,
      load: [fileLoader({ path: "./config/app.yml" }), dotenvLoader({ separator: "__" })],
    }),
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### 5. Use Configuration in Services

Update `src/app.service.ts`:

```typescript
import { Injectable, Inject } from "@nestjs/common";
import { AppConfig } from "./config/app.config";

@Injectable()
export class AppService {
  constructor(@Inject(AppConfig) private readonly config: AppConfig) {}

  getHello(): string {
    return `Hello from ${this.config.app.name} v${this.config.app.version}!`;
  }

  getDatabaseInfo(): string {
    return `Database: ${this.config.database.host}:${this.config.database.port}/${this.config.database.database}`;
  }
}
```

### 6. Add Configuration Health Check

Create `src/config/config-health.controller.ts`:

```typescript
import { Controller, Get } from "@nestjs/common";
import { AppConfig } from "./app.config";

@Controller("health")
export class ConfigHealthController {
  constructor(private readonly config: AppConfig) {}

  @Get("config")
  getConfigHealth() {
    return {
      status: "healthy",
      message: "Configuration loaded successfully",
      configLoaded: true,
      validationPassed: true,
      lastValidated: new Date().toISOString(),
      app: {
        name: this.config.app.name,
        version: this.config.app.version,
        environment: this.config.app.environment,
      },
    };
  }
}
```

## Testing

### 1. Unit Tests

Create `src/config/app.config.spec.ts`:

```typescript
import { validate } from "class-validator";
import { AppConfig } from "./app.config";

describe("AppConfig", () => {
  it("should validate valid configuration", async () => {
    const config = new AppConfig();
    config.app = {
      name: "test-app",
      version: "1.0.0",
      environment: "development",
      debug: true,
    };
    config.database = {
      host: "localhost",
      port: 5432,
      username: "test",
      password: "test",
      database: "test",
    };
    config.server = {
      port: 3000,
      host: "localhost",
      cors: {
        enabled: true,
        origins: ["http://localhost:3000"],
        methods: ["GET", "POST"],
      },
    };
    config.logging = {
      level: "info",
      format: "json",
      output: ["console"],
    };

    const errors = await validate(config);
    expect(errors).toHaveLength(0);
  });

  it("should fail validation for invalid configuration", async () => {
    const config = new AppConfig();
    config.app = {
      name: "", // Invalid: empty string
      version: "invalid", // Invalid: not semantic version
      environment: "invalid", // Invalid: not in enum
    };

    const errors = await validate(config);
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

### 2. Integration Tests

Create `test/integration/config.integration.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../../src/app.module";
import { AppConfig } from "../../src/config/app.config";

describe("Config Integration", () => {
  let app: TestingModule;
  let config: AppConfig;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    config = app.get<AppConfig>(AppConfig);
  });

  afterAll(async () => {
    await app.close();
  });

  it("should load configuration successfully", () => {
    expect(config).toBeDefined();
    expect(config.app.name).toBe("fastify-api");
    expect(config.database.host).toBe("localhost");
    expect(config.server.port).toBe(3000);
  });

  it("should have valid configuration structure", () => {
    expect(config.app).toBeDefined();
    expect(config.database).toBeDefined();
    expect(config.server).toBeDefined();
    expect(config.logging).toBeDefined();
  });
});
```

## Environment Variables

The configuration supports environment variable overrides using the `__` separator:

- `APP__NAME` → `app.name`
- `DATABASE__HOST` → `database.host`
- `SERVER__CORS__ENABLED` → `server.cors.enabled`

## Configuration Validation

Configuration is validated at application startup:

1. **File Loading**: Configuration files are loaded and parsed
2. **Environment Variables**: Environment variables are applied
3. **Validation**: Configuration is validated against the schema
4. **Error Handling**: Validation errors prevent application startup

## Troubleshooting

### Common Issues

1. **Configuration not loading**: Check file paths and permissions
2. **Validation errors**: Verify configuration values match schema
3. **Type errors**: Ensure TypeScript types match configuration structure
4. **Environment variables not working**: Check separator format (`__`)

### Debug Mode

Enable debug mode in configuration to see detailed loading information:

```yaml
app:
  debug: true
```

## Next Steps

1. **Add more configuration sections** as needed
2. **Implement configuration caching** for performance
3. **Add configuration documentation** for all options
4. **Set up configuration monitoring** and alerts
5. **Create configuration templates** for different environments
