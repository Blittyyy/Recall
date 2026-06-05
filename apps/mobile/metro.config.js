const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@': path.resolve(__dirname, 'src'),
};

// @tanstack/* "modern" builds ship native `#private` fields that Hermes in Expo Go
// cannot parse. Force the pre-transpiled legacy builds instead.
const tanstackLegacyPackages = ['@tanstack/query-core', '@tanstack/react-query'];
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const pkg of tanstackLegacyPackages) {
    if (moduleName === pkg || moduleName.startsWith(`${pkg}/`)) {
      const pkgRoot = path.dirname(require.resolve(`${pkg}/package.json`));
      const subpath =
        moduleName === pkg ? 'index' : moduleName.slice(pkg.length + 1);
      const legacyPath = path.join(pkgRoot, 'build', 'legacy', `${subpath}.js`);

      if (fs.existsSync(legacyPath)) {
        return { type: 'sourceFile', filePath: legacyPath };
      }
    }
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
