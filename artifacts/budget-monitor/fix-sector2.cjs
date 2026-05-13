const fs = require('fs');
const filePath = '/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src/pages/SectorDetailPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix imports
content = content.replace(/Wallet,\s*TrendingUp,\s*ChevronLeft,\s*ArrowDownRight,\s*ArrowUpRight,/g, 
  'faWallet, faChartLine, faChevronLeft, faArrowRight as faArrowDownRight, faArrowRight as faArrowUpRight,');

// Fix usage
const iconMap = {
  Wallet: 'faWallet',
  TrendingUp: 'faChartLine',
  ChevronLeft: 'faChevronLeft',
  ArrowDownRight: 'faArrowDownRight',
  ArrowUpRight: 'faArrowUpRight'
};

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

// And also the dynamic icon usages like `<AnimatedStatCard index={1} icon={TrendingUp} ... />`
content = content.replace(/icon=\{Wallet\}/g, 'icon={faWallet}');
content = content.replace(/icon=\{TrendingUp\}/g, 'icon={faChartLine}');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed SectorDetailPage phase 2');
