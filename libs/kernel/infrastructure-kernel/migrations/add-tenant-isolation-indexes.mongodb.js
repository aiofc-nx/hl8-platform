/**
 * ============================================================================
 * 租户隔离索引迁移脚本 - MongoDB
 * ============================================================================
 * 文件: add-tenant-isolation-indexes.mongodb.js
 * 描述: 为租户隔离字段创建 MongoDB 索引
 * 版本: 1.0.0
 * 创建日期: 2025-01-02
 * 
 * 使用方法:
 * 1. 使用 MongoDB Shell 执行: mongo <database_name> add-tenant-isolation-indexes.mongodb.js
 * 2. 或使用 MongoDB Compass 在 Shell 标签页中执行
 * 3. 或通过 MongoDB Driver 在应用程序中执行
 * 
 * 注意事项:
 * - 执行前请确保已添加租户隔离字段（tenantId, organizationId, departmentId）
 * - 使用 background: true 选项在后台创建索引，不阻塞其他操作
 * - 对于大型集合，索引创建可能需要较长时间
 * ============================================================================
 */

// 设置数据库名称（请根据实际情况修改）
const DATABASE_NAME = 'your_database_name';

// 获取数据库实例
const db = db.getSiblingDB(DATABASE_NAME);

/**
 * 为集合创建租户隔离索引
 * @param {string} collectionName - 集合名称
 * @param {object} options - 选项
 * @param {boolean} options.background - 是否后台创建（默认 true）
 * @param {boolean} options.sparse - 是否创建稀疏索引（默认 false）
 */
function createTenantIsolationIndexes(collectionName, options = {}) {
  const {
    background = true,
    sparse = false,
  } = options;

  print(`开始为集合 ${collectionName} 创建租户隔离索引...`);

  try {
    // 1. 单列索引：tenantId
    // 用途: 优化租户级别的查询
    db[collectionName].createIndex(
      { tenantId: 1 },
      {
        name: `idx_${collectionName}_tenantId`,
        background: background,
        sparse: sparse,
      },
    );
    print(`  ✓ 已创建索引: idx_${collectionName}_tenantId`);

    // 2. 复合索引：tenantId + organizationId
    // 用途: 优化组织级别的查询
    db[collectionName].createIndex(
      { tenantId: 1, organizationId: 1 },
      {
        name: `idx_${collectionName}_tenant_org`,
        background: background,
        sparse: sparse,
      },
    );
    print(`  ✓ 已创建索引: idx_${collectionName}_tenant_org`);

    // 3. 复合索引：tenantId + organizationId + departmentId
    // 用途: 优化部门级别的查询
    db[collectionName].createIndex(
      { tenantId: 1, organizationId: 1, departmentId: 1 },
      {
        name: `idx_${collectionName}_tenant_org_dept`,
        background: background,
        sparse: sparse,
      },
    );
    print(`  ✓ 已创建索引: idx_${collectionName}_tenant_org_dept`);

    // 4. 部分索引：仅索引未删除的数据（可选）
    // 用途: 优化活跃数据的查询，减少索引大小
    db[collectionName].createIndex(
      { tenantId: 1 },
      {
        name: `idx_${collectionName}_tenantId_active`,
        partialFilterExpression: { deletedAt: null },
        background: background,
        sparse: true,
      },
    );
    print(`  ✓ 已创建部分索引: idx_${collectionName}_tenantId_active`);

    print(`✓ 集合 ${collectionName} 的租户隔离索引创建完成`);
    return true;
  } catch (error) {
    print(`✗ 为集合 ${collectionName} 创建索引时出错: ${error.message}`);
    return false;
  }
}

/**
 * 删除集合的租户隔离索引
 * @param {string} collectionName - 集合名称
 */
function dropTenantIsolationIndexes(collectionName) {
  print(`开始删除集合 ${collectionName} 的租户隔离索引...`);

  try {
    const indexes = [
      `idx_${collectionName}_tenantId`,
      `idx_${collectionName}_tenant_org`,
      `idx_${collectionName}_tenant_org_dept`,
      `idx_${collectionName}_tenantId_active`,
    ];

    indexes.forEach((indexName) => {
      try {
        db[collectionName].dropIndex(indexName);
        print(`  ✓ 已删除索引: ${indexName}`);
      } catch (error) {
        if (error.codeName === 'IndexNotFound') {
          print(`  - 索引不存在，跳过: ${indexName}`);
        } else {
          print(`  ✗ 删除索引失败: ${indexName}, 错误: ${error.message}`);
        }
      }
    });

    print(`✓ 集合 ${collectionName} 的租户隔离索引删除完成`);
    return true;
  } catch (error) {
    print(`✗ 删除集合 ${collectionName} 的索引时出错: ${error.message}`);
    return false;
  }
}

/**
 * 查看集合的索引信息
 * @param {string} collectionName - 集合名称
 */
function showIndexes(collectionName) {
  print(`\n集合 ${collectionName} 的索引信息:`);
  print('='.repeat(60));

  const indexes = db[collectionName].getIndexes();
  const tenantIndexes = indexes.filter((idx) =>
    idx.name.includes('tenant'),
  );

  if (tenantIndexes.length === 0) {
    print('未找到租户隔离相关索引');
    return;
  }

  tenantIndexes.forEach((index) => {
    print(`\n索引名称: ${index.name}`);
    print(`索引键: ${JSON.stringify(index.key)}`);
    if (index.partialFilterExpression) {
      print(
        `部分过滤条件: ${JSON.stringify(index.partialFilterExpression)}`,
      );
    }
    print(`是否稀疏: ${index.sparse || false}`);
    print(`是否唯一: ${index.unique || false}`);
  });

  print('='.repeat(60));
}

/**
 * 验证索引是否已创建
 * @param {string} collectionName - 集合名称
 * @returns {boolean} 是否所有索引都存在
 */
function validateIndexes(collectionName) {
  const requiredIndexes = [
    `idx_${collectionName}_tenantId`,
    `idx_${collectionName}_tenant_org`,
    `idx_${collectionName}_tenant_org_dept`,
  ];

  const indexes = db[collectionName].getIndexes();
  const indexNames = indexes.map((idx) => idx.name);

  let allExist = true;
  requiredIndexes.forEach((indexName) => {
    if (indexNames.includes(indexName)) {
      print(`✓ 索引存在: ${indexName}`);
    } else {
      print(`✗ 索引缺失: ${indexName}`);
      allExist = false;
    }
  });

  return allExist;
}

// ============================================================================
// 执行索引创建
// ============================================================================

// 定义需要创建索引的集合列表（请根据实际情况修改）
const COLLECTIONS = [
  'products', // 产品表
  'orders', // 订单表
  'users', // 用户表
  // 添加其他需要租户隔离的集合
];

print('='.repeat(60));
print('租户隔离索引迁移脚本 - MongoDB');
print('='.repeat(60));
print(`数据库: ${DATABASE_NAME}`);
print(`集合数量: ${COLLECTIONS.length}`);
print('='.repeat(60));

// 批量创建索引
let successCount = 0;
let failureCount = 0;

COLLECTIONS.forEach((collection) => {
  print(`\n处理集合: ${collection}`);
  if (createTenantIsolationIndexes(collection)) {
    successCount++;
  } else {
    failureCount++;
  }
});

// 输出总结
print('\n' + '='.repeat(60));
print('索引创建完成');
print('='.repeat(60));
print(`成功: ${successCount} 个集合`);
print(`失败: ${failureCount} 个集合`);
print('='.repeat(60));

// 验证所有索引
print('\n验证索引创建...');
COLLECTIONS.forEach((collection) => {
  print(`\n集合: ${collection}`);
  validateIndexes(collection);
});

// 显示所有索引信息
print('\n\n所有集合的索引信息:');
COLLECTIONS.forEach((collection) => {
  showIndexes(collection);
});

print('\n脚本执行完成！');

