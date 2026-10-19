module.exports = {
  apps: [
    {
      name: "adalokanta",
      script: "./server.js",
      env: {
        NODE_ENV: "production",
        PORT: 8080
      }
    }
  ]
};
