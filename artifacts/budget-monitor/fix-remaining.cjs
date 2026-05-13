const fs = require('fs');

const files = [
  '/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src/components/sectors/SectorTree.tsx',
  '/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src/components/orgchart/OrgChart.tsx',
  '/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src/components/hierarchy/NodeDetailPanel.tsx',
  '/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src/components/hierarchy/BudgetHierarchyTree.tsx',
  '/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src/components/orgchart/OrgChartPopup.tsx',
  '/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src/pages/NotFoundPage.tsx',
  '/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src/components/ui/ExportMenu.tsx'
];

const iconMap = {
  ChevronRight: 'faChevronRight',
  ChevronDown: 'faChevronDown',
  Network: 'faProjectDiagram',
  RotateCcw: 'faUndo',
  GripVertical: 'faGripVertical',
  Maximize2: 'faExpand',
  Minimize2: 'faCompress',
  X: 'faTimes',
  ExternalLink: 'faExternalLinkAlt',
  TrendingUp: 'faChartLine',
  Wallet: 'faWallet',
  ZoomIn: 'faSearchPlus',
  ChevronUp: 'faChevronUp',
  ChevronLeft: 'faChevronLeft',
  Layers: 'faLayerGroup',
  List: 'faList',
  Settings2: 'faCog',
  Percent: 'faPercentage',
  Home: 'faHome',
  Download: 'faDownload',
  Check: 'faCheck',
  Loader2: 'faSpinner'
};

for (const filePath of files) {
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace import
  const faIcons = Object.values(iconMap).join(', ');
  content = content.replace(/import\s*\{[^}]+\}\s*from\s*'lucide-react';/g, 
    `import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';\nimport { ${faIcons} } from '@fortawesome/free-solid-svg-icons';`);

  // Replace JSX tags
  for (const [lucide, fa] of Object.entries(iconMap)) {
    const regex = new RegExp(`<${lucide}\\s+size=\\{([^}]+)\\}\\s*(className="[^"]*")?\\s*\\/>`, 'g');
    content = content.replace(regex, `<FontAwesomeIcon icon={${fa}} className={\`text-[\${$1}px] \${$2 || ''}\`} />`);
    
    const regex2 = new RegExp(`<${lucide}\\s*(className="[^"]*")?\\s*size=\\{([^}]+)\\}\\s*\\/>`, 'g');
    content = content.replace(regex2, `<FontAwesomeIcon icon={${fa}} className={\`text-[\${$2}px] \${$1 || ''}\`} />`);
    
    const regex3 = new RegExp(`<${lucide}\\s+size=\\{([^}]+)\\}\\s*\\/>`, 'g');
    content = content.replace(regex3, `<FontAwesomeIcon icon={${fa}} className={\`text-[\${$1}px]\`} />`);

    const regex4 = new RegExp(`<${lucide}\\s*(className="[^"]*")?\\s*\\/>`, 'g');
    content = content.replace(regex4, `<FontAwesomeIcon icon={${fa}} $1 />`);
  }

  // Handle cases where loader has animate-spin className
  content = content.replace(/className={`text-\[([^\]]+)px\] animate-spin`}/g, 'className={`text-[$1px] animate-spin`}');
  
  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Fixed remaining files');
