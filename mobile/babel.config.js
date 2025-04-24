module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@api': './app/api',
            '@components': './app/components',
            '@hooks': './app/hooks',
            '@screens': './app/screens',
            '@assets': './app/assets',
          },
        },
      ],
    ],
  };
};