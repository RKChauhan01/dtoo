/**
 * @type {import('electron-builder').Configuration}
 */
const config = {
  appId: 'com.webrtc.fileshare',
  productName: 'WebRTC File Share',
  directories: {
    output: 'release/${version}'
  },
  files: [
    'dist',
    'dist-electron'
  ],
  mac: {
    artifactName: '${productName}_${version}.${ext}',
    target: [
      {
        target: 'default',
        arch: ['arm64', 'x64']
      }
    ]
  },
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    artifactName: '${productName}_${version}.${ext}'
  },
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      }
    ],
    artifactName: '${productName}_${version}.${ext}'
  }
};

export default config;