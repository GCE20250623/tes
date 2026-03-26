const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';

module.exports = {
  extends: '@lark-apaas/fullstack-rspack-preset/preset.config.js',
  entry: {
    main: './client/src/index.tsx',
  },
  resolve: {
    tsConfig: {
      configFile: path.resolve(__dirname, './tsconfig.app.json'),
    },
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
    },
  },
  output: {
    filename: '[name].js', // main.js 保持原名
    chunkFilename: 'chunks/[name].[contenthash:8].js', // 动态 chunk 放入 chunks 目录，带 hash
  },
  optimization: isDev
    ? {}
    : {
        splitChunks: {
          chunks: 'async', // 只对动态 import 进行分割
          minSize: 20000, // 最小 20KB 才分割
          cacheGroups: {
            // 将动态 import 的 node_modules 单独打包
            asyncVendors: {
              test: /[\\/]node_modules[\\/]/,
              chunks: 'async',
              name: 'async-vendors',
              priority: 10,
            },
          },
        },
      },
};