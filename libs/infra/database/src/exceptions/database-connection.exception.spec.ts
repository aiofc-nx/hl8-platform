/**
 * 数据库连接异常测试
 *
 * @description 测试 DatabaseConnectionException 异常类
 */

import { DatabaseConnectionException } from "./database-connection.exception.js";

describe("DatabaseConnectionException", () => {
  it("应该创建异常实例", () => {
    const exception = new DatabaseConnectionException("连接失败");
    expect(exception).toBeInstanceOf(DatabaseConnectionException);
  });

  it("应该包含正确的错误代码和状态码", () => {
    const exception = new DatabaseConnectionException("连接失败");
    const response = exception.getResponse() as any;

    expect(response.errorCode).toBe("DATABASE_CONNECTION_ERROR");
    expect(response.status).toBe(503);
    expect(response.title).toBe("数据库连接错误");
    expect(response.detail).toBe("连接失败");
  });

  it("应该包含诊断数据", () => {
    const exception = new DatabaseConnectionException("连接失败", {
      host: "localhost",
      port: 5432,
    });

    const response = exception.getResponse() as any;
    expect(response.data).toEqual({
      host: "localhost",
      port: 5432,
    });
  });

  it("应该包含必需的响应字段", () => {
    const exception = new DatabaseConnectionException("连接失败");
    const response = exception.getResponse() as any;

    expect(response).toHaveProperty("title");
    expect(response).toHaveProperty("detail");
    expect(response).toHaveProperty("status");
    expect(response).toHaveProperty("errorCode");
  });
});
