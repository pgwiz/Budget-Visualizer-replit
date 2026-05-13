const fs = require('fs');
const filePath = '/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src/pages/HierarchyDesignerPage.tsx';
if (!fs.existsSync(filePath)) { console.log('No HierarchyDesignerPage'); process.exit(0); }
let content = fs.readFileSync(filePath, 'utf8');

const importReplacement = `import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faTrashAlt, faEdit, faChevronDown, faChevronRight, faTimes, faSave,
  faProjectDiagram, faExclamationTriangle, faSearch,
} from '@fortawesome/free-solid-svg-icons';`;

// Generic lucide replace
content = content.replace(/import\s*\{\s*Plus,\s*Trash2,\s*Edit3,\s*ChevronDown,\s*ChevronRight,\s*X,\s*Save,\s*GitBranch,\s*AlertTriangle,\s*Search,?\s*\}\s*from\s*'lucide-react';/g, importReplacement);

const iconMap = {
  Plus: 'faPlus',
  Trash2: 'faTrashAlt',
  Edit3: 'faEdit',
  ChevronDown: 'faChevronDown',
  ChevronRight: 'faChevronRight',
  X: 'faTimes',
  Save: 'faSave',
  GitBranch: 'faProjectDiagram',
  AlertTriangle: 'faExclamationTriangle',
  Search: 'faSearch'
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
console.log('Fixed HierarchyDesignerPage');
