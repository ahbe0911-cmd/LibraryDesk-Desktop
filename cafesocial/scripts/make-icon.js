const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

(async () => {
  const root = path.resolve(__dirname, '..');
  const source = path.join(root, 'build', 'icon.svg');
  const output = path.join(root, 'build', 'icon.png');
  await sharp(source)
    .resize(512, 512, { fit: 'contain' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(output);
  console.log('CafeSocial icon ready:', output);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
