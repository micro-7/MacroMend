const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Signs the release build with the upload key when the Gradle properties MACROMEND_UPLOAD_STORE_FILE,
 * MACROMEND_UPLOAD_STORE_PASSWORD, MACROMEND_UPLOAD_KEY_ALIAS and MACROMEND_UPLOAD_KEY_PASSWORD are given
 * (the release workflow passes them). Without them the release build keeps the debug key, so the test APK
 * workflow works exactly as before.
 */
const MARKER = '// MacroMend release signing';

function applyReleaseSigning(contents) {
  if (contents.includes(MARKER)) return contents;

  const signing = `
        ${MARKER}
        if (findProperty('MACROMEND_UPLOAD_STORE_FILE')) {
            release {
                storeFile file(findProperty('MACROMEND_UPLOAD_STORE_FILE'))
                storePassword findProperty('MACROMEND_UPLOAD_STORE_PASSWORD')
                keyAlias findProperty('MACROMEND_UPLOAD_KEY_ALIAS')
                keyPassword findProperty('MACROMEND_UPLOAD_KEY_PASSWORD')
            }
        }`;
  // Add the release signing config right after the debug one.
  const withConfig = contents.replace(/(signingConfigs \{\s*debug \{[^}]*\})/, `$1${signing}`);
  if (withConfig === contents) throw new Error('withReleaseSigning: could not find signingConfigs in app/build.gradle');

  // Use it for the release build when it exists, otherwise stay on the debug key.
  const withBuildType = withConfig.replace(
    /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
    `$1signingConfig findProperty('MACROMEND_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`,
  );
  if (withBuildType === withConfig) throw new Error('withReleaseSigning: could not find the release build type');
  return withBuildType;
}

module.exports = (config) =>
  withAppBuildGradle(config, (c) => {
    c.modResults.contents = applyReleaseSigning(c.modResults.contents);
    return c;
  });

module.exports.applyReleaseSigning = applyReleaseSigning;
