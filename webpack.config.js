const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CompressionPlugin = require('compression-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');
const WorkboxPlugin = require('workbox-webpack-plugin');

// Configuración dinámica según el entorno
const isDevelopment = process.env.NODE_ENV !== 'production';
const isAnalyze = process.env.ANALYZE === 'true';

module.exports = {
  // Modo de construcción
  mode: isDevelopment ? 'development' : 'production',
  
  // Punto de entrada con soporte para múltiples entradas
  entry: {
    main: './src/index.js',
    vendor: './src/vendor.js', // Para librerías de terceros
    // admin: './src/admin/index.js', // Ejemplo de múltiples entradas
  },
  
  // Configuración de salida optimizada
  output: {
    filename: isDevelopment 
      ? '[name].js' 
      : '[name].[contenthash:8].js',
    chunkFilename: isDevelopment 
      ? '[name].chunk.js' 
      : '[name].[contenthash:8].chunk.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    clean: true, // Limpia automáticamente el directorio dist
  },
  
  // Configuración de resolución mejorada
  resolve: {
    // Extensiones que se resuelven automáticamente
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.scss'],
    
    // Aliases para imports más limpios
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@styles': path.resolve(__dirname, 'src/styles'),
    },
    
    // Fallbacks para módulos de Node.js en el navegador
    fallback: {
      path: require.resolve('path-browserify'),
      fs: false,
      crypto: require.resolve('crypto-browserify'),
      buffer: require.resolve('buffer'),
      stream: require.resolve('stream-browserify'),
      util: require.resolve('util'),
      url: require.resolve('url'),
      assert: require.resolve('assert'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      os: require.resolve('os-browserify/browser'),
      querystring: require.resolve('querystring-es3'),
    },
  },
  
  // Configuración de módulos y loaders
  module: {
    rules: [
      // JavaScript/TypeScript con Babel
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { 
                targets: 'defaults',
                useBuiltIns: 'entry',
                corejs: 3 
              }],
              '@babel/preset-react',
              '@babel/preset-typescript'
            ],
            
            plugins: [
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-transform-runtime',
              isDevelopment && 'react-refresh/babel',
            ].filter(Boolean),
            cacheDirectory: true,
          },
        },
      },
      
      // CSS/SCSS con soporte para CSS Modules
      {
        test: /\.css$/,
        use: [
          isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: {
                auto: (resourcePath) => resourcePath.includes('.module.'),
                localIdentName: isDevelopment 
                  ? '[name]__[local]--[hash:base64:5]'
                  : '[hash:base64:8]',
              },
              importLoaders: 1,
            },
          },
          'postcss-loader',
        ],
      },
      {
        test: /\.s[ac]ss$/,
        use: [
          isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
          'sass-loader',
        ],
      },
      
      // Imágenes optimizadas
      {
        test: /\.(png|jpe?g|gif|svg|webp)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8192, // 8kb
          },
        },
        generator: {
          filename: 'images/[name].[hash:8][ext]',
        },
        use: [
          {
            loader: 'image-webpack-loader',
            options: {
              disable: isDevelopment,
              mozjpeg: { progressive: true, quality: 85 },
              optipng: { enabled: false },
              pngquant: { quality: [0.8, 0.9], speed: 4 },
              gifsicle: { interlaced: false },
              webp: { quality: 85 },
            },
          },
        ],
      },
      
      // Fuentes
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash:8][ext]',
        },
      },
      
      // Archivos de video y audio
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'media/[name].[hash:8][ext]',
        },
      },
    ],
  },
  
  // Plugins de desarrollo y producción
  plugins: [
    // Limpia el directorio de salida
    new CleanWebpackPlugin(),
    
    // Genera HTML automáticamente
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      inject: 'body',
      minify: !isDevelopment && {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      },
      meta: {
        viewport: 'width=device-width, initial-scale=1',
        description: 'Una aplicación web moderna construida con Webpack',
        'theme-color': '#000000',
      },
    }),
    
    // Extrae CSS en archivos separados
    !isDevelopment && new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css',
      chunkFilename: 'css/[id].[contenthash:8].css',
    }),
    
    // Copia archivos estáticos
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'public',
          to: '.',
          globOptions: {
            ignore: ['**/index.html'],
          },
        },
      ],
    }),
    
    // Compresión GZIP
    !isDevelopment && new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
    }),
    
    // PWA Manifest
    new WebpackPwaManifest({
      name: 'Mi App Increíble',
      short_name: 'MiApp',
      description: 'Una aplicación web progresiva construida con Webpack',
      background_color: '#ffffff',
      theme_color: '#000000',
      start_url: '/',
      display: 'standalone',
      icons: [
        {
          src: path.resolve('src/assets/icon.png'),
          sizes: [96, 128, 192, 256, 384, 512],
        },
      ],
    }),
    
    // Service Worker para PWA
    !isDevelopment && new WorkboxPlugin.GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/api\./,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 300, // 5 minutos
            },
          },
        },
      ],
    }),
    
    // Analizador de bundle (opcional)
    isAnalyze && new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: true,
    }),
  ].filter(Boolean),
  
  // Optimización avanzada
  optimization: {
    minimize: !isDevelopment,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: !isDevelopment,
            drop_debugger: !isDevelopment,
          },
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
      new CssMinimizerPlugin(),
    ],
    
    // Code splitting inteligente
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          enforce: true,
        },
        common: {
          name: 'common',
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          priority: 20,
        },
      },
    },
    
    // Runtime chunk para mejor caching
    runtimeChunk: {
      name: 'runtime',
    },
  },
  
  // Configuración del dev server
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 3000,
    hot: true,
    open: true,
    historyApiFallback: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
  },
  
  // Source maps mejorados
  devtool: isDevelopment 
    ? 'eval-cheap-module-source-map' 
    : 'source-map',
  
  // Performance hints
  performance: {
    hints: isDevelopment ? false : 'warning',
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
  
  // Configuración de caché para builds más rápidos
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },
  
  // Configuración de stats para output más limpio
  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false,
  },
};