/**
 * 数据库事务异常测试
 *
 * @description 测试 DatabaseTransactionException 异常类
 */

import { DatabaseTransactionException } from "./database-transaction.exception.js";

describe("DatabaseTransactionException", () => {
  it("应该创建异常实例", () => {
    const exception = new DatabaseTransactionException("事务失败");
    expect(exception).toBeInstanceOf(DatabaseTransactionException);
  });

  it("应该包含正确的错误代码和状态码", () => {
    const exception = new DatabaseTransactionException("事务失败");
    const response = exception.getResponse() as any;

    expect(response.errorCode).toBe("DATABASE_TRANSACTION_ERROR");
    expect(response.status).toBe(500);
    expect(response.title).toBe("数据库事务错误");
  });
});
