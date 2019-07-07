const less = require('less');
const { readFileSync } = require('fs');
const path = require('path');
const postcss = require('postcss');
const NpmImportPlugin = require('less-plugin-npm-import');
const postcssConfig = require('./postcssConfig');

function transformLess(lessFile, config = {}) {
  const { cwd = process.cwd() } = config;
  const resolvedLessFile = path.resolve(cwd, lessFile);

  let data = readFileSync(resolvedLessFile, 'utf-8');
  // .txt文本打开会默认转格式，头部信息会多这么一个东西
  data = data.replace(/^\uFEFF/, '');

  // Do less compile
  const lessOpts = {
    path: [path.dirname(resolvedLessFile)],
    filename: resolvedLessFile,
    plugins: [new NpmImportPlugin({ prefix: '~'} )],
    javascriptEnabled: true,
  };
  return less
    .render(data, lessOpts)
    .then(result => postcss(postcssConfig.plugins).process(result.css, { from: undefined }))
    .then(r => r.css);
}

module.exports = transformLess;
