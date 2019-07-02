const fs = require('fs');
const path = require('path');

// 即当前工作目录，即指该工具使用者的 node进程目录
const cwd = process.cwd();

function getProjectPath(...filePath) {
  return path.join(cwd, ...filePath);
}

function resolve(moduleName) {
  return require.resolve(moduleName);
}

// We need hack the require to ensure use package module first
// For example, `typescript` is required by `gulp-typescript` but provided by `antd`
// 该辅助函数用于（先查找自身目录未果后）从工作目录的 node_modules 获取依赖。
// require 为什么会有多参数，因为 amd规范下支持第二个参数传入回调。
// global.injected是因为CommonJs模块是值拷贝，加锁防止重复注册。
let injected = false;
function injectRequire() {
  if (injected) return;

  const Module = require('module');

  const oriRequire = Module.prototype.require;
  Module.prototype.require = function(...args) {
    const moduleName = args[0];
    try {
      return oriRequire.apply(this, args);
    } catch(err) {
      const newArgs = [...args];
      if (moduleName[0] !== '/') {
        newArgs[0] = getProjectPath('node_modules', moduleName);
      }
      return oriRequire.apply(this, newArgs);
    }
  };

  injected = true;
}

// 检查路径存在则加载配置项
function getConfig() {
  const configPath = getProjectPath('.bubai.config.js');
  if (fs.existsSync(configPath)) {
    return require(configPath);
  }
  return {};
}

module.exports = {
  getProjectPath,
  resolve,
  injected,
  injectRequire,
  getConfig,
}
