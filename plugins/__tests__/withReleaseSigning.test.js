const { applyReleaseSigning } = require('../withReleaseSigning');
const fs = require('fs');
const path = require('path');

const SAMPLE = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            minifyEnabled false
        }
    }
}
`;

describe('withReleaseSigning', () => {
  it('adds a release signing config that is only used when the upload key properties are given', () => {
    const out = applyReleaseSigning(SAMPLE);
    expect(out).toContain("findProperty('MACROMEND_UPLOAD_STORE_FILE')");
    expect(out).toContain("signingConfig findProperty('MACROMEND_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug");
    // the debug build type keeps the debug key
    expect(out).toMatch(/debug \{\s*signingConfig signingConfigs\.debug/);
  });

  it('is safe to apply twice', () => {
    const once = applyReleaseSigning(SAMPLE);
    expect(applyReleaseSigning(once)).toBe(once);
  });

  it('fails loudly when the Gradle file looks different', () => {
    expect(() => applyReleaseSigning('android { }')).toThrow(/signingConfigs/);
  });

  it('keeps the plugin registered in app.json', () => {
    const app = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'app.json'), 'utf8'));
    expect(app.expo.plugins).toContain('./plugins/withReleaseSigning');
  });
});
