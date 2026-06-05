const fs = require('fs');
const path = require('path');

const duplicatePaths = [
  'node_modules/@teovilla/react-native-web-maps/node_modules/expo-location',
  'node_modules/react-native-calendars/node_modules/react-native-safe-area-context',
];

for (const relativePath of duplicatePaths) {
  const absolutePath = path.join(process.cwd(), relativePath);

  if (!fs.existsSync(absolutePath)) {
    console.log(`[prune-native-duplicates] skipped missing ${relativePath}`);
    continue;
  }

  fs.rmSync(absolutePath, { recursive: true, force: true });
  console.log(`[prune-native-duplicates] removed ${relativePath}`);
}
