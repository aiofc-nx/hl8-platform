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

## Versioning Alignment
- External APIs expose `/v{MAJOR}/...` paths.
- Keep MAJOR aligned with `@hl8/interface-kernel`.

