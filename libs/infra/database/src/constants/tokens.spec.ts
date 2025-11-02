/**
 * 依赖注入令牌测试
 *
 * @description 测试 DI_TOKENS 常量定义
 */

import { DI_TOKENS } from "./tokens.js";

describe("DI_TOKENS", () => {
  it("应该定义所有必需的令牌", () => {
    expect(DI_TOKENS.MODULE_OPTIONS).toBe("DATABASE_MODULE_OPTIONS");
    expect(DI_TOKENS.CONNECTION_MANAGER).toBe("DATABASE_CONNECTION_MANAGER");
    expect(DI_TOKENS.TRANSACTION_SERVICE).toBe("DATABASE_TRANSACTION_SERVICE");
    expect(DI_TOKENS.HEALTH_CHECK_SERVICE).toBe(
      "DATABASE_HEALTH_CHECK_SERVICE",
    );
    expect(DI_TOKENS.METRICS_SERVICE).toBe("DATABASE_METRICS_SERVICE");
  });

  it("所有令牌应该唯一", () => {
    const tokens = Object.values(DI_TOKENS);
    const uniqueTokens = new Set(tokens);
    expect(tokens.length).toBe(uniqueTokens.size);
  });

  it("所有令牌应该是字符串", () => {
    Object.values(DI_TOKENS).forEach((token) => {
      expect(typeof token).toBe("string");
    });
  });
});
