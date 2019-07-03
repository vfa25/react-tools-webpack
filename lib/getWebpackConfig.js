/**
 * 重点：
 * plugin定制：./utils/CleanUpStatsPlugin
 * babel定制：./getBabelCommonConfig
 */

/* eslint-disable import/order */
const { getProjectPath, resolve, injectRequire } = require('./utils/projectHelper');

injectRequire();

// Show warning for webpack
process.traceDeprecation = true;

// Normal requirement
const path = require('path');
const webpack = require('webpack');
const WebpackBar = require('webpackbar');
const webpackMerge = require('webpack-merge');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// 下面几个不太熟悉，分别是：
// CSS资源优化压缩
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
// 解决团队合作项目中路径问题，如linux系统区分大小写
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
// 定制webpack编译过程中输出的 warning 警告
const FilterWarningsPlugin = require('webpack-filter-warnings-plugin');
const postcssConfig = require('./postcssConfig');
const CleanUpStatsPlugin = require('./utils/CleanUpStatsPlugin');


const svgRegex = /\.svg(\?v=\d+\.\d+\.\d+)?$/;
const svgOptions = {
  limit: 10000,
  minetype: 'image/svg+xml',
}

const imageOptions = {
  limit: 10000,
}

// 参数 modules 定义ES6语法转换规则
function getWebpackConfig(modules, babelPlugins) {
  const pkg = require(getProjectPath('package.json'));
  const babelConfig = require('./getBabelCommonConfig')(modules || false);
  
  // 支持babel plugin定制
  if (babelPlugins) {
    babelPlugins = Array.isArray(babelPlugins) ? babelPlugins : [babelPlugins];
    [].push.apply(babelConfig.plugins, babelPlugins);
  }
  
  // babel import for components
  babelConfig.plugins.push([
    // 该配置即：${pkg.name}/components/${组件名，如button}
    resolve('babel-plugin-import'),
    {
      // camel2DashComponentName默认为true，即驼峰向破折号转义
      style: true,
      libraryName: pkg.name,
      libraryDirectory: 'components',
    },
  ]);
  
  // Other package
  // 若被应用于其他包
  if (pkg.name !== 'enterprise-antd') {
    babelConfig.plugins.push([
      resolve('babel-plugin-import'),
      {
        style: 'css',
        libraryDirectory: 'es',
        libraryName: 'enterprise-antd',
      },
      'other-package-babel-plugin-import',
    ]);
  }

  // modules为false，即ES6不转换。定制babel钩子暂无法理解
  if (modules === false) {
    babelConfig.plugins.push(require.resolve('./replaceLib'));
  }

  // config 中都是常见基本配置
  const config = {
    devtool: 'source-map',

    output: {
      path: getProjectPath('./dist/'),
      filename: '[name].js',
    },

    resolve: {
      // 模块查找路径
      modules: ['node_modules', path.join(__dirname, '../node_modules')],
      // 扩展名查找优先级
      extensions: [
        '.web.tsx',
        '.web.ts',
        '.web.jsx',
        '.web.js',
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.json',
      ],
      alias: {
        [pkg.name]: process.cwd(),
      },
    },

    // 以下每个键就算没有也提供空对象
    node: [
      'child_process',
      'cluster',
      'dgram',
      'dns',
      'fs',
      'module',
      'net',
      'readline',
      'repl',
      'tls',
    ].reduce((acc, name) => Object.assign({}, acc, { [name]: 'empty' }), {}),

    module: {
      noParse: [/moment.js/],
      rules: [
        // rules有个规则就是，loader从后往前，比如css-loader要写在style-loader的后面
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          loader: resolve('babel-loader'),
          options: babelConfig,
        },
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: resolve('babel-loader'),
              options: babelConfig,
            },
            {
              loader: resolve('ts-loader'),
              options: {
                transpileOnly: true,
              },
            },
          ],
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
              },
            },
            {
              // 后处理，比如兼容浏览器样式
              loader: 'postcss-loader',
              options: Object.assign({}, postcssConfig, { sourceMap: true }),
            },
          ],
        },
        {
          test: /\.less$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
              },
            },
            {
              loader: 'postcss-loader',
              options: Object.assign({}, postcssConfig, { sourceMap: true }),
            },
            {
              loader: resolve('less-loader'),
              options: {
                // 支持less的函数模式
                javascriptEnabled: true,
                sourceMap: true,
              },
            },
          ],
        },
        // Images
        {
          test: svgRegex,
          loader: 'url-loader',
          options: svgOptions,
        },
        {
          // url-loader的配置在不满足limit时会会退到 file-loader
          test: /\.(png|jpg|jpeg|gif)(\?v=\d+\.\d+\.\d+)?$/i,
          loader: 'url-loader',
          options: imageOptions,
        },
      ],
    },

    plugins: [
      new CaseSensitivePathsPlugin(),
      // 为每个 chunk 文件头部添加 banner。
      new webpack.BannerPlugin(`
${pkg.name} v${pkg.version}

fork from ant-design (https://github.com/ant-design/ant-design).
      `),
      // 编译进度条
      new WebpackBar({
        name: '🚚  老司机已发车，请稍等...',
        color: '#8A2BE2',
      }),
      new CleanUpStatsPlugin(),
      new FilterWarningsPlugin({
        // suppress conflicting order warnings from mini-css-extract-plugin.
        // ref: https://github.com/ant-design/ant-design/issues/14895
        // see https://github.com/webpack-contrib/mini-css-extract-plugin/issues/250
        exclude: /mini-css-extract-plugin[^]*Conflicting order between:/,
      }),
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
    ],

    performance: {
      hints: false,
    },
  }

  if (process.env.RUN_ENV === 'PRODUCTION') {
    const entry = ['./index'];

    // Common config
    config.externals = {
      react: {
        root: 'React',
        commonjs2: 'react',
        commonjs: 'react',
        amd: 'react',
      },
      'react-dom': {
        root: 'ReactDOM',
        commonjs2: 'react-dom',
        commonjs: 'react-dom',
        amd: 'react-dom',
      },
    };
    config.output.library = pkg.name;
    config.output.libraryTarget = 'umd';
    config.optimization = {
      minimizer: [
        new UglifyJsPlugin({
          cache: true,
          parallel: true,
          sourceMap: true,
          uglifyOptions: {
            warnings: false,
          },
        }),
      ],
    };

    // Development
    const uncompressedConfig = webpackMerge({}, config, {
      entry: {
        [pkg.name]: entry,
      },
      mode: 'development',
    });

    // Production
    const prodConfig = webpackMerge({}, config, {
      entry: {
        [`${pkg.name}.min`]: entry,
      },
      mode: 'production',
      plugins: [
        // 模块串联
        new webpack.optimize.ModuleConcatenationPlugin(),
        new webpack.LoaderOptionsPlugin({
          minimize: true,
        }),
      ],
      optimization: {
        minimizer: [new OptimizeCSSAssetsPlugin({})],
      },
    });
    // 输出数组默认串行
    return [prodConfig, uncompressedConfig];
  }

  return config;
}

getWebpackConfig.webpack = webpack;
getWebpackConfig.svgRegex = svgRegex;
getWebpackConfig.svgOptions = svgOptions;
getWebpackConfig.imageOptions = imageOptions;

module.exports = getWebpackConfig;
