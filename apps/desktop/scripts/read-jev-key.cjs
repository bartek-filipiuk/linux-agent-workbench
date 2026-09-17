// Private CLI bridge: encrypted settings -> anonymous pipe to the benchmark process.
// Never stdout, command-line arguments, renderer IPC, or a temporary plaintext file.
const { app, safeStorage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
app.setName('@law/desktop');
app.whenReady().then(() => {
  try {
    const settingsFile = process.argv[2];
    if (!settingsFile || !path.isAbsolute(settingsFile)) throw new Error('Invalid settings path');
    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    if (!safeStorage.isEncryptionAvailable() || !settings.jevKeyEncrypted) throw new Error('Key unavailable');
    const key = safeStorage.decryptString(Buffer.from(settings.jevKeyEncrypted, 'base64'));
    if (!key || key.length > 512) throw new Error('Invalid key');
    fs.writeSync(3, key);
    app.exit(0);
  } catch { app.exit(1); }
});
