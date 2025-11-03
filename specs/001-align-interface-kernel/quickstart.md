# Quickstart: Using @hl8/interface-kernel Contracts

## Install
```bash
pnpm add @hl8/interface-kernel
```

## Consume Identifiers and TenantContext
```ts
import { EntityId, TenantId, TenantContext } from "@hl8/interface-kernel";

const id = new EntityId("550e8400-e29b-41d4-a716-446655440000");
const ctx: TenantContext = { tenantId: new TenantId("t-1") };
```

## Use Repository Contracts in Application Layer
```ts
import type { ITenantIsolatedRepository } from "@hl8/interface-kernel";

class ListDocsHandler {
  constructor(private readonly repo: ITenantIsolatedRepository<Document>) {}
  async handle(ctx: TenantContext) {
    return this.repo.findAllByContext(ctx);
  }
}
```

## Subpath Exports (Tree-shaking Friendly)

可以按需导入特定模块以减少打包体积：

```ts
// 仅导入错误类型
import { DomainException, BusinessException } from "@hl8/interface-kernel/errors";

// 仅导入标识符
import { EntityId, TenantId } from "@hl8/interface-kernel/identifiers";

// 仅导入模型
import type { Pagination, Sorting } from "@hl8/interface-kernel/models";
```

## REST Adapter Example

使用 `/v{MAJOR}/...` 路径版本化，与 `@hl8/interface-kernel` 的 MAJOR 版本对齐：

```ts
import type { EntityId, TenantId } from "@hl8/interface-kernel";
import type { Pagination } from "@hl8/interface-kernel/models";

// GET /v1/tenants/:tenantId/entities/:entityId
async function fetchEntity(apiBase: string, tenantId: TenantId, entityId: EntityId) {
  const res = await fetch(`${apiBase}/v1/tenants/${tenantId}/entities/${entityId}`);
  return await res.json();
}

// GET /v1/tenants/:tenantId/entities?page=1&limit=10
async function listEntities(
  apiBase: string,
  tenantId: TenantId,
  pagination?: Pagination,
) {
  const params = new URLSearchParams();
  if (pagination) {
    params.set("page", String(pagination.page));
    params.set("limit", String(pagination.limit));
  }
  const res = await fetch(`${apiBase}/v1/tenants/${tenantId}/entities?${params}`);
  return await res.json();
}
```

完整示例参见 `examples/interface-consumer/rest/rest-adapter.example.ts`

## GraphQL Adapter Example

Schema 版本标注与 `@hl8/interface-kernel` 的 MAJOR 版本对齐：

```graphql
# schema: v1
query GetEntity($tenantId: ID!, $entityId: ID!) {
  entity(tenantId: $tenantId, entityId: $entityId) {
    id
    tenantId
    name
  }
}
```

完整示例参见 `examples/interface-consumer/graphql/`

## Versioning Alignment
- External APIs expose `/v{MAJOR}/...` paths (REST) or `# schema: v{MAJOR}` (GraphQL).
- Keep MAJOR aligned with `@hl8/interface-kernel` package version.
- When `@hl8/interface-kernel` bumps to `2.0.0`, update API paths to `/v2/...`.

## Example Consumers

详细示例代码位于 `examples/interface-consumer/`：
- `rest/` - RESTful API 适配示例
- `graphql/` - GraphQL 适配示例  
- `scripts/e2e-switch.sh` - 端到端测试脚本，验证不同实现的一致性

