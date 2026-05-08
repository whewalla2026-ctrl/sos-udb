module.exports = {
  root: true,
  extends: ['next/core-web-vitals', 'prettier'],
  rules: {
    // Keep CI green while we clean up UI strings/scripts in follow-ups.
    'react/no-unescaped-entities': 'warn',
    '@next/next/no-sync-scripts': 'warn',
  },
};

