#!/usr/bin/env node
// Shared logging helpers, styled to match init-repo.sh / init-repo-structure.js
// so every generator's output looks and reads the same way.

const log = (msg) => console.log(`\n\x1b[1;36m▶ ${msg}\x1b[0m`);
const ok = (msg) => console.log(`  \x1b[1;32m✔ ${msg}\x1b[0m`);
const note = (msg) => console.log(`  \x1b[2m${msg}\x1b[0m`);
const warn = (msg) => console.log(`  \x1b[1;33m⚠ ${msg}\x1b[0m`);

function fail(msg) {
  console.error(`\n\x1b[1;31m✘ ${msg}\x1b[0m`);
  process.exit(1);
}

module.exports = { log, ok, note, warn, fail };
