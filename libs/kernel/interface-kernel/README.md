# @hl8/interface-kernel

稳定的接口契约内核（framework-agnostic），统一对外暴露：标识符、上下文、仓储、CQRS、事件、结果、通用模型等。

- 模块系统：ESM（`type: module`，NodeNext）
- 版本策略：严格 SemVer，MAJOR 冻结期 ≥ 3 个月；废弃需跨 ≥2 个 MINOR；REST 使用 `/v{MAJOR}` 路径
- 依赖优先：优先经 `libs/infra/*` 适配的基础设施
- 注释规范：中文 TSDoc，代码即文档

示例消费与适配参见 `examples/interface-consumer/`
