const fs = require('fs');

let text = fs.readFileSync('Playground/pages/components/layout.html', 'utf8');

// Replace one-liners: <div class="nui-card">Card 1</div>
text = text.replace(/<div class="nui-card">(.*?)<\/div>/g, '<nui-card></nui-card>');

// The rest of the occurrences are multi-line:
// <div class="nui-card">
//    <div>
//      ...
//    </div>
// </div>
// Because of the exact formatting used, the closing tag of the card is \t\t</div> or \t</div> right before the next card or end of <nui-layout>.

let lines = text.split('\n');
let outLines = [];
let inCard = false;
let divNesting = 0;

for (let line of lines) {
    if (line.includes('<div class="nui-card"')) {
        outLines.push(line.replace('<div class="nui-card"', '<nui-card'));
        inCard = true;
        divNesting = 0;
    } else if (inCard) {
        let opens = (line.match(/<div/g) || []).length;
        let closes = (line.match(/<\/div/g) || []).length;
        
        divNesting += opens;
        
        if (closes > 0) {
            for (let i = 0; i < closes; i++) {
                if (divNesting > 0) {
                    divNesting--;
                } else {
                    line = line.replace('</div', '</nui-card');
                    inCard = false;
                }
            }
        }
        outLines.push(line);
    } else {
        outLines.push(line);
    }
}

fs.writeFileSync('Playground/pages/components/layout.html', outLines.join('\n'), 'utf8');

