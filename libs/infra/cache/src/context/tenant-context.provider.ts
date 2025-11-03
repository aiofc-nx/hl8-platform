/**
 * @fileoverview 租户上下文提供者
 * @description 基于 nestjs-cls 从 CLS 中提取 tenantId；在未集成 CLS 时优雅降级。
 */

import { Injectable, Optional } from "@nestjs/common";
import type { ClsService } from "nestjs-cls";

/**
 * 租户上下文提供者接口
 */
export interface TenantContextProvider {
  /** 获取当前租户 ID（无则返回 undefined） */
  getTenantId(): string | undefined;
}

/**
 * 基于 nestjs-cls 的租户上下文提供者实现
 */
@Injectable()
export class ClsTenantContextProvider implements TenantContextProvider {
  constructor(@Optional() private readonly cls?: ClsService) {}

  getTenantId(): string | undefined {
    try {
      const tenantId = this.cls?.get<string>("tenantId");
      if (typeof tenantId === "string" && tenantId.trim().length > 0) {
        return tenantId;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }
}
