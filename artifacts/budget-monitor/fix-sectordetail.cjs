const fs = require('fs');
const filePath = '/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src/pages/SectorDetailPage.tsx';
if (!fs.existsSync(filePath)) { console.log('No SectorDetailPage'); process.exit(0); }
let content = fs.readFileSync(filePath, 'utf8');

const importReplacement = `import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding, faChartPie, faArrowRight, faWallet, faChartLine,
  faNetworkWired, faArrowLeft, faShoppingCart, faClipboardList
} from '@fortawesome/free-solid-svg-icons';`;

content = content.replace(/import\s*\{\s*Building2,\s*PieChart,\s*ArrowUpRight,\s*Wallet,\s*TrendingUp,\s*Network,\s*ArrowLeft,\s*ShoppingCart,\s*ClipboardList,?\s*\}\s*from\s*'lucide-react';/g, importReplacement);

const iconMap = {
  Building2: 'faBuilding',
  PieChart: 'faChartPie',
  ArrowUpRight: 'faArrowRight',
  Wallet: 'faWallet',
  TrendingUp: 'faChartLine',
  Network: 'faNetworkWired',
  ArrowLeft: 'faArrowLeft',
  ShoppingCart: 'faShoppingCart',
  ClipboardList: 'faClipboardList'
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

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed SectorDetailPage');
