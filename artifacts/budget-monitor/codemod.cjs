const fs = require('fs');
const path = require('path');

const dirs = [
  '/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src/pages',
  '/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src/components/hierarchy',
  '/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src/components/sectors',
  '/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src/components/orgchart'
];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

  for (const f of files) {
    if (['AllocationsPage.tsx', 'DashboardPage.tsx', 'SectorsPage.tsx'].includes(f)) continue;
    let filePath = path.join(dir, f);
    let content = fs.readFileSync(filePath, 'utf8');
    
    content = content.replace(/text-white\/40/g, 'text-gray-500');
    content = content.replace(/text-white\/50/g, 'text-gray-600');
    content = content.replace(/text-white\/30/g, 'text-gray-400');
    content = content.replace(/text-white\/20/g, 'text-gray-400');
    content = content.replace(/text-white\/25/g, 'text-gray-400');
    content = content.replace(/text-white\/15/g, 'text-gray-300');
    content = content.replace(/text-white\/60/g, 'text-gray-600');
    content = content.replace(/text-white\/70/g, 'text-gray-700');
    content = content.replace(/text-white\/80/g, 'text-gray-700');
    content = content.replace(/text-white\/10/g, 'text-gray-300');
    content = content.replace(/text-white\/8/g, 'text-gray-300');
    content = content.replace(/text-white\/5/g, 'text-gray-200');
    content = content.replace(/text-white/g, 'text-gray-900');

    content = content.replace(/bg-white\/5/g, 'bg-gray-50');
    content = content.replace(/bg-white\/10/g, 'bg-gray-100');
    content = content.replace(/bg-white\/8/g, 'bg-gray-50');
    content = content.replace(/bg-white\/3/g, 'bg-gray-50');
    
    content = content.replace(/border-white\/10/g, 'border-gray-200');
    content = content.replace(/border-white\/5/g, 'border-gray-100');
    content = content.replace(/border-white\/8/g, 'border-gray-200');

    content = content.replace(/hover:bg-white\/5/g, 'hover:bg-gray-50');
    content = content.replace(/hover:bg-white\/8/g, 'hover:bg-gray-100');
    content = content.replace(/hover:text-white\/70/g, 'hover:text-gray-800');
    content = content.replace(/hover:text-white\/60/g, 'hover:text-gray-700');
    content = content.replace(/hover:text-white/g, 'hover:text-blue-600');

    content = content.replace(/bg-\[#0a0f1e\]/g, 'bg-white');
    content = content.replace(/bg-\[#0d1527\]/g, 'bg-white');
    content = content.replace(/bg-\[#0B1021\]/g, 'bg-gray-50');
    content = content.replace(/border-\[#1a2235\]/g, 'border-gray-200');

    fs.writeFileSync(filePath, content, 'utf8');
  }
}
console.log('Done!');
