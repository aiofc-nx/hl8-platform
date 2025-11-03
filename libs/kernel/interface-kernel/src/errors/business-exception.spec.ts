import { BusinessException } from "./business-exception.js";

describe("BusinessException", () => {
  it("should extend DomainException and set name", () => {
    const err = new BusinessException("VALIDATION_FAILED", "参数校验失败", {
      field: "price",
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("BusinessException");
    expect(err.code).toBe("VALIDATION_FAILED");
    expect(err.message).toBe("参数校验失败");
    expect(err.details).toEqual({ field: "price" });
  });
});
