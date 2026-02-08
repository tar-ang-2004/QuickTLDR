import { readFileSync, writeFileSync, renameSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const distDir = 'dist';
const srcPopupDir = join(distDir, 'src', 'popup');
const popupHtmlSrc = join(srcPopupDir, 'popup.html');
const popupHtmlDest = join(distDir, 'popup.html');

// Move popup.html to dist root
if (existsSync(popupHtmlSrc)) {
  renameSync(popupHtmlSrc, popupHtmlDest);
}

// Move privacy.html (if emitted under public/) to dist root
const privacySrc = join(distDir, 'public', 'privacy.html');
const privacyDest = join(distDir, 'privacy.html');
if (existsSync(privacySrc)) {
  renameSync(privacySrc, privacyDest);
}

// Remove public folder from dist if it exists (we moved files to root)
const publicDir = join(distDir, 'public');
if (existsSync(publicDir)) {
  rmSync(publicDir, { recursive: true, force: true });
}

// Remove src folder
const srcDir = join(distDir, 'src');
if (existsSync(srcDir)) {
  rmSync(srcDir, { recursive: true, force: true });
}

// Fix paths in popup.html (remove leading slashes and fix relative paths)
if (existsSync(popupHtmlDest)) {
  let html = readFileSync(popupHtmlDest, 'utf-8');
  // Fix script src
  html = html.replace(/src="\.\.\/\.\.\/popup\.js"/g, 'src="popup.js"');
  html = html.replace(/src="\/popup\.js"/g, 'src="popup.js"');
  // Fix CSS href
  html = html.replace(/href="\.\.\/\.\.\/assets\//g, 'href="assets/');
  html = html.replace(/href="\/assets\//g, 'href="assets/');
  writeFileSync(popupHtmlDest, html);
}

if (existsSync(privacyDest)) {
  console.log('✓ Post-build complete: popup.html and privacy.html moved to dist root and paths fixed');
} else {
  console.log('✓ Post-build complete: popup.html moved to dist root and paths fixed');
}
