const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const pagesDir = path.join(repoRoot, 'Playground', 'pages');

function syncMarkdownDocs() {
    const processDir = (subDir) => {
        const dirPath = path.join(pagesDir, subDir);
        if (!fs.existsSync(dirPath)) return;
        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.html'));

        for (const file of files) {
            const htmlPath = path.join(dirPath, file);
            let htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            const docPathMatch = htmlContent.match(/<nui-markdown[^>]*src="([^"]+)"[^>]*>/);
            if (!docPathMatch) continue;

            const relSrc = docPathMatch[1];
            const absoluteDocLoc = path.resolve(path.dirname(htmlPath), relSrc);
            
            if (!fs.existsSync(absoluteDocLoc)) continue;

            // Extract the rich UI snippet
            // Match up to the final closing </div> of the demo area/container before section ends or the next heading
            const demoMatch = htmlContent.match(/<div class="demo-area"[^>]*>([\s\S]*?)<\/div>\s*(?=<\/section>|<h[1-6]|<div)/) ||
                              htmlContent.match(/<div class="demo-area"[^>]*>([\s\S]*?)<\/div>/) ||
                              htmlContent.match(/<div class="demo-container"[^>]*>([\s\S]*?)<\/div>\s*(?=<\/section>|<h[1-6]|<div)/) ||
                              htmlContent.match(/<div class="demo-container"[^>]*>([\s\S]*?)<\/div>/);
            
            if (!demoMatch) {
                console.log(`No demo area found in: ${file}`);
                continue;
            }
            
            // Clean up the snippet
            let snippet = demoMatch[1].trim();
            let mdContent = fs.readFileSync(absoluteDocLoc, 'utf8');
            let oldMdContent = mdContent;
            
            // Replace the first ```html ... ``` block
            let replaced = false;
            mdContent = mdContent.replace(/([ \t]*)```html\r?\n([\s\S]*?)\r?\n[ \t]*```/, (fullMatch, indent, oldCode) => {
                if (replaced) return fullMatch; // Only do first block
                replaced = true;
                
                // We're replacing oldCode with snippet
                const lines = snippet.split('\n');
                let minIndent = Number.MAX_SAFE_INTEGER;
                lines.forEach(line => {
                    const m = line.match(/^[\t ]+/);
                    if (line.trim().length > 0) {
                        const len = m ? m[0].length : 0;
                        if (len < minIndent) minIndent = len;
                    }
                });
                
                let normSnippet = lines.map(line => {
                    if (line.trim().length === 0) return '';
                    return line.substring(minIndent);
                }).join('\n');
                
                const indentedSnippet = normSnippet.split('\n').map(line => line ? (indent || '') + line : line).join('\n');
                
                return `${indent || ''}\`\`\`html\n${indentedSnippet}\n${indent || ''}\`\`\``;
            });

            if (replaced && mdContent !== oldMdContent) {
                fs.writeFileSync(absoluteDocLoc, mdContent, 'utf8');
                console.log(`Synced demo to: ${path.basename(absoluteDocLoc)}`);
            }
        }
    };

    processDir('components');
    processDir('addons');
}

syncMarkdownDocs();
