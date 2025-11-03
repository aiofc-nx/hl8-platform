# 租户隔离索引迁移脚本

本目录包含为租户隔离字段创建数据库索引的迁移脚本。

## 📋 文件说明

### PostgreSQL 索引脚本

- **文件**: `add-tenant-isolation-indexes.sql`
- **描述**: PostgreSQL 数据库索引创建脚本
- **内容**:
  - 单列索引（tenant_id）
  - 复合索引（tenant_id, organization_id）
  - 复合索引（tenant_id, organization_id, department_id）
  - 批量创建函数
  - 回滚脚本
  - 索引验证脚本
  - 性能监控查询

### MongoDB 索引脚本

- **文件**: `add-tenant-isolation-indexes.mongodb.js`
- **描述**: MongoDB 数据库索引创建脚本（JavaScript）
- **内容**:
  - 批量索引创建函数
  - 回滚函数
  - 索引验证函数
  - 索引信息查看函数

## 🚀 使用方法

### PostgreSQL 使用示例

#### 方法1: 直接执行 SQL

```bash
# 使用 psql 执行
psql -d your_database -f add-tenant-isolation-indexes.sql

# 或使用数据库客户端工具执行脚本内容
```

#### 方法2: 使用批量创建函数

```sql
-- 为单个表创建索引
SELECT create_tenant_isolation_indexes('products');

-- 为多个表创建索引
SELECT create_tenant_isolation_indexes('products');
SELECT create_tenant_isolation_indexes('orders');
SELECT create_tenant_isolation_indexes('users');
```

#### 方法3: 手动执行特定表的索引创建

```sql
-- 为 products 表创建索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_id
  ON products(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_org
  ON products(tenant_id, organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_org_dept
  ON products(tenant_id, organization_id, department_id);
```

### MongoDB 使用示例

#### 方法1: 使用 MongoDB Shell

```bash
# 执行脚本
mongo your_database_name add-tenant-isolation-indexes.mongodb.js

# 或在 MongoDB Shell 中直接执行函数
mongo
use your_database_name
load('add-tenant-isolation-indexes.mongodb.js')
createTenantIsolationIndexes('products')
```

#### 方法2: 在脚本中修改集合列表

编辑 `add-tenant-isolation-indexes.mongodb.js`，修改 `COLLECTIONS` 数组：

```javascript
const COLLECTIONS = [
  "products", // 产品表
  "orders", // 订单表
  "users", // 用户表
  // 添加其他集合
];
```

然后执行脚本，会自动为所有集合创建索引。

#### 方法3: 在应用程序中使用

```javascript
// 在 Node.js 应用程序中
const { MongoClient } = require("mongodb");

async function createIndexes() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db("your_database");

  // 创建单个集合的索引
  await db.collection("products").createIndex({ tenantId: 1 }, { name: "idx_products_tenantId", background: true });

  await db.collection("products").createIndex({ tenantId: 1, organizationId: 1 }, { name: "idx_products_tenant_org", background: true });

  await db.collection("products").createIndex({ tenantId: 1, organizationId: 1, departmentId: 1 }, { name: "idx_products_tenant_org_dept", background: true });

  await client.close();
}
```

## 📊 索引说明

### 创建的索引类型

1. **单列索引 (tenant_id)**
   - 用途: 优化租户级别的查询
   - 适用场景: `WHERE tenant_id = ?`

2. **复合索引 (tenant_id, organization_id)**
   - 用途: 优化组织级别的查询
   - 适用场景: `WHERE tenant_id = ? AND organization_id = ?`
   - 注意: 可以利用最左前缀原则，支持仅使用 tenant_id 的查询

3. **复合索引 (tenant_id, organization_id, department_id)**
   - 用途: 优化部门级别的查询
   - 适用场景: `WHERE tenant_id = ? AND organization_id = ? AND department_id = ?`
   - 注意: 可以利用最左前缀原则，支持多种组合查询

### 索引命名规范

- PostgreSQL: `idx_<table_name>_<index_type>`
  - 例如: `idx_products_tenant_id`, `idx_products_tenant_org`
- MongoDB: `idx_<collection_name>_<index_type>`
  - 例如: `idx_products_tenantId`, `idx_products_tenant_org`

## ⚠️ 注意事项

### 执行前检查

1. **确认字段存在**: 确保表已添加 `tenant_id`、`organization_id`、`department_id` 字段
2. **确认字段类型**:
   - PostgreSQL: `VARCHAR(36)` 或 `UUID`
   - MongoDB: `String` (UUID 格式)
3. **确认数据完整性**: `tenant_id` 字段不能为 NULL
4. **确认数据库权限**: 需要 CREATE INDEX 权限

### 执行建议

1. **执行时机**: 建议在低峰期执行，避免影响业务
2. **并发创建**:
   - PostgreSQL: 使用 `CONCURRENTLY` 选项（不锁表）
   - MongoDB: 使用 `background: true` 选项（后台创建）
3. **监控**: 创建索引时监控数据库性能
4. **备份**: 执行前建议备份数据库

### 性能影响

- **存储空间**: 每个索引增加约 5-10% 的存储空间
- **写入性能**: 索引会增加 INSERT/UPDATE 的开销（预计 <5%）
- **查询性能**: 索引可以显著提升查询性能（预计查询时间减少 50-80%）

## 🔍 验证索引

### PostgreSQL 验证

```sql
-- 查看索引信息
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'products'
  AND indexname LIKE 'idx_%tenant%'
ORDER BY indexname;

-- 查看索引使用情况
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'products'
  AND indexname LIKE 'idx_%tenant%'
ORDER BY idx_scan DESC;
```

### MongoDB 验证

```javascript
// 查看索引信息
db.products.getIndexes();

// 验证索引是否存在
validateIndexes("products");

// 查看索引使用情况（需要启用查询分析）
db.products.find({ tenantId: "xxx" }).explain("executionStats");
```

## 🔄 回滚操作

### PostgreSQL 回滚

```sql
-- 使用函数回滚
SELECT drop_tenant_isolation_indexes('products');

-- 或手动删除
DROP INDEX IF EXISTS idx_products_tenant_id;
DROP INDEX IF EXISTS idx_products_tenant_org;
DROP INDEX IF EXISTS idx_products_tenant_org_dept;
```

### MongoDB 回滚

```javascript
// 使用函数回滚
dropTenantIsolationIndexes("products");

// 或手动删除
db.products.dropIndex("idx_products_tenantId");
db.products.dropIndex("idx_products_tenant_org");
db.products.dropIndex("idx_products_tenant_org_dept");
```

## 📈 性能基准测试

### PostgreSQL 性能测试

```sql
-- 测试查询性能（创建索引前后对比）
EXPLAIN ANALYZE
SELECT * FROM products
WHERE tenant_id = 'xxx'
  AND organization_id = 'yyy'
  AND department_id = 'zzz';
```

### MongoDB 性能测试

```javascript
// 测试查询性能
db.products
  .find({
    tenantId: "xxx",
    organizationId: "yyy",
    departmentId: "zzz",
  })
  .explain("executionStats");
```

## 🎯 性能目标

根据规格要求，索引创建后的性能目标：

| 指标           | 目标值  | 说明                       |
| -------------- | ------- | -------------------------- |
| 索引覆盖率     | ≥ 90%   | 90% 以上的查询使用索引     |
| 查询延迟增加   | ≤ 10%   | 相比无隔离查询的延迟增加   |
| 系统吞吐量下降 | ≤ 5%    | 相比无隔离系统的吞吐量下降 |
| P95 查询时间   | ≤ 100ms | 95% 的查询在 100ms 内完成  |

## 📝 常见问题

### Q1: 索引创建失败怎么办？

**A**: 检查以下几点：

1. **权限问题**: 确保数据库用户有 CREATE INDEX 权限
2. **字段不存在**: 确认表已添加租户隔离字段
3. **字段类型不匹配**: 确认字段类型为 UUID 或 VARCHAR(36)
4. **索引已存在**: 使用 `IF NOT EXISTS` 或先删除再创建

### Q2: 索引创建需要多长时间？

**A**: 取决于数据量：

- 小表（< 10万条）: 几秒到几分钟
- 中表（10万 - 100万条）: 几分钟到十几分钟
- 大表（> 100万条）: 可能需要几十分钟甚至更长时间

使用 `CONCURRENTLY`（PostgreSQL）或 `background: true`（MongoDB）可以避免阻塞其他操作。

### Q3: 如何为多个表批量创建索引？

**A**:

**PostgreSQL**: 使用脚本中的函数

```sql
SELECT create_tenant_isolation_indexes('products');
SELECT create_tenant_isolation_indexes('orders');
SELECT create_tenant_isolation_indexes('users');
```

**MongoDB**: 修改脚本中的 `COLLECTIONS` 数组，然后执行脚本

### Q4: 索引会占用多少存储空间？

**A**: 每个索引大约占用表数据的 5-10% 的额外存储空间。对于大表，建议：

1. 定期监控索引大小
2. 删除未使用的索引
3. 考虑使用部分索引（仅索引活跃数据）

### Q5: 如何监控索引使用情况？

**A**:

**PostgreSQL**:

```sql
SELECT * FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%tenant%';
```

**MongoDB**:

```javascript
db.products.aggregate([{ $indexStats: {} }]);
```

---

**最后更新**: 2025-01-02  
**维护者**: 开发团队
