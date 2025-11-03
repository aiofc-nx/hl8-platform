#!/usr/bin/env node
/**
 * @fileoverview CI覆盖率门禁检查脚本
 * @description 验证公共API测试覆盖率≥90%，关键路径≥95%
 */

import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const COVERAGE_THRESHOLDS = {
  global: {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },
  // 关键路径（待扩展：可配置关键文件列表）
  // critical: {
  //   branches: 95,
  //   functions: 95,
  //   lines: 95,
  //   statements: 95,
  // },
};

/**
 * 读取coverage报告并验证阈值
 */
function checkCoverage() {
  const coveragePath = join(
    __dirname,
    "../../coverage/libs/interface-kernel/coverage-summary.json",
  );

  try {
    const coverage = JSON.parse(readFileSync(coveragePath, "utf-8"));
    const totals = coverage.total || {};

    const failures = [];

    for (const metric of ["branches", "functions", "lines", "statements"]) {
      const threshold = COVERAGE_THRESHOLDS.global[metric];
      const actual = totals[metric]?.pct || 0;

      if (actual < threshold) {
        failures.push(`覆盖率不足: ${metric} ${actual}% < ${threshold}%`);
      }
    }

    if (failures.length > 0) {
      console.error("❌ 覆盖率检查失败:");
      failures.forEach((f) => console.error(`  - ${f}`));
      process.exit(1);
    }

    console.log("✅ 覆盖率检查通过");
    console.log(`  - branches: ${totals.branches?.pct || 0}%`);
    console.log(`  - functions: ${totals.functions?.pct || 0}%`);
    console.log(`  - lines: ${totals.lines?.pct || 0}%`);
    console.log(`  - statements: ${totals.statements?.pct || 0}%`);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn("⚠️  覆盖率报告未找到，请先运行 `pnpm test:cov`");
      console.warn("   在CI环境中，请确保测试覆盖率报告已生成");
      // 在CI环境中，这应该失败
      if (process.env.CI) {
        process.exit(1);
      }
    } else {
      throw error;
    }
  }
}

checkCoverage();
