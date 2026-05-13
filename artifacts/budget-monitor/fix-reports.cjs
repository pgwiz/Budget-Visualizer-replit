const fs = require('fs');
const filePath = '/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src/pages/ReportsPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const importReplacement = `import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHistory, faExchangeAlt, faShoppingCart,
  faFilter, faChevronDown, faChartLine,
} from '@fortawesome/free-solid-svg-icons';`;

// Replace imports
content = content.replace(/import\s*\{\s*History,\s*ArrowLeftRight,\s*ShoppingCart,\s*Filter,\s*ChevronDown,\s*TrendingUp,?\s*\}\s*from\s*'lucide-react';/g, importReplacement);

// Replace JSX tags
const iconMap = {
  History: 'faHistory',
  ArrowLeftRight: 'faExchangeAlt',
  ShoppingCart: 'faShoppingCart',
  Filter: 'faFilter',
  ChevronDown: 'faChevronDown',
  TrendingUp: 'faChartLine'
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
console.log('Fixed ReportsPage');
