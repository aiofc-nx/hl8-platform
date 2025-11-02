/**
 * @fileoverview 租户上下文中间件
 * @description 自动提取和注入租户上下文到命令和查询中
 */

import { Injectable } from "@nestjs/common";
import { Logger } from "@hl8/logger";
import { BaseBusMiddleware } from "../bus/middleware/bus-middleware.js";
import type { ExecutionContext } from "../bus/command-query-bus.interface.js";
import type { BaseCommand } from "../commands/base/command.base.js";
import type { BaseQuery } from "../queries/base/query.base.js";
import type { TenantContext } from "@hl8/domain-kernel";
import type { ITenantContextExtractor } from "../context/tenant-context-extractor.interface.js";
import type { ITenantPermissionValidator } from "../context/tenant-permission-validator.interface.js";

/**
 * 租户上下文中间件
 * @description 自动从请求中提取租户上下文并注入到命令/查询中
 */
@Injectable()
export class TenantContextMiddleware extends BaseBusMiddleware {
  constructor(
    logger: Logger,
    private readonly tenantExtractor: ITenantContextExtractor,
    private readonly permissionValidator: ITenantPermissionValidator,
  ) {
    super(logger);
  }

  getName(): string {
    return "TenantContextMiddleware";
  }

  getDescription(): string {
    return "自动提取和注入租户上下文到命令和查询中";
  }

  getVersion(): string {
    return "1.0.0";
  }

  getPriority(): number {
    return 50; // 较高优先级，确保在其他中间件之前执行
  }

  /**
   * 命令前置处理
   * @param command 命令对象
   * @param context 执行上下文
   * @returns 是否继续执行
   */
  async beforeCommand(
    command: BaseCommand,
    context: ExecutionContext,
  ): Promise<boolean> {
    try {
      // 从上下文提取租户信息
      const tenantContext = await this.extractTenantContext(context);

      if (!tenantContext) {
        this.logger.warn("无法提取租户上下文，拒绝执行命令", {
          commandType: command.commandType,
          executionId: context.executionId,
        });

        return false;
      }

      // 将租户上下文注入到命令对象
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (command as any).tenantContext = tenantContext;

      this.logger.debug("成功注入租户上下文", {
        commandType: command.commandType,
        tenantId: tenantContext.tenantId.value,
        executionId: context.executionId,
      });

      return true;
    } catch (error) {
      this.logger.error("提取租户上下文失败", {
        error: error instanceof Error ? error.message : String(error),
        commandType: command.commandType,
        executionId: context.executionId,
      });

      return false;
    }
  }

  /**
   * 查询前置处理
   * @param query 查询对象
   * @param context 执行上下文
   * @returns 是否继续执行
   */
  async beforeQuery(
    query: BaseQuery,
    context: ExecutionContext,
  ): Promise<boolean> {
    try {
      // 从上下文提取租户信息
      const tenantContext = await this.extractTenantContext(context);

      if (!tenantContext) {
        this.logger.warn("无法提取租户上下文，拒绝执行查询", {
          queryType: query.queryType,
          executionId: context.executionId,
        });

        return false;
      }

      // 将租户上下文注入到查询对象
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (query as any).tenantContext = tenantContext;

      this.logger.debug("成功注入租户上下文", {
        queryType: query.queryType,
        tenantId: tenantContext.tenantId.value,
        executionId: context.executionId,
      });

      return true;
    } catch (error) {
      this.logger.error("提取租户上下文失败", {
        error: error instanceof Error ? error.message : String(error),
        queryType: query.queryType,
        executionId: context.executionId,
      });

      return false;
    }
  }

  /**
   * 提取租户上下文
   * @private
   * @param context 执行上下文
   * @returns 租户上下文或null
   */
  private async extractTenantContext(
    context: ExecutionContext,
  ): Promise<TenantContext | null> {
    // 尝试从metadata中提取租户上下文
    let tenantContext: TenantContext | null = null;

    // 从metadata中找到headers
    if (context.metadata && context.metadata.headers) {
      tenantContext = await this.tenantExtractor.extractFromHeader(
        context.metadata.headers as Record<string, string>,
      );
    }

    // 如果从headers提取失败，尝试从metadata中找到tenantContext
    if (!tenantContext && context.metadata?.tenantContext) {
      // const tenantContextData = context.metadata.tenantContext as Record<
      //   string,
      //   unknown
      // >;
      // 这里可以尝试构建TenantContext对象
      // 但最好还是从原始请求头提取
    }

    return tenantContext;
  }
}
