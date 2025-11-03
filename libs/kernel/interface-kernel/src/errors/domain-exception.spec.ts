import { DomainException } from "./domain-exception.js";

describe("DomainException", () => {
  it("should set code, message and details", () => {
    const err = new DomainException("INVALID_STATE", "聚合状态不合法", { foo: "bar" });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("DomainException");
    expect(err.code).toBe("INVALID_STATE");
    expect(err.message).toBe("聚合状态不合法");
    expect(err.details).toEqual({ foo: "bar" });
  });
});


