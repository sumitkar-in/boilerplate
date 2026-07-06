#!/usr/bin/env node
// Minimal --key=value / --flag CLI argument parser, shared by every
// generator script. No dependencies.

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    const match = /^--([^=]+)(?:=(.*))?$/.exec(raw);
    if (!match) continue;
    const [, key, value] = match;
    args[key] = value === undefined ? true : value;
  }
  return args;
}

module.exports = { parseArgs };
