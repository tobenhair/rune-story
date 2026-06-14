const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({ testDir: './tests', fullyParallel: true, reporter: 'list', use: { headless: true } });
