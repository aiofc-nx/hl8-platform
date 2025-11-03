import nest from "@repo/eslint-config/eslint-nest.config.mjs";

export default [
  ...nest,
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
    ],
  },
  {
    files: ["scripts/**/*.mjs", "jest.config.ts"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
      },
    },
  },
];
