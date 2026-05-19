// Basic smoke tests for AggreResearch
describe("AggreResearch", () => {
  test("package.json has required fields", () => {
    const pkg = require("../package.json");
    expect(pkg.name).toBe("aggreresearch");
    expect(pkg.version).toBeDefined();
    expect(pkg.scripts.build).toBeDefined();
  });

  test("main entry point can be imported", () => {
    expect(() => require("../dist/index.js")).not.toThrow();
  });
});
