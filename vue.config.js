// vue.config.js
const { defineConfig } = require("@vue/cli-service");
const webpack = require("webpack"); // ← нужен для ProvidePlugin

module.exports = defineConfig({
  transpileDependencies: true,

  // ⬇️  всё, что касается полифиллов
  configureWebpack: {
    resolve: {
      fallback: {
        buffer: require.resolve("buffer/"), // «browser buffer»
        assert: require.resolve("assert/"),
        process: require.resolve("process/browser"),
      },
    },
    plugins: [
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"], // global Buffer
        process: ["process"], // global process (если понадобится)
      }),
    ],
  },
});
