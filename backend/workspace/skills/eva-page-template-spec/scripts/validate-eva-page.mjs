#!/usr/bin/env node

import fs from 'node:fs';
import vm from 'node:vm';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node validate-eva-page.mjs <assembled-html>');
  process.exit(2);
}

const source = fs.readFileSync(file, 'utf8');
const errors = [];

if (!/^<!doctype html>/i.test(source.trimStart())) errors.push('Missing <!DOCTYPE html>');
if (source.includes('{{INSTANCE_ID}}')) errors.push('Unresolved {{INSTANCE_ID}} placeholder');
if (source.includes('{api-mode:')) errors.push('Unresolved API mode placeholder');
if (/\{(?:title|theme-color|page-title)[^}]*\}/i.test(source)) errors.push('Unresolved page metadata placeholder');
if (/data-fill-target=["']data-field:/.test(source)) errors.push('Visual assets must not target business dataFields');
if (!/window\.__EVA_API_MODE__\s*=\s*['"](preview|production)['"]/.test(source)) {
  errors.push('window.__EVA_API_MODE__ must be preview or production');
}
if (source.includes('USE_REAL_API')) errors.push('Fragments must use window.__EVA_API_MODE__');
if (/Math\.random\(\)\s*</.test(source)) errors.push('Random mock failures are forbidden');

const roots = [];
for (const match of source.matchAll(/<([a-z][\w-]*)\b([^>]*\bdata-eva=["'][^"']+["'][^>]*)>/gi)) {
  const attrs = match[2];
  const component = /\bdata-eva=["']([^"']+)["']/.exec(attrs)?.[1];
  const mode = /\bdata-mode=["']([^"']+)["']/.exec(attrs)?.[1];
  const instance = /\bdata-instance=["']([^"']+)["']/.exec(attrs)?.[1];
  if (!mode) errors.push(`${component}: missing data-mode`);
  if (instance == null || instance === '') errors.push(`${component}/${mode || '?'}: missing data-instance`);
  const baseline = /\bdata-ui-baseline=["']source-default["']/.test(attrs);
  const visual = /\bdata-eva-visual=["'](?:locked|style-only|layout|free-decoration)["']/.test(attrs);
  if (!baseline) errors.push(`${component}/${mode || '?'}: missing source-default UI baseline`);
  if (!visual) errors.push(`${component}/${mode || '?'}: missing or invalid data-eva-visual permission`);
  if (component && mode) roots.push({ component, mode, instance });
}

const seenInstances = new Set();
for (const { component, instance } of roots) {
  const key = `${component}_${instance}`;
  if (seenInstances.has(key)) errors.push(`Duplicate component instance: ${key}`);
  seenInstances.add(key);
}

for (const { component, mode } of roots) {
  const selector = `[data-eva="${component}"][data-mode="${mode}"]`;
  if (!source.includes(selector)) {
    errors.push(`${component}/${mode}: no matching mode-specific selector`);
  }
}

for (const component of new Set(roots.map(root => root.component))) {
  let unscopedRemainder = source;
  for (const { mode } of roots.filter(root => root.component === component)) {
    const selector = `[data-eva="${component}"][data-mode="${mode}"]`;
    unscopedRemainder = unscopedRemainder.split(selector).join('');
  }
  if (unscopedRemainder.includes(`[data-eva="${component}"]`)) {
    errors.push(`${component}: found selector without data-mode scope`);
  }
}

const seenStyles = new Set();
for (const match of source.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)) {
  const normalized = match[1].trim();
  if (!normalized) continue;
  if (seenStyles.has(normalized)) errors.push('Duplicate identical <style> block');
  seenStyles.add(normalized);
}

for (const match of source.matchAll(/<script(?![^>]*\bsrc=)(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
  if (!match[1].trim()) continue;
  try {
    new vm.Script(match[1], { filename: file });
  } catch (error) {
    errors.push(`Invalid inline JavaScript: ${error.message}`);
  }
}

if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Eva page is valid: ${file}`);
