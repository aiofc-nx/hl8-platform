export default {
  collectCoverageFrom: [
    "src/**/*.(t|j)s",
    "!src/**/*.spec.ts",
    "!src/**/*.test.ts",
  ],
  coverageDirectory: "../coverage",
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testEnvironment: "node",
  testMatch: [
    "**/*.spec.ts",
    "../test/integration/**/*.spec.ts",
    "../test/e2e/**/*.spec.ts",
  ],
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "ESNext",
          moduleResolution: "NodeNext",
        },
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@hl8|ioredis|class-transformer|class-validator)/)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@hl8/caching$":
      "/home/arligle/hl8/hl8-ai-saas-platform/libs/caching/dist/index.js",
    "^@hl8/config$":
      "/home/arligle/hl8/hl8-ai-saas-platform/libs/config/dist/index.js",
    "^@hl8/database$":
      "/home/arligle/hl8/hl8-ai-saas-platform/libs/database/dist/index.js",
    "^@hl8/nestjs-fastify$":
      "/home/arligle/hl8/hl8-ai-saas-platform/libs/nestjs-fastify/dist/index.js",
    "^@hl8/nestjs-isolation$":
      "/home/arligle/hl8/hl8-ai-saas-platform/libs/nestjs-isolation/dist/index.js",
    "^@hl8/isolation-model$":
      "/home/arligle/hl8/hl8-ai-saas-platform/libs/isolation-model/dist/index.js",
  },
};
