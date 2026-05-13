import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'wouter';

export default function DocumentationPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animation-fade-in">
      {/* Header Area */}
      <div className="mb-8">
        <Link href="/">
          <button className="flex items-center text-gray-400 hover:text-white transition-colors text-sm mb-6 font-medium">
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Back to Dashboard
          </button>
        </Link>
        <div className="flex items-center gap-4">
          <div className="bg-blue-600/20 p-4 rounded-2xl border border-blue-500/30">
            <FontAwesomeIcon icon={faBookOpen} className="text-3xl text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              System Documentation & Pitchdeck
            </h1>
            <p className="text-gray-400 text-lg">
              Understanding the architecture and flow of the National Budget Control platform.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-[#212529] border border-[#343a40] rounded-2xl shadow-xl overflow-hidden p-8">
        <article className="prose prose-invert prose-blue max-w-none">
          <h2>1. Executive Summary</h2>
          <p>
            The Budget Monitor platform provides unparalleled real-time transparency and hierarchical control over national budgets. By enforcing strict approval flows from the CEO down to department heads, it ensures that every allocation is tracked, verified, and audited.
          </p>

          <hr className="border-[#343a40] my-8" />

          <h2>2. Core Features</h2>
          <ul>
            <li><strong>Hierarchical Organization:</strong> Visualize the organization structure using our interactive Node Graph. See allocations flowing top-down.</li>
            <li><strong>Real-time Approvals:</strong> Financial cycles are tightly controlled. Allocations cannot proceed without digital signatures from upstream authorities.</li>
            <li><strong>Role-Based Access Control (RBAC):</strong> Tailored dashboards for Super Admins, CEOs, Ministry Heads, and standard Viewers ensuring zero unauthorized modifications.</li>
            <li><strong>Procurement & Catalog:</strong> Fully integrated internal marketplace to tie spending directly to budgeted line items.</li>
          </ul>

          <hr className="border-[#343a40] my-8" />

          <h2>3. Technical Architecture</h2>
          <p>
            Built using a modern web stack designed for scale and performance:
          </p>
          <ul>
            <li><strong>Frontend:</strong> React (Vite) with Framer Motion for fluid 60FPS UI transitions.</li>
            <li><strong>Styling:</strong> Tailwind CSS customized for a premium dark-themed aesthetic.</li>
            <li><strong>Backend:</strong> Node.js API with Express, heavily typed via Zod validation.</li>
            <li><strong>Database:</strong> PostgreSQL managed via Drizzle ORM ensuring ACID compliance.</li>
            <li><strong>Icons:</strong> FontAwesome integration for recognizable, scalable iconography.</li>
          </ul>

          <hr className="border-[#343a40] my-8" />

          <h2>4. Getting Started</h2>
          <p>
            To begin using the platform:
          </p>
          <ol>
            <li>Navigate to the <strong>Dashboard</strong> to get a macro-view of the active Budget Cycle.</li>
            <li>Use the <strong>Allocations</strong> tab to review pending transfers to your department.</li>
            <li>Explore the <strong>Hierarchy Designer</strong> (Admin only) to modify organizational reporting structures.</li>
          </ol>
          
          <div className="bg-blue-900/30 border-l-4 border-blue-500 p-4 mt-8 rounded-r-lg">
            <p className="text-blue-200 m-0">
              <strong>Need Support?</strong> Contact the system administrator via the Helpdesk portal if you experience issues with your approval workflows.
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
