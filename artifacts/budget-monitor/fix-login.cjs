const fs = require('fs');
const filePath = '/home/nyakoe/Desktop/Budget-Visualizer-replit/artifacts/budget-monitor/src/pages/LoginPage.tsx';
if (!fs.existsSync(filePath)) { console.log('No LoginPage'); process.exit(0); }
let content = fs.readFileSync(filePath, 'utf8');

const importReplacement = `import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLock, faEnvelope, faEye, faEyeSlash, faChartPie,
  faBuilding, faUsers, faShieldAlt, faCheckCircle, faCrown,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';`;

// Generic lucide replace
content = content.replace(/import\s*\{[^}]+\}\s*from\s*'lucide-react';/g, importReplacement);

const iconMap = {
  Lock: 'faLock',
  Mail: 'faEnvelope',
  Eye: 'faEye',
  EyeOff: 'faEyeSlash',
  PieChart: 'faChartPie',
  Building2: 'faBuilding',
  Users: 'faUsers',
  Shield: 'faShieldAlt',
  CheckCircle2: 'faCheckCircle',
  Crown: 'faCrown',
  ArrowRight: 'faArrowRight'
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

// Update icon maps in arrays if any
content = content.replace(/icon:\s*Shield/g, 'icon: faShieldAlt');
content = content.replace(/icon:\s*Crown/g, 'icon: faCrown');
content = content.replace(/icon:\s*Building2/g, 'icon: faBuilding');
content = content.replace(/icon:\s*Users/g, 'icon: faUsers');
content = content.replace(/icon:\s*Eye/g, 'icon: faEye');

// dynamic icons
content = content.replace(/<Icon className="([^"]*)" \/>/g, '<FontAwesomeIcon icon={Icon} className="$1 text-[24px]" />');
content = content.replace(/<role\.icon className="([^"]*)" \/>/g, '<FontAwesomeIcon icon={role.icon} className="$1 text-[20px]" />');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed LoginPage');
