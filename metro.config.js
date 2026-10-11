const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Firebase JS SDK ships .cjs entry points.
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = withNativeWind(config, { input: './global.css' });
