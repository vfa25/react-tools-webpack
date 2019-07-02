/**
 * 仅简单介绍下各配置项功用，几个相近的插件如下：
 * babel-loader：负责es6语法的转化，如箭头函数。
 * babel-polyfill：es6内置方法和函数转化垫片（shim），如Map、Set、Promise等。
 * babel-preset-env：含es6,7等版本的语法转化规则，取代了之前的preset-es2015等，但它是比较松散的，
 *  若需要Broswer和Node端不同处理，需要配置env（和preset同级），以target区别不同环境，
 *  另外，如果需要编译一些提案语法，需要babel-preset-stage-1等，具体可查看官网。
 * babel-plugin-transform-runtime：避免polyfill污染全局变量。
 */

const { resolve } = require('./utils/projectHelper');

module.exports = function(modules) {
  const plugins = [
    // import(uri:...)语法
    resolve('babel-plugin-inline-import-data-uri'),
    resolve('@babel/plugin-transform-member-expression-literals'),
    resolve('@babel/plugin-transform-object-assign'),
    resolve('@babel/plugin-transform-property-literals'),
    [
      resolve('@babel/plugin-transform-runtime'),
      {
        helpers: false,
      },
    ],
    resolve('@babel/plugin-transform-spread'),
    resolve('@babel/plugin-transform-template-literals'),
    resolve('@babel/plugin-proposal-export-default-from'),
    resolve('@babel/plugin-proposal-export-namespace-from'),
    resolve('@babel/plugin-proposal-object-rest-spread'),
    [
      // @类装饰器语法
      resolve('@babel/plugin-proposal-decorators'),
      {
        legacy: true,
      },
    ],
    resolve('@babel/plugin-proposal-class-properties'),
  ];
  return {
    presets: [
      resolve('@babel/preset-typescript'),
      resolve('@babel/preset-react'),
      [
        // 测试发现babel-loader v8不配置也能实现treeShake
        // 但 v7 却要显式配置  { "modules": false, "loose": true}
        // 即 “esModule不提前被babel处理” 以及 “开启 处理es6的 class类 的loose松散模式”。
        // treeShake基于esModule，确保 @babel/preset-env 编译器未将ES2015模块语法转换，
        // 百度外卖前端有篇文章介绍treeShake：https://juejin.im/post/5a4dc842518825698e7279a9
        resolve('@babel/preset-env'),
        {
          modules,
          targets: {
            browsers: [
              'last 2 versions',
              'Firefox ESR',
              '> 1%',
              'ie >= 9',
              'iOS >= 8',
              'Android >= 4',
            ],
          },
        },
      ],
    ],
    plugins,
  };
};
