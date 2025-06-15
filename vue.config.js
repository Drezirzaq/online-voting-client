// vue.config.js
const { defineConfig } = require("@vue/cli-service");
const webpack = require("webpack"); // ← нужен для ProvidePlugin
const fs = require("fs");

module.exports = defineConfig({
  transpileDependencies: true,

  // ⬇️  всё, что касается полифиллов
  configureWebpack: {
    devServer: {
      https: {
        key: fs.readFileSync("./192.168.1.87-key.pem"),
        cert: fs.readFileSync("./192.168.1.87.pem"),
      },
      host: "192.168.1.87",
      port: 8080,
    },
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
