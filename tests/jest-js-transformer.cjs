const ts = require('typescript');

module.exports = {
  process(source, filename) {
    const result = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        allowJs: true,
      },
      fileName: filename,
    });
    return { code: result.outputText };
  },
  getCacheKey(source, filename) {
    return `${filename}:${source.length}:${source}`;
  },
};
