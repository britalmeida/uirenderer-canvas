module.exports = {
  productionSourceMap: false,
  chainWebpack: config => {
    config.module
      .rule('glsl')
      .test(/\.glsl$/)
      .use('webpack-glsl-loader')
        .loader('webpack-glsl-loader')
        .end()
  }
}
