import nest from "@repo/eslint-config/eslint-nest.config.mjs";

export default [
  ...nest,
  {
    ignores: [
      "jest.config.ts",
      "dist/**",
      "node_modules/**",
      "coverage/**",
    ],
  },
];
