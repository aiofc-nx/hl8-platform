# 变更策略与 SemVer 合规性

本文档定义了 `@hl8/interface-kernel` 的变更报告模板和严格的 SemVer 策略。

**版本**: 1.0.0  
**生效日期**: 2025-01-XX

---

## 📋 目录

1. [SemVer 策略](#semver-策略)
2. [变更类型](#变更类型)
3. [变更报告模板](#变更报告模板)
4. [废弃策略](#废弃策略)
5. [审查流程](#审查流程)

---

## SemVer 策略

### 版本格式

遵循 [Semantic Versioning 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH
```

### 版本规则

| 变更类型 | MAJOR | MINOR | PATCH | 示例 |
|---------|-------|-------|-------|------|
| **破坏性变更** | ✅ +1 | - | - | `1.0.0` → `2.0.0` |
| **新增功能（向后兼容）** | - | ✅ +1 | - | `1.0.0` → `1.1.0` |
| **Bug 修复（向后兼容）** | - | - | ✅ +1 | `1.0.0` → `1.0.1` |
| **文档/注释更新** | - | - | ✅ +1 | `1.0.0` → `1.0.1` |

### MAJOR 版本冻结期

**规则**: 每个 MAJOR 版本发布后，必须冻结 ≥3 个月才能发布下一个 MAJOR 版本。

**目的**: 确保用户有足够时间升级和迁移。

**例外**: 仅在有严重安全漏洞时可提前发布。

---

## 变更类型

### 🔴 破坏性变更（Breaking Changes）

以下情况视为破坏性变更，必须升级 MAJOR 版本：

1. **删除公共 API**
   - 删除导出的类型、接口、类、函数
   - 删除 `package.json` 中的导出路径

2. **修改接口签名**
   - 删除接口/类型的必需属性或方法
   - 修改参数类型（非扩展）
   - 修改返回类型（非扩展）

3. **修改类型约束**
   - 使泛型参数更严格
   - 移除联合类型中的选项

4. **行为变更**
   - 改变现有 API 的运行时行为（虽不常见）

### 🟢 向后兼容变更（Non-Breaking Changes）

以下情况视为向后兼容，可升级 MINOR 或 PATCH 版本：

1. **新增 API**
   - 新增导出的类型、接口、类、函数
   - 新增导出路径（`exports` 字段）

2. **扩展接口**
   - 新增接口/类型的可选属性或方法
   - 扩展联合类型（添加新选项）
   - 放宽泛型约束

3. **内部实现变更**
   - 仅修改实现代码，不影响公共 API

4. **文档更新**
   - 更新 TSDoc 注释
   - 更新 README 或示例代码

---

## 变更报告模板

### 格式

```markdown
## [版本号] - [发布日期]

### 🔴 Breaking Changes
- [变更描述] ([#PR号](链接))
  - **影响**: [受影响范围]
  - **迁移指南**: [如何迁移]

### 🟢 Added
- [新增功能描述] ([#PR号](链接))

### 🟡 Changed
- [变更描述] ([#PR号](链接))

### 🟠 Deprecated
- [废弃 API 描述] ([#PR号](链接))
  - **替代方案**: [推荐的替代 API]
  - **移除计划**: [计划移除的版本]

### 🐛 Fixed
- [修复描述] ([#PR号](链接))

### 📚 Documentation
- [文档更新描述] ([#PR号](链接))
```

### 示例

```markdown
## [2.0.0] - 2025-04-XX

### 🔴 Breaking Changes
- 移除 `IRepository.findById()` 方法 ([#123](https://github.com/...))
  - **影响**: 所有使用 `IRepository.findById()` 的代码需要迁移
  - **迁移指南**: 使用 `IRepository.findOne({ id })` 替代

### 🟢 Added
- 新增 `IQueryRepository.findMany()` 方法 ([#124](https://github.com/...))
- 新增子路径导出 `/events` ([#125](https://github.com/...))

### 🟡 Changed
- `Pagination` 接口的 `size` 属性重命名为 `limit` ([#126](https://github.com/...))

### 🟠 Deprecated
- 废弃 `BaseCommand.execute()` 方法 ([#127](https://github.com/...))
  - **替代方案**: 使用 `IBaseCommand.handle()` 方法
  - **移除计划**: 将在 `3.0.0` 中移除

### 🐛 Fixed
- 修复 `TenantContext` 类型定义中的可选属性错误 ([#128](https://github.com/...))
```

---

## 废弃策略

### 废弃规则

1. **最小跨度**: 废弃的 API 必须至少跨越 **2 个 MINOR 版本**才能移除
   - 例如：在 `1.2.0` 废弃，最早在 `1.4.0` 移除

2. **禁止跳跃移除**: 不允许在同一 MAJOR 版本中跳过 MINOR 版本直接移除
   - ❌ 错误：`1.2.0` 废弃 → `1.3.0` 移除（只跨 1 个版本）
   - ✅ 正确：`1.2.0` 废弃 → `1.4.0` 移除（跨 2 个版本）

3. **废弃标记**: 使用 `@deprecated` TSDoc 标记
   ```typescript
   /**
    * @deprecated 将在 v3.0.0 中移除，请使用 IBaseCommand.handle() 替代
    */
   ```

### 废弃流程

1. **标记废弃**: 在下一个 MINOR 版本中标记为废弃
2. **文档说明**: 在 CHANGELOG 中记录废弃原因和替代方案
3. **等待期**: 等待 ≥2 个 MINOR 版本
4. **移除**: 在下一个 MAJOR 版本中移除（或符合等待期后）

---

## 审查流程

### 变更审查清单

在提交变更前，确认：

- [ ] 变更类型已正确分类（Breaking/Non-Breaking）
- [ ] 如果属于破坏性变更，已更新 MAJOR 版本
- [ ] 如果属于新增功能，已更新 MINOR 版本
- [ ] 如果属于 Bug 修复，已更新 PATCH 版本
- [ ] 已更新 `CHANGELOG.md`
- [ ] 已更新对齐矩阵（`MATRIX.md`，如适用）
- [ ] 已添加或更新 TSDoc 注释
- [ ] 已运行破坏性变更检测脚本（`check-breaking.mjs`）

### 发布前检查

- [ ] 版本号已更新（`package.json`）
- [ ] `CHANGELOG.md` 已更新且格式正确
- [ ] 所有测试通过
- [ ] 代码覆盖率 ≥90%
- [ ] 文档已同步更新
- [ ] 已通知受影响的内核（domain/application/infrastructure）

---

## 🔗 相关资源

- [Semantic Versioning 2.0.0](https://semver.org/)
- [对齐矩阵](MATRIX.md) - 契约到内核的映射
- [破坏性变更检测脚本](../../libs/kernel/interface-kernel/scripts/check-breaking.mjs) - 自动化检测工具

