const inlineSource = require('inline-source').inlineSource;
const fs = require('fs').promises;
const path = require('path');

async function inlineResources() {
    const htmlPath = path.resolve('isolines-maplibre/src/demo.html');
    const outputPath = path.resolve('isolines-maplibre/demo_combined.html');

    try {
        const html = await inlineSource(htmlPath, {
            compress: false,
            rootpath: path.resolve('isolines-maplibre/src'),
            ignore: []
        });

        await fs.writeFile(outputPath, html, 'utf-8');
        console.log(`✅ Combined HTML saved to ${outputPath}`);
    } catch (err) {
        console.error(`❌ Error: ${err.message}`);
    }
}

inlineResources(); 