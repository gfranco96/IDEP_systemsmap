// Writes docs/qr-code.svg and docs/qr-code.png pointing at the deployed interactive map.
import QRCode from 'qrcode';
const URL = 'https://gfranco96.github.io/IDEP_systemsmap/';
await QRCode.toFile('docs/qr-code.png', URL, { width: 1024, margin: 4, errorCorrectionLevel: 'M' });
await QRCode.toFile('docs/qr-code.svg', URL, { type: 'svg', margin: 4, errorCorrectionLevel: 'M' });
console.log('wrote docs/qr-code.png and docs/qr-code.svg →', URL);
