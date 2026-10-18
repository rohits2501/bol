/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'keyboard',
  name: 'BolKeyboard',
  displayName: 'Bol',
  bundleIdentifier: '.keyboard',
  deploymentTarget: '16.4',
  entitlements: {
    'com.apple.security.application-groups':
      config.ios?.entitlements?.['com.apple.security.application-groups'],
  },
});
