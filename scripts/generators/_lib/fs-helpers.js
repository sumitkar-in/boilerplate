#!/usr/bin/env node
// Shared filesystem helpers, used by every generator script so file
// creation is logged consistently and never silently overwrites
// hand-edited code.

const fs = require('fs');
const path = require('path');
const { note, fail } = require('./log');

/** Resolves the monorepo root from a generator script's own location: scripts/generators/<file>.js → repo root is two levels up. */
function repoRoot(scriptFilename) {
  return path.resolve(path.dirname(scriptFilename), '..', '..');
}

function mkdir(absPath) {
  fs.mkdirSync(absPath, { recursive: true });
}

/** Writes `content` to `absPath`, logging create/skip. Refuses to overwrite an existing file unless `force` is true. */
function writeFile(absPath, content, { force = false, rootForLog } = {}) {
  const display = rootForLog ? path.relative(rootForLog, absPath) : absPath;
  mkdir(path.dirname(absPath));
  if (fs.existsSync(absPath) && !force) {
    note(`skip   ${display} (already exists)`);
    return false;
  }
  fs.writeFileSync(absPath, content.endsWith('\n') ? content : content + '\n', 'utf8');
  note(`create ${display}`);
  return true;
}

function keepDir(absDirPath, rootForLog) {
  writeFile(path.join(absDirPath, '.gitkeep'), '', { rootForLog });
}

function readTemplate(templatesDir, relPath) {
  const full = path.join(templatesDir, relPath);
  if (!fs.existsSync(full)) {
    fail(`Missing template file: ${full}`);
  }
  return fs.readFileSync(full, 'utf8');
}

module.exports = { repoRoot, mkdir, writeFile, keepDir, readTemplate };
