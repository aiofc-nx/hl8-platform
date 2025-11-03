# REST Adapter (Versioned by /v{MAJOR})

- 路径前缀：`/v1/`（与 `@hl8/interface-kernel@1.x` 对齐）
- 示例端点：
  - `GET /v1/tenants/:tenantId/entities/:entityId`
  - `POST /v1/tenants/:tenantId/entities`

示例调用（伪代码）：
```ts
import { EntityId, TenantId } from "@hl8/interface-kernel";

async function fetchEntity(apiBase: string, tenantId: TenantId, entityId: EntityId) {
  const res = await fetch(`${apiBase}/v1/tenants/${tenantId}/entities/${entityId}`);
  return await res.json();
}
```
