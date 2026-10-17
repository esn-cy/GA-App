const fs = require('fs');
const path = require('path');

// 1. Patch @angular/build builder.js to fix source map paths for Vitest V8 coverage remapping
const angularBuilderPath = path.resolve(__dirname, '../node_modules/@angular/build/src/builders/unit-test/builder.js');
if (fs.existsSync(angularBuilderPath)) {
  let builderContent = fs.readFileSync(angularBuilderPath, 'utf8');

  // Patch sourcemap source paths relative to outputPath
  if (!builderContent.includes('map.sources = map.sources.map')) {
    const target = 'await (0, application_builder_1.writeTestFiles)(result.files, outputPath);';
    const replacement = `for (const [filename, file] of Object.entries(result.files)) {
                if (filename.endsWith('.js.map') && file.origin === 'memory' && file.contents) {
                    try {
                        const contentStr = typeof file.contents === 'string' ? file.contents : Buffer.from(file.contents).toString('utf8');
                        const map = JSON.parse(contentStr);
                        if (map.sources && Array.isArray(map.sources)) {
                            map.sources = map.sources.map((s) => node_path_1.default.relative(outputPath, node_path_1.default.resolve(workspaceRoot, s)));
                            file.contents = Buffer.from(JSON.stringify(map));
                        }
                    } catch {}
                }
            }
            await (0, application_builder_1.writeTestFiles)(result.files, outputPath);`;
    builderContent = builderContent.replace(target, replacement);
  }

  // Ensure coverage include is src/app/**/*.ts
  if (builderContent.includes('include: [`${(0, path_1.toPosixPath)(node_path_1.default.relative(workspaceRoot, outputPath))}/**`]')) {
    builderContent = builderContent.replace(
      'include: [`${(0, path_1.toPosixPath)(node_path_1.default.relative(workspaceRoot, outputPath))}/**`]',
      'include: [\'src/app/**/*.ts\']'
    );
  }

  fs.writeFileSync(angularBuilderPath, builderContent, 'utf8');
  console.log('Patched @angular/build unit-test builder for V8 coverage.');
}

// 2. Patch @vitest/coverage-v8 provider.js to allow dist/test-out bundled scripts
const vitestProviderPath = path.resolve(__dirname, '../node_modules/@vitest/coverage-v8/dist/provider.js');
if (fs.existsSync(vitestProviderPath)) {
  let providerContent = fs.readFileSync(vitestProviderPath, 'utf8');
  if (!providerContent.includes('filePath.includes(\'dist/test-out\')')) {
    providerContent = providerContent.replace(
      'if (this.isIncluded(filePath)) {',
      'if (this.isIncluded(filePath) || filePath.includes(\'dist/test-out\')) {'
    );
    fs.writeFileSync(vitestProviderPath, providerContent, 'utf8');
    console.log('Patched @vitest/coverage-v8 provider for test bundle coverage.');
  }
}
