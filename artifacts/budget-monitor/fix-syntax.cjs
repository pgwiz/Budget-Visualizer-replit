const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      results.push(filePath);
    }
  }
  return results;
}

const files = walkDir('/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src');

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // fix 1: ${ || ''} -> '' (remove it)
  content = content.replace(/\$\{ \|\| ''\}/g, '');
  
  // fix 2: ${className="text-blue-600" || ''} -> text-blue-600
  content = content.replace(/\$\{className="([^"]+)" \|\| ''\}/g, '$1');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', filePath);
  }
}
console.log('Done');
