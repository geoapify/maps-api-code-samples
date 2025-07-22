const inlineSource = require('inline-source').inlineSource;
const fs = require('fs').promises;
const path = require('path');

async function inlineResources() {
    const htmlPath = path.resolve('route-directions/src/demo.html');
    const outputPath = path.resolve('route-directions/demo_combined.html');

    try {
        const html = await inlineSource(htmlPath, {
            compress: false,
            rootpath: path.resolve('route-directions/src'),
            ignore: []
        });

        await fs.writeFile(outputPath, html, 'utf-8');
        console.log(`✅ Combined HTML saved to ${outputPath}`);
    } catch (err) {
        console.error(`❌ Error: ${err.message}`);
    }
}

inlineResources();
