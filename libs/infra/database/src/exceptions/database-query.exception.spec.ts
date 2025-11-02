/**
 * 数据库查询异常测试
 *
 * @description 测试 DatabaseQueryException 异常类
 */

import { DatabaseQueryException } from "./database-query.exception.js";

describe("DatabaseQueryException", () => {
  it("应该创建异常实例", () => {
    const exception = new DatabaseQueryException("查询失败");
    expect(exception).toBeInstanceOf(DatabaseQueryException);
  });

  it("应该包含正确的错误代码和状态码", () => {
    const exception = new DatabaseQueryException("查询失败");
    const response = exception.getResponse() as any;

    expect(response.errorCode).toBe("DATABASE_QUERY_ERROR");
    expect(response.status).toBe(500);
    expect(response.title).toBe("数据库查询错误");
  });

  it("应该包含查询相关数据", () => {
    const exception = new DatabaseQueryException("查询失败", {
      operation: "findUsers",
    });

    const response = exception.getResponse() as any;
    expect(response.data.operation).toBe("findUsers");
  });
});
