const { defineConfig } = require("@vue/cli-service");
const webpack = require("webpack");
const fs = require("fs");

module.exports = defineConfig({
  transpileDependencies: true,

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
        buffer: require.resolve("buffer/"),
        assert: require.resolve("assert/"),
        process: require.resolve("process/browser"),
      },
    },
    plugins: [
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
        process: ["process"],
      }),
    ],
  },
});
