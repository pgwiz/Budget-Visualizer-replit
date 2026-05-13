const fs = require('fs');
const filePath = '/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src/pages/ProcurementPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const importReplacement = `import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShoppingCart, faPlus, faSearch, faTrashAlt, faPaperPlane, faCheckCircle, faTimesCircle,
  faClock, faFileAlt, faChevronDown, faChevronRight, faBox, faExclamationTriangle,
  faTimes, faFilter, faShieldAlt, faEdit, faSave, faUsers, faArrowRight,
  faCheckSquare, faCog, faLayerGroup, faBuilding, faList, faSlidersH,
  faTag, faDollarSign, faProjectDiagram,
} from '@fortawesome/free-solid-svg-icons';`;

// Replace imports
content = content.replace(/import\s*\{\s*ShoppingCart[^}]*\}\s*from\s*'lucide-react';/g, importReplacement);

// Replace icon names in objects
content = content.replace(/icon:\s*FileText/g, 'icon: faFileAlt');
content = content.replace(/icon:\s*Clock/g, 'icon: faClock');
content = content.replace(/icon:\s*CheckCircle/g, 'icon: faCheckCircle');
content = content.replace(/icon:\s*XCircle/g, 'icon: faTimesCircle');

// Replace JSX tags
const iconMap = {
  ShoppingCart: 'faShoppingCart',
  Plus: 'faPlus',
  Search: 'faSearch',
  Trash2: 'faTrashAlt',
  Send: 'faPaperPlane',
  CheckCircle: 'faCheckCircle',
  XCircle: 'faTimesCircle',
  Clock: 'faClock',
  FileText: 'faFileAlt',
  ChevronDown: 'faChevronDown',
  ChevronRight: 'faChevronRight',
  Package: 'faBox',
  AlertTriangle: 'faExclamationTriangle',
  X: 'faTimes',
  Filter: 'faFilter',
  Shield: 'faShieldAlt',
  Edit2: 'faEdit',
  Save: 'faSave',
  Users: 'faUsers',
  ArrowUpRight: 'faArrowRight',
  CheckSquare: 'faCheckSquare',
  Settings: 'faCog',
  Layers: 'faLayerGroup',
  Building2: 'faBuilding',
  LayoutList: 'faList',
  SlidersHorizontal: 'faSlidersH',
  Tag: 'faTag',
  DollarSign: 'faDollarSign',
  Network: 'faProjectDiagram'
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

// Special case for dynamic icon
content = content.replace(/<cfg\.icon size=\{15\} style=\{\{ color: cfg\.color \}\} \/>/g, '<FontAwesomeIcon icon={cfg.icon} style={{ color: cfg.color }} className="text-[15px]" />');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed ProcurementPage');
