const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
  // Retry in CI so a rare headless/runner hiccup doesn't redden the whole run;
  // a genuine failure still fails all attempts. Local runs never retry.
  retries: process.env.CI ? 2 : 0,
  use: { headless: true },
});
