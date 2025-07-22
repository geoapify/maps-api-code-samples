const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const outputFile = path.join(__dirname, 'demo_combined.html');

// Read source files
const html = fs.readFileSync(path.join(srcDir, 'demo.html'), 'utf8');
const css = fs.readFileSync(path.join(srcDir, 'styles.css'), 'utf8');
const elevationJs = fs.readFileSync(path.join(srcDir, 'elevation.js'), 'utf8');
const demoJs = fs.readFileSync(path.join(srcDir, 'demo.js'), 'utf8');

// Replace inline references
let combinedHtml = html;

// Replace CSS
combinedHtml = combinedHtml.replace(
    '<link rel="stylesheet" href="styles.css" inline>',
    `<style>\n${css}\n</style>`
);

// Replace elevation.js - remove export/import statements
const elevationJsWithoutModules = elevationJs.replace(
    /export\s+function/g, 'function'
).replace(
    /export\s+{[^}]*}/g, ''
);

combinedHtml = combinedHtml.replace(
    '<script type="module" src="elevation.js" inline></script>',
    `<script>\n${elevationJsWithoutModules}\n</script>`
);

// Replace demo.js - remove import and export statements  
const demoJsWithoutModules = demoJs.replace(
    /import\s+{[^}]*}\s+from\s+['"][^'"]*['"];?/g, '// Using global functions'
).replace(
    /export\s+{[^}]*}/g, ''
);

combinedHtml = combinedHtml.replace(
    '<script type="module" src="demo.js" inline></script>',
    `<script>\n${demoJsWithoutModules}\n</script>`
);

// Write combined file
fs.writeFileSync(outputFile, combinedHtml);

console.log('Combined demo created at:', outputFile); 