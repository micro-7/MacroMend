import type { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Wraps app.json. The Android versionCode must go up with every build Play receives, so CI passes its run
 * number (ANDROID_VERSION_CODE); on a laptop it stays 1.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const parsed = Number.parseInt(process.env.ANDROID_VERSION_CODE ?? '', 10);
  const versionCode = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  return {
    ...(config as ExpoConfig),
    name: config.name ?? 'MacroMend',
    slug: config.slug ?? 'macromend',
    version: '1.0.0',
    android: { ...config.android, versionCode },
    extra: { ...config.extra, buildNumber: versionCode },
  };
};
