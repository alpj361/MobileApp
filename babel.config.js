// Custom Babel plugin to transform import.meta for web (doesn't affect iOS/Android)
function importMetaPlugin({ types: t }) {
  return {
    name: 'transform-import-meta-web',
    visitor: {
      MetaProperty(path) {
        // Transform: import.meta.url -> (typeof window !== 'undefined' ? window.location.href : '')
        // Transform: import.meta.env -> process.env
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          // Check if it's accessing .url or .env
          const parent = path.parent;
          if (t.isMemberExpression(parent)) {
            if (parent.property.name === 'url') {
              // Replace import.meta.url
              path.parentPath.replaceWith(
                t.conditionalExpression(
                  t.binaryExpression(
                    '!==',
                    t.unaryExpression('typeof', t.identifier('window')),
                    t.stringLiteral('undefined')
                  ),
                  t.memberExpression(
                    t.memberExpression(t.identifier('window'), t.identifier('location')),
                    t.identifier('href')
                  ),
                  t.stringLiteral('')
                )
              );
            } else if (parent.property.name === 'env') {
              // Replace import.meta.env with process.env
              path.parentPath.replaceWith(
                t.memberExpression(t.identifier('process'), t.identifier('env'))
              );
            }
          } else {
            // Replace bare import.meta
            path.replaceWith(
              t.objectExpression([
                t.objectProperty(
                  t.identifier('url'),
                  t.conditionalExpression(
                    t.binaryExpression(
                      '!==',
                      t.unaryExpression('typeof', t.identifier('window')),
                      t.stringLiteral('undefined')
                    ),
                    t.memberExpression(
                      t.memberExpression(t.identifier('window'), t.identifier('location')),
                      t.identifier('href')
                    ),
                    t.stringLiteral('')
                  )
                ),
                t.objectProperty(
                  t.identifier('env'),
                  t.memberExpression(t.identifier('process'), t.identifier('env'))
                ),
              ])
            );
          }
        }
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [
      importMetaPlugin, // Custom plugin to transform import.meta
    ],
  };
};
