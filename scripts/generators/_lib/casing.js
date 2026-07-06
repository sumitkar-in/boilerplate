#!/usr/bin/env node
// Shared casing helpers used by every generator script — converts a
// developer-typed name (any case: "billing reports", "billingReports",
// "billing-reports") into the kebab/camel/Pascal/Title forms each template
// placeholder needs. No dependencies.

function toKebabCase(input) {
  return input
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function toPascalCase(input) {
  return toKebabCase(input)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toCamelCase(input) {
  const pascal = toPascalCase(input);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toTitleCase(input) {
  return toKebabCase(input)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toSnakeCase(input) {
  return toKebabCase(input).replace(/-/g, '_');
}

module.exports = { toKebabCase, toPascalCase, toCamelCase, toTitleCase, toSnakeCase };
