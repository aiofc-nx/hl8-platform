# GraphQL Adapter (Schema Version Note)

- Schema 版本：与 `@hl8/interface-kernel` 的 MAJOR 对齐（例如 v1）
- 建议在 SDL 顶部注释标注 `# schema: v1`

示例查询（伪 SDL/Query）：
```graphql
# schema: v1
query GetEntity($tenantId: ID!, $entityId: ID!) {
  entity(tenantId: $tenantId, entityId: $entityId) {
    id
    name
  }
}
```
