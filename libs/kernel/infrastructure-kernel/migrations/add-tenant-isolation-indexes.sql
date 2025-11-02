-- ============================================================================
-- 租户隔离索引迁移脚本
-- ============================================================================
-- 文件: add-tenant-isolation-indexes.sql
-- 描述: 为租户隔离字段创建数据库索引，支持 PostgreSQL 和 MongoDB
-- 版本: 1.0.0
-- 创建日期: 2025-01-02
-- 
-- 用途:
-- 1. 为所有租户隔离表创建必要的索引，提升查询性能
-- 2. 支持租户、组织、部门三级数据隔离查询优化
-- 3. 性能目标：索引覆盖率 ≥ 90%
--
-- 使用说明:
-- 1. 在执行前，请确保已添加租户隔离字段（tenant_id, organization_id, department_id）
-- 2. PostgreSQL: 直接执行 SQL 脚本
-- 3. MongoDB: 使用 MongoDB Shell 执行相应的 JavaScript 命令
-- 4. 建议在低峰期执行，使用 CONCURRENTLY 选项（PostgreSQL）避免锁表
-- ============================================================================

-- ============================================================================
-- PostgreSQL 索引创建脚本
-- ============================================================================

-- 说明: 以下脚本需要根据实际表名进行替换
-- 将 <table_name> 替换为实际的表名（如 products, orders, users 等）
--
-- 执行前检查:
-- 1. 确认表已添加 tenant_id, organization_id, department_id 字段
-- 2. 确认字段类型为 UUID 或 VARCHAR(36)
-- 3. 确认 tenant_id 字段已有数据（不能为 NULL）
--
-- 性能提示:
-- - 使用 CONCURRENTLY 选项可以在不锁表的情况下创建索引（推荐用于生产环境）
-- - 如果表数据量很大，索引创建可能需要较长时间
-- - 建议在低峰期执行，并监控数据库性能

-- ----------------------------------------------------------------------------
-- 1. 单列索引：tenant_id
-- ----------------------------------------------------------------------------
-- 用途: 优化租户级别的查询（如：查询某个租户的所有数据）
-- 适用场景:
--   - WHERE tenant_id = ?
--   - WHERE tenant_id IN (?, ?, ...)

-- 示例（请根据实际表名替换 <table_name>）:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_<table_name>_tenant_id 
--   ON <table_name>(tenant_id);

-- 如果索引已存在，使用以下命令删除后重新创建:
-- DROP INDEX IF EXISTS idx_<table_name>_tenant_id;
-- CREATE INDEX CONCURRENTLY idx_<table_name>_tenant_id 
--   ON <table_name>(tenant_id);

-- ----------------------------------------------------------------------------
-- 2. 复合索引：tenant_id + organization_id
-- ----------------------------------------------------------------------------
-- 用途: 优化组织级别的查询（如：查询某个组织的数据）
-- 适用场景:
--   - WHERE tenant_id = ? AND organization_id = ?
--   - WHERE tenant_id = ? AND organization_id IN (?, ?, ...)
--   - WHERE tenant_id = ? (可以利用索引前缀)

-- 示例（请根据实际表名替换 <table_name>）:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_<table_name>_tenant_org 
--   ON <table_name>(tenant_id, organization_id);

-- 说明:
-- - 复合索引遵循最左前缀原则，可以支持 tenant_id 的单独查询
-- - organization_id 必须与 tenant_id 一起使用才能利用索引

-- ----------------------------------------------------------------------------
-- 3. 复合索引：tenant_id + organization_id + department_id
-- ----------------------------------------------------------------------------
-- 用途: 优化部门级别的查询（如：查询某个部门的数据）
-- 适用场景:
--   - WHERE tenant_id = ? AND organization_id = ? AND department_id = ?
--   - WHERE tenant_id = ? AND organization_id = ? (可以利用索引前缀)
--   - WHERE tenant_id = ? (可以利用索引前缀)

-- 示例（请根据实际表名替换 <table_name>）:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_<table_name>_tenant_org_dept 
--   ON <table_name>(tenant_id, organization_id, department_id);

-- 说明:
-- - 复合索引遵循最左前缀原则
-- - 可以支持 tenant_id, (tenant_id, organization_id), (tenant_id, organization_id, department_id) 三种查询

-- ----------------------------------------------------------------------------
-- 完整示例：为 products 表创建索引
-- ----------------------------------------------------------------------------

-- 为 products 表创建租户隔离索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_id 
  ON products(tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_org 
  ON products(tenant_id, organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_org_dept 
  ON products(tenant_id, organization_id, department_id);

-- 部分索引示例（仅索引未删除的数据）:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_id_active 
--   ON products(tenant_id) 
--   WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 索引创建脚本模板（通用函数）
-- ----------------------------------------------------------------------------

-- 可以通过存储过程或脚本批量为多个表创建索引
-- 示例存储过程（PostgreSQL）:

CREATE OR REPLACE FUNCTION create_tenant_isolation_indexes(table_name TEXT)
RETURNS VOID AS $$
BEGIN
  -- 创建单列索引
  EXECUTE format('
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_%s_tenant_id 
    ON %I(tenant_id)',
    table_name, table_name
  );

  -- 创建复合索引（tenant_id, organization_id）
  EXECUTE format('
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_%s_tenant_org 
    ON %I(tenant_id, organization_id)',
    table_name, table_name
  );

  -- 创建复合索引（tenant_id, organization_id, department_id）
  EXECUTE format('
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_%s_tenant_org_dept 
    ON %I(tenant_id, organization_id, department_id)',
    table_name, table_name
  );
END;
$$ LANGUAGE plpgsql;

-- 使用示例:
-- SELECT create_tenant_isolation_indexes('products');
-- SELECT create_tenant_isolation_indexes('orders');
-- SELECT create_tenant_isolation_indexes('users');

-- ============================================================================
-- 回滚脚本（PostgreSQL）
-- ============================================================================

-- 说明: 如果需要回滚索引，使用以下脚本
-- 警告: 删除索引会立即生效，可能影响查询性能

-- 删除指定表的索引
CREATE OR REPLACE FUNCTION drop_tenant_isolation_indexes(table_name TEXT)
RETURNS VOID AS $$
BEGIN
  -- 删除单列索引
  EXECUTE format('DROP INDEX IF EXISTS idx_%s_tenant_id', table_name);
  
  -- 删除复合索引
  EXECUTE format('DROP INDEX IF EXISTS idx_%s_tenant_org', table_name);
  EXECUTE format('DROP INDEX IF EXISTS idx_%s_tenant_org_dept', table_name);
END;
$$ LANGUAGE plpgsql;

-- 手动删除示例:
-- DROP INDEX IF EXISTS idx_products_tenant_id;
-- DROP INDEX IF EXISTS idx_products_tenant_org;
-- DROP INDEX IF EXISTS idx_products_tenant_org_dept;

-- ============================================================================
-- MongoDB 索引创建脚本（JavaScript）
-- ============================================================================

-- 说明: MongoDB 索引创建使用 JavaScript 语法
-- 执行方式:
-- 1. 使用 MongoDB Shell: mongo < database_name > add-tenant-isolation-indexes.js
-- 2. 使用 MongoDB Compass: 在 Shell 标签页中执行
-- 3. 使用 MongoDB Driver: 通过应用程序执行

-- ----------------------------------------------------------------------------
-- MongoDB 索引创建函数
-- ----------------------------------------------------------------------------

/**
 * 为集合创建租户隔离索引
 * @param {string} collectionName - 集合名称
 */
function createTenantIsolationIndexes(collectionName) {
  const db = db.getSiblingDB('your_database_name'); // 替换为实际数据库名
  
  // 1. 单列索引：tenantId
  db[collectionName].createIndex(
    { tenantId: 1 },
    { 
      name: `idx_${collectionName}_tenantId`,
      background: true // 后台创建，不阻塞其他操作
    }
  );
  
  // 2. 复合索引：tenantId + organizationId
  db[collectionName].createIndex(
    { tenantId: 1, organizationId: 1 },
    { 
      name: `idx_${collectionName}_tenant_org`,
      background: true
    }
  );
  
  // 3. 复合索引：tenantId + organizationId + departmentId
  db[collectionName].createIndex(
    { tenantId: 1, organizationId: 1, departmentId: 1 },
    { 
      name: `idx_${collectionName}_tenant_org_dept`,
      background: true
    }
  );
  
  print(`已为集合 ${collectionName} 创建租户隔离索引`);
}

// ----------------------------------------------------------------------------
-- 使用示例
-- ----------------------------------------------------------------------------

-- 为 products 集合创建索引
createTenantIsolationIndexes('products');

-- 为 orders 集合创建索引
createTenantIsolationIndexes('orders');

-- 为 users 集合创建索引
createTenantIsolationIndexes('users');

-- ----------------------------------------------------------------------------
-- MongoDB 部分索引（仅索引满足条件的文档）
-- ----------------------------------------------------------------------------

-- 示例：仅索引未删除的数据
db.products.createIndex(
  { tenantId: 1 },
  { 
    name: 'idx_products_tenantId_active',
    partialFilterExpression: { deletedAt: null },
    background: true
  }
);

-- ----------------------------------------------------------------------------
-- MongoDB 索引创建（直接命令）
-- ----------------------------------------------------------------------------

-- 如果不想使用函数，可以直接执行以下命令:

-- 1. 单列索引
db.products.createIndex({ tenantId: 1 }, { name: 'idx_products_tenantId', background: true });

-- 2. 复合索引（tenantId + organizationId）
db.products.createIndex(
  { tenantId: 1, organizationId: 1 },
  { name: 'idx_products_tenant_org', background: true }
);

-- 3. 复合索引（tenantId + organizationId + departmentId）
db.products.createIndex(
  { tenantId: 1, organizationId: 1, departmentId: 1 },
  { name: 'idx_products_tenant_org_dept', background: true }
);

-- ============================================================================
-- MongoDB 回滚脚本
-- ============================================================================

/**
 * 删除集合的租户隔离索引
 * @param {string} collectionName - 集合名称
 */
function dropTenantIsolationIndexes(collectionName) {
  const db = db.getSiblingDB('your_database_name'); // 替换为实际数据库名
  
  db[collectionName].dropIndex('idx_' + collectionName + '_tenantId');
  db[collectionName].dropIndex('idx_' + collectionName + '_tenant_org');
  db[collectionName].dropIndex('idx_' + collectionName + '_tenant_org_dept');
  
  print(`已删除集合 ${collectionName} 的租户隔离索引`);
}

-- 手动删除示例:
-- db.products.dropIndex('idx_products_tenantId');
-- db.products.dropIndex('idx_products_tenant_org');
-- db.products.dropIndex('idx_products_tenant_org_dept');

-- ============================================================================
-- 索引验证脚本
-- ============================================================================

-- PostgreSQL: 查看索引信息
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE tablename = 'products'
--   AND indexname LIKE 'idx_%tenant%'
-- ORDER BY indexname;

-- MongoDB: 查看索引信息
-- db.products.getIndexes();

-- ============================================================================
-- 性能监控查询
-- ============================================================================

-- PostgreSQL: 查看索引使用情况
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as index_scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE tablename = 'products'
--   AND indexname LIKE 'idx_%tenant%'
-- ORDER BY idx_scan DESC;

-- MongoDB: 查看索引使用情况（需要启用查询分析）
-- db.products.find({ tenantId: 'xxx' }).explain('executionStats');

-- ============================================================================
-- 注意事项
-- ============================================================================

-- 1. **索引大小**: 每个索引会增加约 5-10% 的存储空间
-- 2. **写入性能**: 索引会增加 INSERT/UPDATE 的开销（预计 <5%）
-- 3. **查询性能**: 索引可以显著提升查询性能（预计查询时间减少 50-80%）
-- 4. **维护成本**: 定期监控索引使用情况，删除未使用的索引
-- 5. **并发创建**: PostgreSQL 使用 CONCURRENTLY 选项，MongoDB 使用 background 选项
-- 6. **索引顺序**: 复合索引的字段顺序很重要，遵循最左前缀原则
--
-- 索引字段顺序说明:
-- - 索引 (tenant_id, organization_id, department_id) 可以支持:
--   - WHERE tenant_id = ?
--   - WHERE tenant_id = ? AND organization_id = ?
--   - WHERE tenant_id = ? AND organization_id = ? AND department_id = ?
-- - 但无法支持:
--   - WHERE organization_id = ? (tenant_id 不在前面)
--   - WHERE department_id = ? (tenant_id 不在前面)
--
-- ============================================================================
-- 常见表索引创建示例
-- ============================================================================

-- 以下是一些常见的需要租户隔离的表，请根据实际情况执行相应的索引创建命令

-- 示例表列表:
-- - products (产品表)
-- - orders (订单表)
-- - users (用户表)
-- - organizations (组织表)
-- - departments (部门表)
-- - events (事件表)
-- - audit_logs (审计日志表)

-- PostgreSQL 批量创建示例:
-- SELECT create_tenant_isolation_indexes('products');
-- SELECT create_tenant_isolation_indexes('orders');
-- SELECT create_tenant_isolation_indexes('users');

-- MongoDB 批量创建示例:
-- ['products', 'orders', 'users'].forEach(function(collection) {
--   createTenantIsolationIndexes(collection);
-- });

-- ============================================================================
-- 性能基准测试建议
-- ============================================================================

-- 在创建索引前后，建议执行以下查询以对比性能:

-- PostgreSQL:
-- EXPLAIN ANALYZE
-- SELECT * FROM products 
-- WHERE tenant_id = 'xxx' 
--   AND organization_id = 'yyy' 
--   AND department_id = 'zzz';

-- MongoDB:
-- db.products.find({
--   tenantId: 'xxx',
--   organizationId: 'yyy',
--   departmentId: 'zzz'
-- }).explain('executionStats');

-- ============================================================================
-- 结束
-- ============================================================================

