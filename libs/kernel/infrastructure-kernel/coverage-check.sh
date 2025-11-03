#!/bin/bash
# 手动计算测试覆盖率
echo "=== 基础设施内核测试覆盖率分析 ==="
echo ""
echo "## 源代码文件统计"
SRC_FILES=$(find src -name "*.ts" ! -name "*.spec.ts" ! -name "*.d.ts" -type f | wc -l)
echo "源代码文件数: $SRC_FILES"
echo ""
echo "## 测试文件统计"
SPEC_FILES=$(find . -name "*.spec.ts" -type f ! -path "*/node_modules/*" | wc -l)
echo "测试文件数: $SPEC_FILES"
echo ""
echo "## 核心模块测试覆盖情况"
echo ""
echo "### 已测试模块:"
find src -type d -mindepth 1 -maxdepth 1 | while read dir; do
  dirname=$(basename "$dir")
  spec_count=$(find "$dir" -name "*.spec.ts" 2>/dev/null | wc -l)
  integration_count=$(find test/integration -name "*$(basename $dir)*.spec.ts" 2>/dev/null | wc -l)
  total_tests=$((spec_count + integration_count))
  if [ $total_tests -gt 0 ]; then
    echo "  ✅ $dirname: $spec_count 单元测试 + $integration_count 集成测试"
  else
    echo "  ⚠️  $dirname: 无测试"
  fi
done
echo ""
echo "### 集成测试模块:"
find test/integration -name "*.spec.ts" 2>/dev/null | while read file; do
  basename "$file" | sed 's/.spec.ts$//' | sed 's/^/  ✅ /'
done
