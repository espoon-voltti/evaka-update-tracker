import * as fs from 'fs';
import * as path from 'path';

function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function deploySite(
  siteDir: string,
  dataDir: string,
  distDir: string
): void {
  // Clean and recreate dist
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // Copy site/ → dist/
  copyDirSync(siteDir, distDir);

  // Copy data/ → dist/data/
  const distDataDir = path.join(distDir, 'data');
  if (fs.existsSync(dataDir)) {
    copyDirSync(dataDir, distDataDir);
  }
}
