import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: {
        module: "commonjs",
        moduleResolution: "node",
        jsx: "react-jsx",
      },
    }],
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  // Shared setup for all auth tests: mocks server-only and Firebase client SDK
  setupFilesAfterEnv: ["<rootDir>/__tests__/auth/setup.ts"],
};

export default config;
