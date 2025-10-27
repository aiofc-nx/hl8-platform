# 后端项目 ESLint 配置文档

## 概述

本文档详细阐述了 hl8-platform monorepo 后端项目的 ESLint 配置体系，涵盖配置架构、规则说明、使用方式和最佳实践。

## ESLint 配置架构

### 配置包结构

项目采用集中式的 ESLint 配置管理：

```
packages/eslint-config/
├── eslint-base.config.mjs       # 基础配置
├── eslint-nest.config.mjs       # NestJS 专用配置
└── package.json
```

### 配置继承机制

所有后端项目的 ESLint 配置通过 `import` 继承配置包：

```javascript
import nest from "@repo/eslint-config/eslint-nest.config.mjs";

export default [
  ...nest,
  {
    // 项目特定的配置
  }
];
```

## 配置继承体系

### 配置层级

```
eslint-base.config.mjs (基础配置)
  └── eslint-nest.config.mjs (NestJS 配置)
      └── 项目 eslint.config.mjs (项目配置)
```

### 基础配置 (eslint-base.config.mjs)

```javascript
import eslint from "@eslint/js";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import tsEslint from "typescript-eslint";

export default tsEslint.config(
  eslint.configs.recommended,
  ...tsEslint.configs.recommended,
  prettierRecommended,
  {
    ignores: [
      "*.config*.?(c|m)js",
      "*.d.ts",
      ".turbo/",
      "dist/",
      "coverage/",
      "node_modules/",
    ],
  },
);
```

### NestJS 配置 (eslint-nest.config.mjs)

```javascript
import baseConfig from "./eslint-base.config.mjs";

export default [
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
];
```

### 项目配置

```javascript
import nest from "@repo/eslint-config/eslint-nest.config.mjs";

export default [
  ...nest,
  {
    ignores: ["jest.config.ts"],
  },
  {
    files: ["**/*.ts"],
    ignores: ["**/*.spec.ts", "**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["**/*.spec.ts", "**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },
];
```

## 规则详解

### 生产代码规则

- `@typescript-eslint/no-explicit-any`: 禁止使用 `any` 类型
- 强制使用具体类型或 `unknown`

### 测试代码规则

- 允许 `any` 类型
- 允许 `console` 输出
- 允许未使用变量

## 最佳实践

1. 最小化配置覆盖
2. 区分生产和测试规则
3. 使用下划线前缀表示未使用变量
4. 配置编辑器自动修复

## 常见问题

### ESLint 配置不生效

- 检查配置文件名称
- 重启 ESLint 服务器
- 清除缓存

### Prettier 冲突

- 确保安装 `eslint-plugin-prettier`
- 使用 `prettierRecommended` 配置

## 总结

通过统一的 ESLint 配置，确保代码质量、风格统一，提升开发效率。
