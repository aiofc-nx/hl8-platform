export default {
  displayName: "@hl8/database",
  testEnvironment: "node",
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  globals: {
    "ts-jest": {
      useESM: true,
      tsconfig: {
        module: "esnext",
        target: "es2022",
        moduleResolution: "node",
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "esnext",
          target: "es2022",
          moduleResolution: "node",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  moduleFileExtensions: ["ts", "js", "json"],
  coverageDirectory: "../../coverage/libs/database",
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/",
    "/dist/",
    ".spec.ts$",
  ],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.spec.ts", "!src/**/index.ts"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@hl8/exceptions$": "<rootDir>/../../libs/exceptions/src/index.ts",
    "^@hl8/nestjs-fastify$": "<rootDir>/../../libs/nestjs-fastify/src/index.ts",
  },
  testMatch: ["**/*.spec.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
};
//# sourceMappingURL=jest.config.js.map
