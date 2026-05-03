import React, { useState, useEffect, useRef, useCallback } from "react";
import html2pdf from "html2pdf.js";
import { Download, Printer, ZoomIn, ZoomOut, Plus, Trash2, Image as ImageIcon, RotateCcw, Import } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { oneDark } from "@codemirror/theme-one-dark";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type DocType = "Invoice" | "Utility Bill" | "Receipt" | "Purchase Order" | "Delivery Note";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface AppState {
  docType: DocType;
  companyName: string;
  companyAddress: string;
  companyCountry: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  accentColor: string;
  logoUrl: string;
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  taxRate: number;
  notes: string;
  items: LineItem[];
  customHtml: string;
  customCss: string;
  useCustomCode: boolean;
}

const defaultTemplates: Record<DocType, { html: string; css: string }> = {
  Invoice: {
    html: `<div class="doc">
  <header>
    {{#if logoUrl}}<img src="{{logoUrl}}" class="logo" />{{/if}}
    <div class="company-info">
      <h1>{{companyName}}</h1>
      <p>{{companyAddress}}</p>
      {{#if companyPhone}}<p>{{companyPhone}}</p>{{/if}}
      {{#if companyEmail}}<p>{{companyEmail}}</p>{{/if}}
      {{#if companyWebsite}}<p>{{companyWebsite}}</p>{{/if}}
    </div>
  </header>
  <div class="meta">
    <h2>INVOICE</h2>
    <table>
      <tr><td>Invoice #</td><td>{{invoiceNumber}}</td></tr>
      <tr><td>Date</td><td>{{issueDate}}</td></tr>
      <tr><td>Due Date</td><td>{{dueDate}}</td></tr>
    </table>
  </div>
  <div class="bill-to">
    <h3>Bill To:</h3>
    <p><strong>{{clientName}}</strong></p>
    <p>{{clientAddress}}</p>
    {{#if clientEmail}}<p>{{clientEmail}}</p>{{/if}}
  </div>
  <table class="items">
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td>{{unitPrice}}</td>
        <td>{{total}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  <div class="totals">
    <table>
      <tr><td>Subtotal</td><td>{{currency}} {{subtotal}}</td></tr>
      {{#if taxRate}}<tr><td>Tax ({{taxRate}}%)</td><td>{{currency}} {{taxAmount}}</td></tr>{{/if}}
      <tr class="grand-total"><td>Total</td><td>{{currency}} {{totalAmount}}</td></tr>
    </table>
  </div>
  {{#if notes}}
  <div class="notes">
    <h3>Notes</h3>
    <p>{{notes}}</p>
  </div>
  {{/if}}
</div>`,
    css: `.doc { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.5; padding: 40px; box-sizing: border-box; }
header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid {{accentColor}}; padding-bottom: 20px; }
.logo { max-width: 150px; max-height: 80px; object-fit: contain; }
.company-info { text-align: right; }
.company-info h1 { margin: 0 0 5px 0; color: {{accentColor}}; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
.company-info p { margin: 2px 0; color: #666; font-size: 12px; }
.meta { display: flex; justify-content: space-between; margin-bottom: 30px; align-items: flex-end; }
.meta h2 { font-size: 32px; font-weight: 300; letter-spacing: 2px; color: #ccc; margin: 0; }
.meta table { text-align: right; }
.meta td { padding: 3px 0 3px 15px; font-size: 13px; }
.meta td:first-child { color: #888; font-weight: 500; }
.bill-to { margin-bottom: 40px; }
.bill-to h3 { color: {{accentColor}}; font-size: 13px; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.5px; }
.bill-to p { margin: 2px 0; font-size: 13px; color: #444; white-space: pre-wrap; }
table.items { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
table.items th { background: #f9f9f9; text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; color: #555; border-bottom: 2px solid {{accentColor}}; letter-spacing: 0.5px; }
table.items td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; color: #333; }
table.items th:nth-child(2), table.items td:nth-child(2),
table.items th:nth-child(3), table.items td:nth-child(3),
table.items th:nth-child(4), table.items td:nth-child(4) { text-align: right; }
.totals { display: flex; justify-content: flex-end; margin-bottom: 40px; }
.totals table { width: 300px; }
.totals td { padding: 8px 12px; text-align: right; font-size: 13px; }
.totals td:first-child { color: #666; font-weight: 500; }
.grand-total { font-weight: bold; font-size: 16px; color: {{accentColor}}; }
.grand-total td { border-top: 2px solid {{accentColor}}; padding-top: 12px; }
.notes { background: #fdfdfd; padding: 20px; border-left: 4px solid {{accentColor}}; }
.notes h3 { font-size: 13px; margin: 0 0 8px 0; color: #555; text-transform: uppercase; letter-spacing: 0.5px; }
.notes p { margin: 0; font-size: 12px; color: #666; white-space: pre-wrap; line-height: 1.6; }`
  },
  "Utility Bill": {
    html: `<div class="doc">
  <header>
    <div class="company-info">
      {{#if logoUrl}}<img src="{{logoUrl}}" class="logo" />{{/if}}
      <h1>{{companyName}}</h1>
      <p>{{companyAddress}}</p>
      <p>Customer Service: {{companyPhone}}</p>
    </div>
    <div class="meta">
      <h2>UTILITY BILL</h2>
      <div class="account-box">
        <p><strong>Account #:</strong> {{invoiceNumber}}</p>
        <p><strong>Statement Date:</strong> {{issueDate}}</p>
        <p><strong>Due Date:</strong> {{dueDate}}</p>
      </div>
    </div>
  </header>
  <div class="service-address">
    <h3>Service Address</h3>
    <p><strong>{{clientName}}</strong></p>
    <p>{{clientAddress}}</p>
  </div>
  <div class="summary">
    <div class="summary-box">
      <h4>Previous Balance</h4>
      <p>{{currency}} 0.00</p>
    </div>
    <div class="summary-box">
      <h4>New Charges</h4>
      <p>{{currency}} {{subtotal}}</p>
    </div>
    <div class="summary-box highlight">
      <h4>Total Amount Due</h4>
      <p>{{currency}} {{totalAmount}}</p>
    </div>
  </div>
  <table class="items">
    <thead>
      <tr>
        <th>Service Description</th>
        <th>Usage</th>
        <th>Rate</th>
        <th>Charge</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td>{{unitPrice}}</td>
        <td>{{total}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  {{#if taxRate}}
  <div class="tax-info">
    <p>Includes {{taxRate}}% Tax: {{currency}} {{taxAmount}}</p>
  </div>
  {{/if}}
  {{#if notes}}
  <div class="notes">
    <p>{{notes}}</p>
  </div>
  {{/if}}
</div>`,
    css: `.doc { font-family: 'Inter', sans-serif; color: #222; line-height: 1.5; padding: 40px; box-sizing: border-box; }
header { display: flex; justify-content: space-between; margin-bottom: 40px; }
.logo { max-width: 120px; max-height: 60px; margin-bottom: 10px; }
.company-info h1 { margin: 0 0 5px 0; color: {{accentColor}}; font-size: 20px; }
.company-info p { margin: 2px 0; color: #555; font-size: 12px; }
.meta { text-align: right; }
.meta h2 { font-size: 24px; color: {{accentColor}}; margin: 0 0 15px 0; letter-spacing: 1px; }
.account-box { border: 1px solid #ddd; padding: 15px; border-top: 4px solid {{accentColor}}; background: #fafafa; text-align: left; }
.account-box p { margin: 5px 0; font-size: 13px; }
.service-address { margin-bottom: 30px; }
.service-address h3 { font-size: 12px; text-transform: uppercase; color: #777; margin: 0 0 5px 0; border-bottom: 1px solid #eee; padding-bottom: 5px; }
.service-address p { margin: 3px 0; font-size: 14px; white-space: pre-wrap; }
.summary { display: flex; gap: 20px; margin-bottom: 40px; }
.summary-box { flex: 1; border: 1px solid #eee; padding: 15px; text-align: center; }
.summary-box h4 { margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #666; }
.summary-box p { margin: 0; font-size: 18px; font-weight: 500; }
.summary-box.highlight { background: {{accentColor}}; color: #fff; border-color: {{accentColor}}; }
.summary-box.highlight h4 { color: rgba(255,255,255,0.8); }
table.items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
table.items th { background: #f5f5f5; text-align: left; padding: 10px; font-size: 12px; color: #444; border-bottom: 2px solid #ddd; }
table.items td { padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; }
table.items th:nth-child(2), table.items td:nth-child(2), table.items th:nth-child(3), table.items td:nth-child(3), table.items th:nth-child(4), table.items td:nth-child(4) { text-align: right; }
.tax-info { text-align: right; font-size: 12px; color: #666; margin-bottom: 30px; }
.notes { font-size: 11px; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 20px; margin-top: 40px; }`
  },
  Receipt: {
    html: `<div class="doc">
  <div class="receipt">
    <header>
      {{#if logoUrl}}<img src="{{logoUrl}}" class="logo" />{{/if}}
      <h1>{{companyName}}</h1>
      <p>{{companyAddress}}</p>
      {{#if companyPhone}}<p>{{companyPhone}}</p>{{/if}}
    </header>
    <div class="divider"></div>
    <div class="meta">
      <p>Receipt #: {{invoiceNumber}}</p>
      <p>Date: {{issueDate}}</p>
      <p>Customer: {{clientName}}</p>
    </div>
    <div class="divider"></div>
    <table class="items">
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {{#each items}}
        <tr>
          <td>{{description}}</td>
          <td>{{quantity}}</td>
          <td>{{total}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
    <div class="divider"></div>
    <div class="totals">
      <p><span>Subtotal</span><span>{{currency}} {{subtotal}}</span></p>
      {{#if taxRate}}<p><span>Tax ({{taxRate}}%)</span><span>{{currency}} {{taxAmount}}</span></p>{{/if}}
      <p class="grand-total"><span>Total</span><span>{{currency}} {{totalAmount}}</span></p>
    </div>
    <div class="divider"></div>
    <div class="footer">
      <p>PAID IN FULL</p>
      {{#if notes}}<p class="notes">{{notes}}</p>{{/if}}
      <p class="thanks">Thank you for your business!</p>
    </div>
  </div>
</div>`,
    css: `.doc { font-family: 'Courier New', Courier, monospace; color: #000; display: flex; justify-content: center; padding: 40px; box-sizing: border-box; }
.receipt { width: 350px; background: #fff; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
header { text-align: center; margin-bottom: 15px; }
.logo { max-width: 80px; max-height: 80px; margin-bottom: 10px; filter: grayscale(100%); }
h1 { margin: 0 0 5px 0; font-size: 18px; text-transform: uppercase; }
header p { margin: 2px 0; font-size: 12px; }
.divider { border-bottom: 1px dashed #000; margin: 15px 0; }
.meta p { margin: 3px 0; font-size: 12px; }
table.items { width: 100%; border-collapse: collapse; }
table.items th { text-align: left; padding: 5px 0; font-size: 12px; border-bottom: 1px solid #000; }
table.items td { padding: 5px 0; font-size: 12px; vertical-align: top; }
table.items th:nth-child(2), table.items td:nth-child(2) { text-align: center; }
table.items th:nth-child(3), table.items td:nth-child(3) { text-align: right; }
.totals p { display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px; }
.grand-total { font-weight: bold; font-size: 16px !important; margin-top: 10px !important; }
.footer { text-align: center; }
.footer > p:first-child { font-weight: bold; font-size: 16px; margin: 10px 0; }
.notes { font-size: 10px; margin: 15px 0; white-space: pre-wrap; }
.thanks { font-size: 12px; margin-top: 15px; }`
  },
  "Purchase Order": {
    html: `<div class="doc">
  <header>
    <div class="company-info">
      <h1>{{companyName}}</h1>
      <p>{{companyAddress}}</p>
      {{#if companyPhone}}<p>{{companyPhone}}</p>{{/if}}
      {{#if companyEmail}}<p>{{companyEmail}}</p>{{/if}}
    </div>
    <div class="title-block">
      <h2>PURCHASE ORDER</h2>
      <p>PO Number: <strong>{{invoiceNumber}}</strong></p>
      <p>Date: {{issueDate}}</p>
      <p>Expected Delivery: {{dueDate}}</p>
    </div>
  </header>
  <div class="addresses">
    <div class="address-box">
      <h3>Vendor</h3>
      <p><strong>{{clientName}}</strong></p>
      <p>{{clientAddress}}</p>
      {{#if clientEmail}}<p>{{clientEmail}}</p>{{/if}}
    </div>
    <div class="address-box">
      <h3>Ship To</h3>
      <p><strong>{{companyName}}</strong></p>
      <p>{{companyAddress}}</p>
      {{#if companyPhone}}<p>{{companyPhone}}</p>{{/if}}
    </div>
  </div>
  <table class="items">
    <thead>
      <tr>
        <th>Item / Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td>{{currency}} {{unitPrice}}</td>
        <td>{{currency}} {{total}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  <div class="totals">
    <div class="notes">
      {{#if notes}}
      <h3>Instructions</h3>
      <p>{{notes}}</p>
      {{/if}}
    </div>
    <div class="calc">
      <p><span>Subtotal:</span><span>{{currency}} {{subtotal}}</span></p>
      {{#if taxRate}}<p><span>Tax ({{taxRate}}%):</span><span>{{currency}} {{taxAmount}}</span></p>{{/if}}
      <p class="grand-total"><span>Total:</span><span>{{currency}} {{totalAmount}}</span></p>
    </div>
  </div>
  <div class="signatures">
    <div class="sig-line">
      <p>Authorized Signature</p>
    </div>
    <div class="sig-line">
      <p>Date</p>
    </div>
  </div>
</div>`,
    css: `.doc { font-family: 'Arial', sans-serif; color: #333; line-height: 1.4; padding: 40px; box-sizing: border-box; }
header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
.company-info h1 { margin: 0 0 5px 0; color: #222; font-size: 22px; text-transform: uppercase; }
.company-info p { margin: 2px 0; color: #555; font-size: 13px; }
.title-block { text-align: right; background: #f4f4f4; padding: 15px 20px; border-left: 5px solid {{accentColor}}; }
.title-block h2 { margin: 0 0 10px 0; color: {{accentColor}}; font-size: 24px; letter-spacing: 1px; }
.title-block p { margin: 3px 0; font-size: 13px; }
.addresses { display: flex; gap: 30px; margin-bottom: 40px; }
.address-box { flex: 1; border: 1px solid #ddd; padding: 15px; }
.address-box h3 { background: #eee; margin: -15px -15px 15px -15px; padding: 8px 15px; font-size: 13px; text-transform: uppercase; color: #444; border-bottom: 1px solid #ddd; }
.address-box p { margin: 3px 0; font-size: 13px; white-space: pre-wrap; }
table.items { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
table.items th { background: {{accentColor}}; color: #fff; text-align: left; padding: 10px; font-size: 13px; }
table.items td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 13px; border-left: 1px solid #ddd; border-right: 1px solid #ddd; }
table.items th:nth-child(2), table.items td:nth-child(2), table.items th:nth-child(3), table.items td:nth-child(3), table.items th:nth-child(4), table.items td:nth-child(4) { text-align: right; }
.totals { display: flex; justify-content: space-between; gap: 30px; margin-bottom: 50px; }
.notes { flex: 2; }
.notes h3 { font-size: 13px; margin: 0 0 5px 0; text-transform: uppercase; }
.notes p { margin: 0; font-size: 12px; color: #555; white-space: pre-wrap; }
.calc { flex: 1; }
.calc p { display: flex; justify-content: space-between; margin: 5px 0; font-size: 14px; }
.grand-total { font-weight: bold; font-size: 18px !important; border-top: 2px solid #ddd; padding-top: 10px; margin-top: 10px !important; color: {{accentColor}}; }
.signatures { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 40px; }
.sig-line { width: 250px; border-top: 1px solid #000; text-align: center; }
.sig-line p { margin: 5px 0 0 0; font-size: 12px; color: #555; }`
  },
  "Delivery Note": {
    html: `<div class="doc">
  <header>
    <div class="title-block">
      <h2>DELIVERY NOTE</h2>
      <p>Note #: {{invoiceNumber}}</p>
      <p>Date: {{issueDate}}</p>
    </div>
    <div class="company-info">
      {{#if logoUrl}}<img src="{{logoUrl}}" class="logo" />{{/if}}
      <h1>{{companyName}}</h1>
      <p>{{companyAddress}}</p>
      <p>{{companyPhone}}</p>
    </div>
  </header>
  <div class="delivery-details">
    <div class="box">
      <h3>Deliver To</h3>
      <p><strong>{{clientName}}</strong></p>
      <p>{{clientAddress}}</p>
      {{#if clientEmail}}<p>{{clientEmail}}</p>{{/if}}
    </div>
    <div class="box">
      <h3>Order Details</h3>
      <p><strong>Ref PO:</strong> {{notes}}</p>
      <p><strong>Currency:</strong> {{currency}}</p>
    </div>
  </div>
  <table class="items">
    <thead>
      <tr>
        <th>Item Code / Description</th>
        <th>Ordered Qty</th>
        <th>Delivered Qty</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td></td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  <div class="footer">
    <div class="receive-box">
      <h4>Received By</h4>
      <p class="line">Name: ________________________</p>
      <p class="line">Signature: ____________________</p>
      <p class="line">Date: ________________________</p>
    </div>
  </div>
</div>`,
    css: `.doc { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.5; padding: 40px; box-sizing: border-box; }
header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #000; padding-bottom: 20px; }
.title-block h2 { margin: 0 0 10px 0; font-size: 32px; font-weight: 800; letter-spacing: -1px; text-transform: uppercase; }
.title-block p { margin: 3px 0; font-size: 14px; font-weight: 500; }
.company-info { text-align: right; }
.logo { max-width: 120px; max-height: 60px; margin-bottom: 10px; }
.company-info h1 { margin: 0 0 5px 0; font-size: 18px; }
.company-info p { margin: 2px 0; font-size: 12px; color: #666; }
.delivery-details { display: flex; gap: 30px; margin-bottom: 40px; }
.box { flex: 1; }
.box h3 { font-size: 14px; text-transform: uppercase; color: #fff; background: #000; padding: 5px 10px; margin: 0 0 10px 0; display: inline-block; }
.box p { margin: 3px 0; font-size: 14px; white-space: pre-wrap; }
table.items { width: 100%; border-collapse: collapse; margin-bottom: 50px; }
table.items th { background: #f0f0f0; text-align: left; padding: 12px; font-size: 13px; border: 1px solid #ccc; text-transform: uppercase; }
table.items td { padding: 15px 12px; border: 1px solid #ccc; font-size: 14px; }
table.items th:nth-child(2), table.items td:nth-child(2), table.items th:nth-child(3), table.items td:nth-child(3) { text-align: center; width: 150px; }
.footer { display: flex; justify-content: flex-end; margin-top: 40px; }
.receive-box { width: 350px; border: 2px dashed #ccc; padding: 20px; }
.receive-box h4 { margin: 0 0 20px 0; font-size: 16px; text-transform: uppercase; text-align: center; }
.line { margin: 20px 0; font-size: 14px; color: #555; }`
  }
};

const initialItems: LineItem[] = [
  { id: "1", description: "Web Design Services", quantity: 1, unitPrice: 1500 },
  { id: "2", description: "Hosting Setup", quantity: 1, unitPrice: 250 },
];

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);
  
  // App State
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem("docStudioState");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          customHtml: parsed.customHtml || defaultTemplates[parsed.docType as DocType]?.html || defaultTemplates.Invoice.html,
          customCss: parsed.customCss || defaultTemplates[parsed.docType as DocType]?.css || defaultTemplates.Invoice.css,
        };
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
    return {
      docType: "Invoice",
      companyName: "Acme Design Co.",
      companyAddress: "123 Creative Blvd\nDesign District\nNY 10001",
      companyCountry: "United States",
      companyPhone: "+1 (555) 123-4567",
      companyEmail: "hello@acmedesign.co",
      companyWebsite: "www.acmedesign.co",
      accentColor: "#3b82f6",
      logoUrl: "",
      clientName: "Client Inc.",
      clientAddress: "456 Enterprise Way\nSuite 200\nSF 10002",
      clientEmail: "billing@clientinc.com",
      invoiceNumber: "INV-2023-001",
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: "USD",
      taxRate: 0,
      notes: "Payment is due within 14 days. Thank you for your business!",
      items: initialItems,
      customHtml: defaultTemplates.Invoice.html,
      customCss: defaultTemplates.Invoice.css,
      useCustomCode: false
    };
  });

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("docStudioState", JSON.stringify(state));
    }
  }, [state, isLoaded]);

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleDocTypeChange = (v: DocType) => {
    updateState({ 
      docType: v,
      customHtml: defaultTemplates[v].html,
      customCss: defaultTemplates[v].css,
      useCustomCode: false
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateState({ logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const addLineItem = () => {
    updateState({
      items: [...state.items, { id: Math.random().toString(36).substr(2, 9), description: "", quantity: 1, unitPrice: 0 }]
    });
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    updateState({
      items: state.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    });
  };

  const removeLineItem = (id: string) => {
    updateState({ items: state.items.filter(item => item.id !== id) });
  };

  const handleDownload = () => {
    if (!previewRef.current) return;
    html2pdf().set({
      margin: 0,
      filename: `${state.docType.toLowerCase().replace(' ', '-')}-${state.invoiceNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(previewRef.current).save();
  };

  const handlePrint = () => {
    window.print();
  };

  const insertVariable = (variable: string) => {
    // Basic append for now, ideally would insert at cursor in CodeMirror
    updateState({ customHtml: state.customHtml + variable });
  };

  const renderPreview = () => {
    let renderedHtml = state.customHtml;
    let renderedCss = state.customCss;

    // Computed totals
    const subtotal = state.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * (state.taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    // Formatting helpers
    const formatMoney = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Variables replacement
    const vars: Record<string, string> = {
      companyName: state.companyName,
      companyAddress: state.companyAddress.replace(/\\n/g, '<br/>'),
      companyCountry: state.companyCountry,
      companyPhone: state.companyPhone,
      companyEmail: state.companyEmail,
      companyWebsite: state.companyWebsite,
      accentColor: state.accentColor,
      logoUrl: state.logoUrl,
      clientName: state.clientName,
      clientAddress: state.clientAddress.replace(/\\n/g, '<br/>'),
      clientEmail: state.clientEmail,
      invoiceNumber: state.invoiceNumber,
      issueDate: state.issueDate,
      dueDate: state.dueDate,
      currency: state.currency,
      taxRate: state.taxRate.toString(),
      notes: state.notes.replace(/\\n/g, '<br/>'),
      subtotal: formatMoney(subtotal),
      taxAmount: formatMoney(taxAmount),
      totalAmount: formatMoney(totalAmount),
    };

    // Conditional blocks removal if variable is empty
    renderedHtml = renderedHtml.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, v, content) => {
      return vars[v] ? content : '';
    });

    // Loop items
    renderedHtml = renderedHtml.replace(/\{\{#each items\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, content) => {
      return state.items.map(item => {
        let row = content;
        row = row.replace(/\{\{description\}\}/g, item.description);
        row = row.replace(/\{\{quantity\}\}/g, item.quantity.toString());
        row = row.replace(/\{\{unitPrice\}\}/g, formatMoney(item.unitPrice));
        row = row.replace(/\{\{total\}\}/g, formatMoney(item.quantity * item.unitPrice));
        row = row.replace(/\{\{currency\}\}/g, state.currency);
        return row;
      }).join('');
    });

    // Replace flat variables
    Object.keys(vars).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      renderedHtml = renderedHtml.replace(regex, vars[key] || '');
      renderedCss = renderedCss.replace(regex, vars[key] || '');
    });
    
    // Remaining variables that weren't matched
    renderedHtml = renderedHtml.replace(/\{\{[\w]+\}\}/g, '');

    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: renderedCss }} />
        <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
      </>
    );
  };

  if (!isLoaded) return null;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground selection:bg-accent/30 font-sans">
      {/* Left Panel */}
      <div className="w-[480px] flex-shrink-0 border-r border-border bg-card flex flex-col z-10 shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-border bg-background flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-accent text-accent-foreground flex items-center justify-center text-sm shadow-sm font-mono">D</div>
            DocStudio
          </h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Select value={state.docType} onValueChange={(v: DocType) => handleDocTypeChange(v)}>
                  <SelectTrigger className="w-[160px] h-8 text-xs font-medium bg-muted border-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Invoice">Invoice</SelectItem>
                    <SelectItem value="Utility Bill">Utility Bill</SelectItem>
                    <SelectItem value="Receipt">Receipt</SelectItem>
                    <SelectItem value="Purchase Order">Purchase Order</SelectItem>
                    <SelectItem value="Delivery Note">Delivery Note</SelectItem>
                  </SelectContent>
                </Select>
              </TooltipTrigger>
              <TooltipContent><p>Change Document Type</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Tabs 
          defaultValue="simple" 
          value={state.useCustomCode ? "advanced" : "simple"} 
          onValueChange={(v) => updateState({ useCustomCode: v === "advanced" })}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border bg-background p-0 h-11">
            <TabsTrigger value="simple" className="rounded-none data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-foreground text-muted-foreground font-medium tracking-wide text-xs uppercase">Editor</TabsTrigger>
            <TabsTrigger value="advanced" className="rounded-none data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-foreground text-muted-foreground font-medium tracking-wide text-xs uppercase">Code</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <TabsContent value="simple" className="m-0 p-5 space-y-8">
              
              {/* Branding Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-widest border-b border-border pb-1 w-full">Brand Identity</h3>
                </div>
                <div className="grid gap-4">
                  <div className="flex gap-4 items-start">
                    <div className="grid gap-1.5 flex-1">
                      <Label className="text-xs text-muted-foreground">Logo</Label>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {state.logoUrl ? (
                            <img src={state.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <Input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                          <Button variant="secondary" size="sm" className="w-full h-8 text-xs font-medium" onClick={() => document.getElementById('logo-upload')?.click()}>
                            Upload Logo
                          </Button>
                          {state.logoUrl && (
                            <Button variant="ghost" size="sm" className="w-full h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => updateState({ logoUrl: "" })}>
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Brand Color</Label>
                      <div className="flex gap-2">
                        <div className="relative w-10 h-10 rounded-md overflow-hidden border border-border flex-shrink-0 cursor-pointer ring-offset-background transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                          <input type="color" value={state.accentColor} onChange={e => updateState({ accentColor: e.target.value })} className="absolute -inset-2 w-16 h-16 cursor-pointer" />
                        </div>
                        <Input value={state.accentColor} onChange={e => updateState({ accentColor: e.target.value })} className="w-24 h-10 font-mono text-xs uppercase" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Company Name</Label>
                    <Input value={state.companyName} onChange={e => updateState({ companyName: e.target.value })} className="h-9" placeholder="Acme Corp" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Address</Label>
                    <Textarea value={state.companyAddress} onChange={e => updateState({ companyAddress: e.target.value })} rows={2} className="resize-none text-sm min-h-[60px]" placeholder="123 Business Rd..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Phone (Optional)</Label>
                      <Input value={state.companyPhone} onChange={e => updateState({ companyPhone: e.target.value })} className="h-9" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Email (Optional)</Label>
                      <Input value={state.companyEmail} onChange={e => updateState({ companyEmail: e.target.value })} className="h-9" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Document Details */}
              <section className="space-y-4">
                <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-widest border-b border-border pb-1">Document Meta</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Number / Reference</Label>
                    <Input value={state.invoiceNumber} onChange={e => updateState({ invoiceNumber: e.target.value })} className="h-9 font-mono text-xs" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Currency</Label>
                    <Select value={state.currency} onValueChange={v => updateState({ currency: v })}>
                      <SelectTrigger className="h-9 font-medium"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CAD">CAD ($)</SelectItem>
                        <SelectItem value="AUD">AUD ($)</SelectItem>
                        <SelectItem value="ZAR">ZAR (R)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Issue Date</Label>
                    <Input type="date" value={state.issueDate} onChange={e => updateState({ issueDate: e.target.value })} className="h-9 block" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Due Date</Label>
                    <Input type="date" value={state.dueDate} onChange={e => updateState({ dueDate: e.target.value })} className="h-9 block" />
                  </div>
                </div>
              </section>

              {/* Client Details */}
              <section className="space-y-4">
                <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-widest border-b border-border pb-1">Bill To / Ship To</h3>
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Client Name</Label>
                    <Input value={state.clientName} onChange={e => updateState({ clientName: e.target.value })} className="h-9" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Client Address</Label>
                    <Textarea value={state.clientAddress} onChange={e => updateState({ clientAddress: e.target.value })} rows={2} className="resize-none text-sm min-h-[60px]" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Client Email (Optional)</Label>
                    <Input value={state.clientEmail} onChange={e => updateState({ clientEmail: e.target.value })} className="h-9" />
                  </div>
                </div>
              </section>

              {/* Line Items */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-1">
                  <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-widest">Line Items</h3>
                  <Button variant="ghost" size="sm" onClick={addLineItem} className="h-6 px-2 text-xs text-accent hover:text-accent hover:bg-accent/10">
                    <Plus className="w-3 h-3 mr-1" /> Add Row
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {state.items.map((item, index) => (
                    <div key={item.id} className="group flex gap-2 items-start bg-muted/20 p-2 rounded-md border border-transparent hover:border-border transition-colors">
                      <div className="grid gap-2 flex-1">
                        <Input 
                          placeholder="Description..." 
                          value={item.description} 
                          onChange={e => updateLineItem(item.id, "description", e.target.value)}
                          className="h-8 text-sm font-medium bg-background border-border"
                        />
                        <div className="flex gap-2">
                          <div className="w-20 relative">
                            <Label className="sr-only">Qty</Label>
                            <Input 
                              type="number" 
                              min="0" step="1"
                              value={item.quantity || ''} 
                              onChange={e => updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm pl-7 bg-background"
                            />
                            <span className="absolute left-2 top-2 text-xs text-muted-foreground pointer-events-none">Qty</span>
                          </div>
                          <div className="flex-1 relative">
                            <Label className="sr-only">Price</Label>
                            <Input 
                              type="number" 
                              min="0" step="0.01"
                              value={item.unitPrice || ''} 
                              onChange={e => updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm pl-7 bg-background"
                            />
                            <span className="absolute left-2 top-2 text-xs text-muted-foreground pointer-events-none">{state.currency}</span>
                          </div>
                          <div className="w-24 h-8 bg-background border border-border rounded-md flex items-center justify-end px-3 text-sm font-medium text-muted-foreground">
                            {(item.quantity * item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10" onClick={() => removeLineItem(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex justify-end pt-3">
                    <div className="w-48 grid gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-medium">{state.items.reduce((a, b) => a + (b.quantity * b.unitPrice), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm gap-2">
                        <span className="text-muted-foreground">Tax (%):</span>
                        <Input 
                          type="number" 
                          min="0" max="100"
                          value={state.taxRate || ''} 
                          onChange={e => updateState({ taxRate: parseFloat(e.target.value) || 0 })}
                          className="h-7 w-16 text-right text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Notes */}
              <section className="space-y-4">
                <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-widest border-b border-border pb-1">Notes & Terms</h3>
                <Textarea 
                  value={state.notes} 
                  onChange={e => updateState({ notes: e.target.value })} 
                  rows={3} 
                  className="resize-none text-sm min-h-[80px]" 
                  placeholder="Thank you for your business!" 
                />
              </section>

            </TabsContent>

            <TabsContent value="advanced" className="m-0 p-5 space-y-5 h-full flex flex-col">
              <div className="bg-muted/50 border border-border rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-3 font-medium">Inject Variables at Cursor:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['{{companyName}}', '{{companyAddress}}', '{{clientName}}', '{{invoiceNumber}}', '{{issueDate}}', '{{dueDate}}', '{{totalAmount}}', '{{accentColor}}'].map(v => (
                    <button 
                      key={v}
                      onClick={() => insertVariable(v)}
                      className="px-2 py-1 bg-background border border-border hover:border-accent hover:text-accent rounded text-[10px] font-mono cursor-pointer transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs bg-background" onClick={() => {
                  updateState({
                    customHtml: defaultTemplates[state.docType].html,
                    customCss: defaultTemplates[state.docType].css,
                  });
                }}>
                  <RotateCcw className="w-3 h-3 mr-2" /> Reset Template
                </Button>
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs bg-background" onClick={() => updateState({ useCustomCode: false })}>
                  <Import className="w-3 h-3 mr-2" /> Return to Form
                </Button>
              </div>

              <div className="space-y-1.5 flex-1 min-h-[300px] flex flex-col">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">HTML Template</Label>
                </div>
                <div className="border border-border rounded-md overflow-hidden flex-1 [&>.cm-theme-one-dark]:h-full h-full relative">
                  <CodeMirror
                    value={state.customHtml}
                    height="100%"
                    extensions={[html()]}
                    theme={oneDark}
                    onChange={v => updateState({ customHtml: v })}
                    className="absolute inset-0"
                    basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
                  />
                </div>
              </div>

              <div className="space-y-1.5 flex-1 min-h-[250px] flex flex-col pb-4">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">CSS Styling</Label>
                <div className="border border-border rounded-md overflow-hidden flex-1 [&>.cm-theme-one-dark]:h-full h-full relative">
                  <CodeMirror
                    value={state.customCss}
                    height="100%"
                    extensions={[css()]}
                    theme={oneDark}
                    onChange={v => updateState({ customCss: v })}
                    className="absolute inset-0"
                    basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
                  />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 flex flex-col bg-black/90 relative">
        {/* Subtle noise texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
        
        <div className="h-14 border-b border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex items-center bg-white/5 rounded-md p-1 border border-white/5">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-sm" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}><ZoomOut className="w-3.5 h-3.5" /></Button>
            <span className="text-xs w-12 text-center font-mono text-white/90">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 rounded-sm" onClick={() => setZoom(z => Math.min(2, z + 0.1))}><ZoomIn className="w-3.5 h-3.5" /></Button>
          </div>
          
          <div className="text-xs font-mono text-white/40 uppercase tracking-widest hidden md:block">
            {state.docType} Preview
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white font-medium" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5 mr-2" /> Print
            </Button>
            <Button size="sm" className="h-8 bg-accent hover:bg-accent/90 text-accent-foreground font-medium border-none shadow-[0_0_15px_rgba(var(--accent),0.3)]" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5 mr-2" /> Export PDF
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-10 flex justify-center items-start print:p-0 print:overflow-visible custom-scrollbar z-10">
          {/* Document Container */}
          <div 
            className="bg-white text-black transition-transform origin-top print:shadow-none print:m-0"
            style={{ 
              width: "210mm", 
              minHeight: "297mm",
              transform: `scale(${zoom})`,
              marginBottom: `${(zoom - 1) * 297}mm`,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)",
            }}
          >
            <div ref={previewRef} className="w-full h-full bg-white relative box-border break-words">
              {renderPreview()}
            </div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.2); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(150, 150, 150, 0.4); }
      `}} />
    </div>
  );
}
