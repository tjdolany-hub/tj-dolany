import nextConfig from "eslint-config-next/core-web-vitals";

// eslint-config-next 16 ships a native flat config (array). The previous
// FlatCompat(...).extends("next/core-web-vitals", "next/typescript") setup threw
// "Converting circular structure to JSON" under ESLint 9, so lint ran on 0 files.
/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  { ignores: [".netlify/**"] }, // Netlify build output (edge functions + nested .next)
  ...nextConfig,
  {
    rules: {
      // react-hooks 7 flags standard "load data on mount / on tab change" effects
      // (the loaders set a loading flag). These are intentional here, not the
      // cascading-render anti-pattern the rule targets — keep as a warning.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
