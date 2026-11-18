module.exports = {
  process(source, filename) {
    return {
      code: require('esbuild').transformSync(source, {
        loader: filename.endsWith('.tsx') ? 'tsx' : 'ts',
        jsx: 'automatic',
        format: 'cjs',
        sourcemap: 'inline',
        sourcefile: filename,
      }).code,
    }
  },
}
