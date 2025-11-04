# Interface Consumer Examples

本目录包含示例消费者，演示如何在不改变调用方代码的前提下，切换不同实现（REST/GraphQL/Infra 实现）。

- **契约来源**: `@hl8/interface-kernel`
- **版本路径**: REST 示例采用 `/v{MAJOR}/...`，与 `@hl8/interface-kernel` 的 MAJOR 对齐
- **目标**: 演示“稳定契约 + 可替换实现”

目录说明：

- `rest/` 使用 RESTful 适配层（路径含 `/v{MAJOR}`）
- `graphql/` 使用 GraphQL 适配层（Schema 版本标注）
- `scripts/e2e-switch.sh` 快速切换实现并做端到端校验
