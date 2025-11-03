import * as api from "./index.js";

describe("@hl8/interface-kernel public API", () => {
  it("should export expected symbols", () => {
    const keys = Object.keys(api);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys).toEqual(
      expect.arrayContaining([
        "DomainException",
        "BusinessException",
        "EntityId",
        "TenantId",
        "OrganizationId",
        "DepartmentId",
      ]),
    );
  });
});


