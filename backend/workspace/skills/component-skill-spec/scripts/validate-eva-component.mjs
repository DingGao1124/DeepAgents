#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const componentDir = process.argv[2];

if (!componentDir) {
  console.error('Usage: node validate-eva-component.mjs <component-skill-directory>');
  process.exit(2);
}

const absoluteDir = path.resolve(componentDir);
const errors = [];
const VISUAL_FIELD_KEYS = new Set([
  'width',
  'height',
  'size',
  'objectfit',
  'color',
  'fontsize',
  'lineheight',
  'margin',
  'padding',
  'borderradius',
  'shadow',
  'boxshadow',
  'styles',
]);

function read(relativePath) {
  const file = path.join(absoluteDir, relativePath);
  if (!fs.existsSync(file)) {
    errors.push(`Missing file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function parseJson(relativePath) {
  const source = read(relativePath);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (error) {
    errors.push(`Invalid JSON in ${relativePath}: ${error.message}`);
    return null;
  }
}

function validateDataFields(meta) {
  for (const field of meta.dataFields || []) {
    if (!field.key || !field.type) {
      errors.push('Every dataFields item must include key and type');
    }
    if (field.required && field.requiredForModes?.length) {
      errors.push(`${field.key}: use required or requiredForModes, not both`);
    }
    for (const mode of field.requiredForModes || []) {
      if (!(meta.modes || []).some(item => item.id === mode)) {
        errors.push(`${field.key}: unknown requiredForModes entry ${mode}`);
      }
    }
    for (const mode of field.availableForModes || []) {
      if (!(meta.modes || []).some(item => item.id === mode)) {
        errors.push(`${field.key}: unknown availableForModes entry ${mode}`);
      }
    }
    if (field.requiredForModes?.some(mode =>
      field.availableForModes?.length && !field.availableForModes.includes(mode))) {
      errors.push(`${field.key}: requiredForModes must be a subset of availableForModes when both are present`);
    }
    if ((field.type === 'object' || field.type === 'object[]') &&
        (!field.items || typeof field.items !== 'object')) {
      errors.push(`${field.key}: ${field.type} requires an items schema`);
    }
    if (meta.schemaVersion === 2) {
      if (!['business-data', 'business-asset'].includes(field.kind)) {
        errors.push(`${field.key}: schemaVersion 2 requires kind business-data or business-asset`);
      }
      if (typeof field.sourceProp !== 'string' || !field.sourceProp.trim()) {
        errors.push(`${field.key}: schemaVersion 2 requires a non-empty sourceProp`);
      }
      const normalizedKey = String(field.key || '').replace(/[-_]/g, '').toLowerCase();
      if (VISUAL_FIELD_KEYS.has(normalizedKey)) {
        errors.push(`${field.key}: visual/layout fields must be sourceDefaults, not operator dataFields`);
      }
    }
  }
}

function validateEvents(meta) {
  for (const event of meta.crossComponentEvents || []) {
    if (!['emit', 'listen'].includes(event.direction)) {
      errors.push(`${event.event || 'event'}: invalid direction`);
    }
    if (event.transport !== 'eva-event-bus') {
      errors.push(`${event.event || 'event'}: transport must be eva-event-bus`);
    }
  }
}

function validateFragment(meta, mode) {
  const relativePath = path.join('references', mode.fragment);
  const source = read(relativePath);
  if (!source) return;

  const rootPattern = new RegExp(
    `data-eva=["']${meta.componentDir}["'][^>]*data-mode=["']${mode.id}["'][^>]*data-instance=["']\\{\\{INSTANCE_ID\\}\\}["']`
  );
  if (!rootPattern.test(source)) {
    errors.push(`${relativePath}: root must include matching data-eva, data-mode, and INSTANCE_ID`);
  }
  if (meta.schemaVersion === 2 &&
      !/data-ui-baseline=["']source-default["']/.test(source)) {
    errors.push(`${relativePath}: schemaVersion 2 requires data-ui-baseline="source-default"`);
  }
  if (meta.schemaVersion === 2 && !/data-eva-visual=["']/.test(source)) {
    errors.push(`${relativePath}: schemaVersion 2 requires explicit data-eva-visual permissions`);
  }
  if (meta.schemaVersion === 2 && /data-fill-target=["']data-field:/.test(source)) {
    errors.push(`${relativePath}: schemaVersion 2 visual assets must not be written to business dataFields`);
  }
  if (meta.schemaVersion === 2 && /querySelector(?:All)?\(\s*["']\./.test(source)) {
    errors.push(`${relativePath}: business JavaScript must use stable data-eva hooks, not visual class selectors`);
  }

  const visualPermissions = new Set(['locked', 'style-only', 'layout', 'free-decoration']);
  for (const match of source.matchAll(/data-eva-visual=["']([^"']+)["']/g)) {
    if (!visualPermissions.has(match[1])) {
      errors.push(`${relativePath}: invalid data-eva-visual permission ${match[1]}`);
    }
  }

  const selector = `[data-eva="${meta.componentDir}"][data-mode="${mode.id}"]`;
  if (!source.includes(`document.querySelectorAll('${selector}')`) &&
      !source.includes(`document.querySelectorAll("${selector}")`)) {
    errors.push(`${relativePath}: initializer must select only ${selector}`);
  }

  if (!source.includes('dataset.evaInitialized')) {
    errors.push(`${relativePath}: missing dataset.evaInitialized guard`);
  }
  if (source.includes('dataset.initialized')) {
    errors.push(`${relativePath}: use the namespaced evaInitialized marker`);
  }
  if (/\.innerHTML\s*=\s*`/.test(source)) {
    errors.push(`${relativePath}: template-literal innerHTML assignment is forbidden`);
  }
  if (/Math\.random\(\)\s*</.test(source)) {
    errors.push(`${relativePath}: random mock failures are forbidden`);
  }
  if (source.includes('USE_REAL_API')) {
    errors.push(`${relativePath}: read window.__EVA_API_MODE__ instead of USE_REAL_API`);
  }
  if (/if\s*\(\s*!window\.Bili[A-Za-z0-9]*Utils\s*\)/.test(source)) {
    errors.push(`${relativePath}: do not initialize a Utils namespace atomically; initialize the component namespace first and guard every method`);
  }
  if (/\b(?:const|let|var)\s+API_MODE\b/.test(source) &&
      !/\b(?:fetcher|realFetch|mockFetch|adapter)\b/.test(source)) {
    errors.push(`${relativePath}: API_MODE is unused; omit API scaffolding for components without runtime APIs`);
  }

  for (const match of source.matchAll(/data-fill-color-var=["'](--[a-z0-9-]+)["']/gi)) {
    const variable = match[1];
    if (!source.includes(`var(${variable}`)) {
      errors.push(`${relativePath}: ${variable} is declared as a fill target but never used with var()`);
    }
  }

  for (const match of source.matchAll(/data-fill-target=["']data-field:([a-zA-Z0-9_-]+)["']/g)) {
    const key = match[1];
    const knownKeys = new Set([
      ...(meta.dataFields || []).map(field => field.key),
      ...Object.keys(meta.defaultValues || {}),
    ]);
    if (!knownKeys.has(key)) {
      errors.push(`${relativePath}: data-fill-target references unknown configuration field ${key}`);
    }
  }
  const unscopedRemainder = source.split(selector).join('');
  if (unscopedRemainder.includes(`[data-eva="${meta.componentDir}"]`)) {
    errors.push(`${relativePath}: CSS/JS selectors must include the matching data-mode`);
  }

  for (const match of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
    if (!match[1].trim()) continue;
    try {
      new vm.Script(match[1], { filename: relativePath });
    } catch (error) {
      errors.push(`${relativePath}: invalid inline JavaScript: ${error.message}`);
    }
  }
}

const meta = parseJson('references/meta.json');
const skillSource = read('SKILL.md');
const openaiSource = read('agents/openai.yaml');
const referenceSource = read('references/reference.md');

const unresolvedPlaceholder = /\{(?:componentName|component-name|ComponentName|ComponentLabel|componentDir|modeN|N|label)\}/;
for (const [relativePath, source] of [
  ['SKILL.md', skillSource],
  ['agents/openai.yaml', openaiSource],
  ['references/reference.md', referenceSource],
]) {
  if (unresolvedPlaceholder.test(source)) {
    errors.push(`${relativePath}: contains an unresolved generation placeholder`);
  }
}

if (meta) {
  if (path.basename(absoluteDir) !== meta.componentDir) {
    errors.push('meta.componentDir must match the skill directory name');
  }
  if (!Array.isArray(meta.modes) || meta.modes.length === 0) {
    errors.push('meta.modes must contain at least one mode');
  }
  if (meta.schemaVersion !== 2) {
    errors.push('schemaVersion must be 2; legacy or missing schemas are not supported');
  } else {
    if (!meta.sourceDefaults || typeof meta.sourceDefaults !== 'object' ||
        Array.isArray(meta.sourceDefaults)) {
      errors.push('schemaVersion 2 requires sourceDefaults object');
    }
    if (!meta.previewData || typeof meta.previewData !== 'object' ||
        Array.isArray(meta.previewData)) {
      errors.push('schemaVersion 2 requires previewData object');
    }
    for (const mode of meta.modes || []) {
      if (!meta.sourceDefaults?.[mode.id] ||
          typeof meta.sourceDefaults[mode.id] !== 'object' ||
          Array.isArray(meta.sourceDefaults[mode.id])) {
        errors.push(`sourceDefaults requires an object for ${mode.id}`);
      }
      if (!meta.previewData?.[mode.id] ||
          typeof meta.previewData[mode.id] !== 'object' ||
          Array.isArray(meta.previewData[mode.id])) {
        errors.push(`previewData requires an object for ${mode.id}`);
      }
    }
    if ('defaultValues' in meta) {
      errors.push('schemaVersion 2 uses sourceDefaults and previewData; remove ambiguous defaultValues');
    }
  }
  validateDataFields(meta);
  validateEvents(meta);
  for (const mode of meta.modes || []) validateFragment(meta, mode);
}

if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Eva component skill is valid: ${absoluteDir}`);
