import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const targetVersion = process.argv[2];

if (!targetVersion) {
  console.error('Uso: pnpm run bump <version> (ej: pnpm run bump 0.2.2)');
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(targetVersion)) {
  console.error(`Error: Formato de versión inválido "${targetVersion}". Debe ser formato SemVer (ej: 0.2.2).`);
  process.exit(1);
}

// 1. Actualizar app.json
const appJsonPath = path.join(root, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
const currentVersion = appJson.expo.version;
const currentCode = appJson.expo.android?.versionCode ?? 1;
const nextCode = currentCode + 1;

appJson.expo.version = targetVersion;
if (appJson.expo.android) {
  appJson.expo.android.versionCode = nextCode;
}
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf-8');
console.log(`✓ app.json: versión ${currentVersion} → ${targetVersion} (versionCode: ${currentCode} → ${nextCode})`);

// 2. Actualizar package.json
const pkgJsonPath = path.join(root, 'package.json');
const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
pkgJson.version = targetVersion;
fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n', 'utf-8');
console.log(`✓ package.json: versión → ${targetVersion}`);

// 3. Actualizar .env
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf-8');
  if (envContent.includes('EXPO_PUBLIC_APP_VERSION=')) {
    envContent = envContent.replace(/^EXPO_PUBLIC_APP_VERSION=.*$/m, `EXPO_PUBLIC_APP_VERSION=${targetVersion}`);
    fs.writeFileSync(envPath, envContent, 'utf-8');
    console.log(`✓ .env: EXPO_PUBLIC_APP_VERSION → ${targetVersion}`);
  }
}

console.log(`\n🎉 Sincronización completada con éxito en los 3 archivos a la versión ${targetVersion}.`);
