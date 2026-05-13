const fs = require('fs');
const filePath = '/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src/pages/HomePage.tsx';
if (!fs.existsSync(filePath)) { console.log('No HomePage'); process.exit(0); }
let content = fs.readFileSync(filePath, 'utf8');

const importReplacement = `import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartPie, faShieldAlt, faArrowRight, faCheckCircle,
  faPlayCircle, faBuilding, faUsers, faGlobe,
  faLayerGroup, faChartLine, faLock, faBolt,
  faExchangeAlt, faStar, faQuoteLeft, faCheck
} from '@fortawesome/free-solid-svg-icons';`;

// Replace imports
content = content.replace(/import\s*\{\s*PieChart,\s*Shield,\s*ArrowRight,\s*CheckCircle2,\s*PlayCircle,\s*Building2,\s*Users,\s*Globe2,\s*Layers,\s*TrendingUp,\s*Lock,\s*Zap,\s*ArrowLeftRight,\s*Star,\s*Quote,\s*Check\s*\}\s*from\s*'lucide-react';/g, importReplacement);

// Check if import is matched
if (!content.includes('@fortawesome/free-solid-svg-icons')) {
  // Try generic match
  content = content.replace(/import\s*\{[^}]+\}\s*from\s*'lucide-react';/g, importReplacement);
}

// Replace JSX tags
const iconMap = {
  PieChart: 'faChartPie',
  Shield: 'faShieldAlt',
  ArrowRight: 'faArrowRight',
  CheckCircle2: 'faCheckCircle',
  PlayCircle: 'faPlayCircle',
  Building2: 'faBuilding',
  Users: 'faUsers',
  Globe2: 'faGlobe',
  Layers: 'faLayerGroup',
  TrendingUp: 'faChartLine',
  Lock: 'faLock',
  Zap: 'faBolt',
  ArrowLeftRight: 'faExchangeAlt',
  Star: 'faStar',
  Quote: 'faQuoteLeft',
  Check: 'faCheck'
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

// Dynamic icons
content = content.replace(/<feature\.icon className="[^"]*" \/>/g, '<FontAwesomeIcon icon={feature.icon} className="text-blue-600 text-[24px]" />');
content = content.replace(/<stat\.icon className="[^"]*" \/>/g, '<FontAwesomeIcon icon={stat.icon} className="text-white text-[24px]" />');

// Remove dark classes
content = content.replace(/bg-slate-900/g, 'bg-gray-50');
content = content.replace(/text-slate-400/g, 'text-gray-500');
content = content.replace(/text-slate-300/g, 'text-gray-600');
content = content.replace(/text-slate-500/g, 'text-gray-400');
content = content.replace(/border-slate-800/g, 'border-gray-200');
content = content.replace(/bg-slate-800\/50/g, 'bg-gray-100');
content = content.replace(/bg-slate-800/g, 'bg-gray-100');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed HomePage');
