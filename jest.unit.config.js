module.exports = {
  ...require("./jest.config.js"),
  displayName: "Unit Tests",
  testMatch: ["**/tests/unit/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.unit.ts"],
};
