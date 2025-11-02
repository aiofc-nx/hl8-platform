declare const _default: {
  displayName: string;
  testEnvironment: string;
  transform: {
    "^.+\\.ts$": (
      | string
      | {
          useESM: boolean;
          tsconfig: {
            module: string;
            esModuleInterop: boolean;
          };
        }
    )[];
  };
  moduleFileExtensions: string[];
  coverageDirectory: string;
  coveragePathIgnorePatterns: string[];
  collectCoverageFrom: string[];
  coverageThreshold: {
    global: {
      branches: number;
      functions: number;
      lines: number;
      statements: number;
    };
  };
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": string;
  };
  testMatch: string[];
};
export default _default;
//# sourceMappingURL=jest.config.d.ts.map
