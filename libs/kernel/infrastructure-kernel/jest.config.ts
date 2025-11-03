export default {
  displayName: "infrastructure-kernel",
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  rootDir: ".",
  extensionsToTreatAsEsm: [".ts"],
  testTimeout: 60000, // 60秒超时，用于集成测试
  forceExit: true, // 强制退出，避免异步操作阻止进程退出
  detectOpenHandles: true, // 检测未关闭的句柄
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^(\\.{1,2}/.*)$": "$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
        },
      },
    ],
  },
  moduleFileExtensions: ["ts", "js"],
  coverageDirectory: "../../coverage/libs/infrastructure-kernel",
  testMatch: [
    "**/*.spec.ts",
    "test/**/*.spec.ts",
    "test/**/*.integration.spec.ts",
    "test/**/*.e2e.spec.ts",
  ],
  setupFilesAfterEnv: ["<rootDir>/../../../jest.setup.js"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.test.ts",
    "!src/**/index.ts",
    "!src/**/*.d.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ["text", "text-summary", "html", "lcov"],
  coverageProvider: "v8", // 使用 V8 覆盖率提供者，避免 babel-istanbul 的问题
};
