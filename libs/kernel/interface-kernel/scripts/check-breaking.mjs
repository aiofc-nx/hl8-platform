#!/usr/bin/env node
/**
 * @fileoverview 破坏性变更检测脚本
 * @description 检测 interface-kernel 的公共 API 是否包含破坏性变更
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "../");
const DIST_DIR = join(ROOT_DIR, "dist");
const SRC_DIR = join(ROOT_DIR, "src");

/**
 * 读取 package.json
 */
function readPackageJson() {
  const pkgPath = join(ROOT_DIR, "package.json");
  if (!existsSync(pkgPath)) {
    throw new Error(`package.json not found at ${pkgPath}`);
  }
  return JSON.parse(readFileSync(pkgPath, "utf-8"));
}

/**
 * 提取导出的符号（从 index.ts 和 dist/index.d.ts）
 */
function extractExportedSymbols() {
  const indexPath = join(SRC_DIR, "index.ts");
  // const distIndexPath = join(DIST_DIR, "index.d.ts");

  const exports = new Set();

  // 从源码提取
  if (existsSync(indexPath)) {
    const content = readFileSync(indexPath, "utf-8");
    // 匹配 export { ... } 和 export type { ... }
    const exportMatches = content.matchAll(/export\s+(?:type\s+)?\{[^}]+\}/g);
    for (const match of exportMatches) {
      const exportsList = match[0]
        .replace(/export\s+(?:type\s+)?\{/, "")
        .replace(/\}/, "")
        .split(",")
        .map((s) => s.trim().split(" as ")[0].trim())
        .filter(Boolean);
      exportsList.forEach((exp) => exports.add(exp));
    }

    // 匹配 export class/interface/type/const
    const singleExports = content.matchAll(
      /export\s+(?:class|interface|type|const|function)\s+(\w+)/g,
    );
    for (const match of singleExports) {
      exports.add(match[1]);
    }
  }

  return Array.from(exports).sort();
}

/**
 * 提取 package.json 的 exports 字段
 */
function extractExportPaths(pkg) {
  const exports = pkg.exports || {};
  return Object.keys(exports).sort();
}

/**
 * 检查破坏性变更
 */
function checkBreakingChanges(currentPkg, baselinePkg = null) {
  const issues = [];
  const warnings = [];

  // 检查 exports 字段
  const currentExports = extractExportPaths(currentPkg);
  if (baselinePkg) {
    const baselineExports = extractExportPaths(baselinePkg);
    const removed = baselineExports.filter((e) => !currentExports.includes(e));
    if (removed.length > 0) {
      issues.push({
        type: "BREAKING",
        message: `Removed export paths: ${removed.join(", ")}`,
        category: "exports",
      });
    }
  }

  // 检查版本号
  const currentVersion = currentPkg.version;
  if (baselinePkg) {
    const baselineVersion = baselinePkg.version;
    const [currentMajor] = currentVersion.split(".");
    const [baselineMajor] = baselineVersion.split(".");
    if (currentMajor !== baselineMajor) {
      // MAJOR 版本变更需要审查
      warnings.push({
        type: "WARNING",
        message: `MAJOR version changed: ${baselineVersion} → ${currentVersion}`,
        category: "version",
      });
    }
  }

  // 检查导出的符号
  const currentSymbols = extractExportedSymbols();
  if (baselinePkg) {
    // 如果有基线版本，可以比较符号
    // 这里简化处理，实际应该从基线版本的 dist/index.d.ts 提取
    console.log("📋 Current exported symbols:", currentSymbols.length);
  } else {
    console.log("📋 Current exported symbols:", currentSymbols.length);
    console.log("   Symbols:", currentSymbols.slice(0, 10).join(", "));
    if (currentSymbols.length > 10) {
      console.log(`   ... and ${currentSymbols.length - 10} more`);
    }
  }

  return { issues, warnings };
}

/**
 * 主函数
 */
function main() {
  console.log("🔍 Checking for breaking changes in @hl8/interface-kernel\n");

  const args = process.argv.slice(2);
  const baselinePath = args[0]; // 可选的基线 package.json 路径

  try {
    const currentPkg = readPackageJson();
    console.log(`📦 Current version: ${currentPkg.version}`);
    console.log(`📁 Package root: ${ROOT_DIR}\n`);

    let baselinePkg = null;
    if (baselinePath && existsSync(baselinePath)) {
      console.log(`📊 Baseline: ${baselinePath}\n`);
      baselinePkg = JSON.parse(readFileSync(baselinePath, "utf-8"));
    } else {
      console.log("ℹ️  No baseline provided. Running basic checks.\n");
    }

    // 检查 dist 目录是否存在（需要先构建）
    if (!existsSync(DIST_DIR)) {
      console.warn(
        "⚠️  dist/ directory not found. Please run 'pnpm build' first.\n",
      );
    }

    const { issues, warnings } = checkBreakingChanges(currentPkg, baselinePkg);

    // 输出结果
    if (issues.length > 0) {
      console.log("❌ BREAKING CHANGES DETECTED:\n");
      issues.forEach((issue, idx) => {
        console.log(`${idx + 1}. [${issue.category}] ${issue.message}`);
      });
      console.log("\n⚠️  These changes require a MAJOR version bump.\n");
      process.exit(1);
    } else if (warnings.length > 0) {
      console.log("⚠️  WARNINGS:\n");
      warnings.forEach((warning, idx) => {
        console.log(`${idx + 1}. [${warning.category}] ${warning.message}`);
      });
      console.log(
        "\n✅ No breaking changes detected, but please review warnings.\n",
      );
      process.exit(0);
    } else {
      console.log("✅ No breaking changes detected.\n");
      process.exit(0);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行
main();
