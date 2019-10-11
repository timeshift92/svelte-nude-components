const purgecss = require("@fullhuman/postcss-purgecss")({
    content: ["./public/**/*.html", "./src/**/*.svelte"],
    keyframes: true,
    defaultExtractor: content => content.match(/[A-Za-z0-9-_:/%]+/g) || []
  });
  const mode = process.env.NODE_ENV;
  const dev = mode === 'development';
  
  module.exports = {
    extract: './static/global.css',
    plugins: [
      require("postcss-import"),
      require("tailwindcss")("./tailwind.config.js"),
      // require("tailwindcss"),
      require("autoprefixer"),
      ...!dev ? [purgecss, require("cssnano")({
        discardComments: {
          removeAll: true
        }
      })] : []
    ]
  };
  