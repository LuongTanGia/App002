module.exports = {
  ...require("./jest.config.js"),
  displayName: "Integration Tests",
  testMatch: ["**/tests/integration/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.integration.ts"],
  testTimeout: 60000,
};
