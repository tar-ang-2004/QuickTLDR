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

// Remove src folder
const srcDir = join(distDir, 'src');
if (existsSync(srcDir)) {
  rmSync(srcDir, { recursive: true, force: true });
}

// Fix paths in popup.html (remove leading slashes)
if (existsSync(popupHtmlDest)) {
  let html = readFileSync(popupHtmlDest, 'utf-8');
  html = html.replace(/src="\/popup\.js"/g, 'src="popup.js"');
  html = html.replace(/href="\/assets\//g, 'href="assets/');
  writeFileSync(popupHtmlDest, html);
}

console.log('✓ Post-build complete: popup.html moved to dist root and paths fixed');
