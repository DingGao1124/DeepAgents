#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const file = process.argv[2];

if (!file) {
  console.error("Usage: validate-html.mjs <page.html>");
  process.exit(2);
}

if (path.extname(file).toLowerCase() !== ".html") {
  console.error("The page must use the .html extension.");
  process.exit(2);
}

let html;
try {
  html = await readFile(file, "utf8");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

const errors = [];
const requirePattern = (pattern, message) => {
  if (!pattern.test(html)) errors.push(message);
};

requirePattern(/^\s*<!doctype html>/i, "Missing <!doctype html>.");
requirePattern(/<html\b[^>]*\blang=["'][^"']+["']/i, "The html element must declare a language.");
requirePattern(/<meta\b[^>]*charset=["']?utf-8/i, "Missing UTF-8 charset metadata.");
requirePattern(/<meta\b[^>]*name=["']viewport["']/i, "Missing viewport metadata.");
requirePattern(/<title>\s*[^<]+\s*<\/title>/i, "Missing a non-empty page title.");
requirePattern(/<body\b/i, "Missing body element.");
requirePattern(/<main\b/i, "Missing main landmark.");
requirePattern(/<h1\b/i, "Missing primary h1 heading.");

if (/\{\{[^}]+\}\}|__PLACEHOLDER__|TODO:/i.test(html)) {
  errors.push("Unresolved placeholder or TODO marker found.");
}
if (/\b(?:href|src)\s*=\s*["']\s*javascript:/i.test(html)) {
  errors.push("javascript: URLs are not allowed.");
}
if (/\son[a-z]+\s*=/i.test(html)) {
  errors.push("Inline event-handler attributes are not allowed; use addEventListener.");
}
if (/<iframe\b/i.test(html)) {
  errors.push("iframes are not allowed in generated pages.");
}
if (/(?:file:\/\/|(?:href|src)\s*=\s*["']\s*\/(?:Users|home|private|tmp)\/)/i.test(html)) {
  errors.push("Local absolute file paths are not allowed.");
}
if (/<script\b[^>]*\bsrc\s*=/i.test(html)) {
  errors.push("External scripts are not allowed in a self-contained page.");
}
if (/<img\b(?![^>]*\balt=)[^>]*>/i.test(html)) {
  errors.push("Every image must declare an alt attribute.");
}

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HTML validation passed.");
