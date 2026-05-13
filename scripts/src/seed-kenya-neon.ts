/**
 * Kenya Budget Seed — uses @neondatabase/serverless (HTTP, no raw TCP needed)
 * Run: npx tsx scripts/src/seed-kenya-neon.ts
 */
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error("DATABASE_URL required"); process.exit(1); }

const sql = neon(connectionString);

const PASSWORD_HASH = "9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d";
const TOTAL_BUDGET = 1_000_000_000_000;

interface SD { name: string; code: string; depth: number; budget: number; children?: SD[]; }
interface FS  { id: number; parentId: number | null; name: string; code: string; depth: number; budget: number; }

let cnt = 1;
function nid() { return cnt++; }

function flatten(s: SD, pid: number | null): FS[] {
  const id = nid();
  const r: FS[] = [{ id, parentId: pid, name: s.name, code: s.code, depth: s.depth, budget: s.budget }];
  for (const c of s.children ?? []) r.push(...flatten(c, id));
  return r;
}

function unis(): SD[] {
  return [
    { name: "Kenyatta University (KU)", code: "KU", budget: 2_800_000_000 },
    { name: "University of Nairobi (UoN)", code: "UON", budget: 4_200_000_000 },
    { name: "Jomo Kenyatta University (JKUAT)", code: "JKUAT", budget: 3_100_000_000 },
    { name: "Moi University", code: "MOI-U", budget: 2_500_000_000 },
    { name: "Egerton University", code: "EGERTON", budget: 1_800_000_000 },
    { name: "Maseno University", code: "MASENO", budget: 1_400_000_000 },
    { name: "Technical University of Kenya (TUK)", code: "TUK", budget: 1_500_000_000 },
    { name: "University of Eldoret", code: "UOE", budget: 900_000_000 },
    { name: "Kisii University", code: "KISII-U", budget: 850_000_000 },
    { name: "Meru University of Science & Technology", code: "MUST", budget: 550_000_000 },
  ].map(u => ({
    name: u.name, code: u.code, depth: 3, budget: u.budget,
    children: ["Engineering","Business","Education"].map((s,i) => ({
      name: `${u.code} - School of ${s}`, code: `${u.code}-S${i+1}`, depth: 4,
      budget: Math.round(u.budget * 0.1),
      children: [
        { name: `${u.code}-S${i+1} Teaching Resources`, code: `${u.code}-S${i+1}-TR`, depth: 5, budget: Math.round(u.budget*0.02) },
      ],
    })),
  }));
}

function tvets(): SD[] {
  return ["Nairobi TTI","Mombasa TTI","Kisumu National Poly","Eldoret National Poly","Kabete National Poly",
    "Thika TTI","Nyeri National Poly","Meru National Poly","Nakuru TTI","Kakamega TTI"].map((name,i) => ({
    name, code: `TVET-${String(i+1).padStart(3,"0")}`, depth: 3,
    budget: 180_000_000 + Math.round(Math.random()*200_000_000),
    children: ["Electrical Eng","ICT","Building & Construction"].map((d,di) => ({
      name: `${name} - ${d}`, code: `TVET-${String(i+1).padStart(3,"0")}-D${di+1}`, depth: 4,
      budget: 30_000_000,
    })),
  }));
}

function countyEdu(): SD[] {
  return ["Nairobi","Mombasa","Kisumu","Nakuru","Kiambu","Machakos","Meru","Nyeri","Kisii","Kakamega","Bungoma","Kilifi","Garissa","Turkana","Embu"].map((c,i) => ({
    name: `${c} County Education Office`, code: `CEO-${String(i+1).padStart(3,"0")}`, depth: 3,
    budget: 400_000_000 + Math.round(Math.random()*300_000_000),
    children: [
      { name: `${c} - Primary Education`, code: `CEO-${String(i+1).padStart(3,"0")}-PE`, depth: 4, budget: 180_000_000 },
      { name: `${c} - Secondary Education`, code: `CEO-${String(i+1).padStart(3,"0")}-SE`, depth: 4, budget: 140_000_000 },
    ],
  }));
}

function countyHealth(): SD[] {
  return ["Nairobi","Mombasa","Kisumu","Nakuru","Eldoret","Nyeri","Meru","Embu","Kisii","Kakamega"].map((c,i) => ({
    name: `${c} County Health Services`, code: `CHS-${String(i+1).padStart(3,"0")}`, depth: 3,
    budget: 700_000_000 + Math.round(Math.random()*600_000_000),
    children: [
      { name: `${c} County Referral Hospital`, code: `CHS-${String(i+1).padStart(3,"0")}-RH`, depth: 4, budget: 300_000_000 },
      { name: `${c} Sub-County Health Centres`, code: `CHS-${String(i+1).padStart(3,"0")}-HC`, depth: 4, budget: 150_000_000 },
    ],
  }));
}

function buildTree(): SD {
  return {
    name: "Republic of Kenya National Budget", code: "GOK-NAT", depth: 0, budget: TOTAL_BUDGET,
    children: [
      { name:"Ministry of Education", code:"MOE", depth:1, budget:250_000_000_000, children:[
        { name:"State Dept for Higher Education", code:"SD-HE", depth:2, budget:95_000_000_000, children:[
          { name:"HELB", code:"HELB", depth:3, budget:30_000_000_000 },
          { name:"Universities Fund", code:"UF", depth:3, budget:45_000_000_000 },
          ...unis(),
        ]},
        { name:"State Dept for TVET", code:"SD-TVET", depth:2, budget:55_000_000_000, children:[
          { name:"TVETA", code:"TVETA", depth:3, budget:3_000_000_000 },
          { name:"KNEC", code:"KNEC", depth:3, budget:5_000_000_000 },
          ...tvets(),
        ]},
        { name:"State Dept for Basic Education", code:"SD-BE", depth:2, budget:100_000_000_000, children:[
          { name:"Teachers Service Commission (TSC)", code:"TSC", depth:3, budget:60_000_000_000 },
          { name:"KICD", code:"KICD", depth:3, budget:4_000_000_000 },
          ...countyEdu(),
        ]},
      ]},
      { name:"Ministry of Health", code:"MOH", depth:1, budget:180_000_000_000, children:[
        { name:"State Dept for Medical Services", code:"SD-MS", depth:2, budget:100_000_000_000, children:[
          { name:"KEMSA", code:"KEMSA", depth:3, budget:25_000_000_000 },
          { name:"Kenyatta National Hospital (KNH)", code:"KNH", depth:3, budget:12_000_000_000 },
          { name:"Moi Teaching & Referral Hospital", code:"MTRH", depth:3, budget:8_000_000_000 },
          ...countyHealth(),
        ]},
        { name:"State Dept for Public Health", code:"SD-PH", depth:2, budget:80_000_000_000, children:[
          { name:"KEMRI", code:"KEMRI", depth:3, budget:8_000_000_000 },
          { name:"National Public Health Laboratories", code:"NPHL", depth:3, budget:3_000_000_000 },
        ]},
      ]},
      { name:"Ministry of Defence", code:"MOD", depth:1, budget:120_000_000_000, children:[
        { name:"Kenya Defence Forces HQ", code:"KDF-HQ", depth:2, budget:60_000_000_000, children:[
          { name:"Kenya Army", code:"KA", depth:3, budget:30_000_000_000, children:[
            { name:"KA Logistics Command", code:"KA-LC", depth:4, budget:12_000_000_000 },
            { name:"KA Training Command", code:"KA-TC", depth:4, budget:8_000_000_000 },
          ]},
          { name:"Kenya Air Force", code:"KAF", depth:3, budget:18_000_000_000 },
          { name:"Kenya Navy", code:"KN", depth:3, budget:12_000_000_000 },
        ]},
        { name:"National Intelligence Service", code:"NIS", depth:2, budget:40_000_000_000 },
        { name:"Defence Finance & Admin", code:"DFA", depth:2, budget:20_000_000_000 },
      ]},
      { name:"Ministry of Roads & Infrastructure", code:"MORI", depth:1, budget:150_000_000_000, children:[
        { name:"Kenya National Highways Authority (KeNHA)", code:"KENHA", depth:2, budget:80_000_000_000, children:[
          { name:"KeNHA Northern Corridor", code:"KENHA-NC", depth:3, budget:25_000_000_000 },
          { name:"KeNHA Southern Corridor", code:"KENHA-SC", depth:3, budget:20_000_000_000 },
          { name:"KeNHA Western Region", code:"KENHA-WR", depth:3, budget:18_000_000_000 },
          { name:"KeNHA Eastern Region", code:"KENHA-ER", depth:3, budget:12_000_000_000 },
        ]},
        { name:"Kenya Urban Roads Authority (KURA)", code:"KURA", depth:2, budget:30_000_000_000, children:[
          { name:"KURA Nairobi Region", code:"KURA-NBI", depth:3, budget:12_000_000_000 },
          { name:"KURA Mombasa Region", code:"KURA-MSA", depth:3, budget:8_000_000_000 },
        ]},
        { name:"Kenya Rural Roads Authority (KeRRA)", code:"KERRA", depth:2, budget:25_000_000_000 },
        { name:"Kenya Railways Corporation", code:"KRC", depth:2, budget:10_000_000_000 },
        { name:"Kenya Airports Authority (KAA)", code:"KAA", depth:2, budget:5_000_000_000 },
      ]},
      { name:"Ministry of Agriculture", code:"MOA", depth:1, budget:80_000_000_000, children:[
        { name:"State Dept for Crop Development", code:"SD-CROP", depth:2, budget:30_000_000_000, children:[
          { name:"KALRO", code:"KALRO", depth:3, budget:5_000_000_000 },
          { name:"AFC", code:"AFC", depth:3, budget:5_000_000_000 },
        ]},
        { name:"State Dept for Livestock", code:"SD-LIVE", depth:2, budget:20_000_000_000, children:[
          { name:"Kenya Meat Commission", code:"KMC", depth:3, budget:3_000_000_000 },
          { name:"Kenya Dairy Board", code:"KDB", depth:3, budget:2_000_000_000 },
        ]},
        { name:"National Irrigation Authority", code:"NIA", depth:2, budget:15_000_000_000 },
        { name:"State Dept for Fisheries", code:"SD-FISH", depth:2, budget:15_000_000_000 },
      ]},
      { name:"Ministry of Interior & National Administration", code:"MOINA", depth:1, budget:100_000_000_000, children:[
        { name:"National Police Service (NPS)", code:"NPS", depth:2, budget:60_000_000_000, children:[
          { name:"Kenya Police Service", code:"KPS", depth:3, budget:30_000_000_000, children:[
            { name:"KPS Operations", code:"KPS-OP", depth:4, budget:15_000_000_000 },
            { name:"Criminal Investigations (DCI)", code:"DCI", depth:4, budget:5_000_000_000 },
          ]},
          { name:"Administration Police Service", code:"APS", depth:3, budget:15_000_000_000 },
        ]},
        { name:"National Registration Bureau", code:"NRB", depth:2, budget:8_000_000_000 },
        { name:"Department of Immigration", code:"DIM", depth:2, budget:5_000_000_000 },
        { name:"Kenya Prisons Service", code:"KPS-PR", depth:2, budget:15_000_000_000 },
        { name:"National Disaster Management Authority", code:"NDMA", depth:2, budget:12_000_000_000 },
      ]},
      { name:"Ministry of ICT & Digital Economy", code:"MOICT", depth:1, budget:50_000_000_000, children:[
        { name:"ICT Authority", code:"ICTA", depth:2, budget:15_000_000_000, children:[
          { name:"ICTA Digital Services", code:"ICTA-DS", depth:3, budget:5_000_000_000 },
          { name:"ICTA Government Cloud", code:"ICTA-GC", depth:3, budget:4_000_000_000 },
          { name:"ICTA Cyber Security", code:"ICTA-CS", depth:3, budget:3_000_000_000 },
        ]},
        { name:"Communications Authority of Kenya", code:"CA", depth:2, budget:10_000_000_000 },
        { name:"Konza Technopolis Development Authority", code:"KOTDA", depth:2, budget:8_000_000_000 },
        { name:"Kenya Broadcasting Corporation", code:"KBC", depth:2, budget:5_000_000_000 },
        { name:"Postal Corporation of Kenya", code:"PCK", depth:2, budget:3_000_000_000 },
      ]},
      { name:"Ministry of Energy & Petroleum", code:"MOEP", depth:1, budget:70_000_000_000, children:[
        { name:"State Dept for Energy", code:"SD-EN", depth:2, budget:35_000_000_000, children:[
          { name:"Kenya Power & Lighting Company (KPLC)", code:"KPLC", depth:3, budget:15_000_000_000, children:[
            { name:"KPLC Transmission", code:"KPLC-TR", depth:4, budget:5_000_000_000 },
            { name:"KPLC Distribution", code:"KPLC-DI", depth:4, budget:5_000_000_000 },
          ]},
          { name:"KenGen", code:"KENGEN", depth:3, budget:10_000_000_000 },
          { name:"Rural Electrification Authority", code:"REA", depth:3, budget:3_000_000_000 },
          { name:"KETRACO", code:"KETRACO", depth:3, budget:5_000_000_000 },
        ]},
        { name:"State Dept for Petroleum", code:"SD-PET", depth:2, budget:20_000_000_000, children:[
          { name:"Kenya Pipeline Company", code:"KPC", depth:3, budget:7_000_000_000 },
          { name:"National Oil Corporation", code:"NOCK", depth:3, budget:8_000_000_000 },
        ]},
        { name:"Nuclear Power & Energy Agency", code:"NUPEA", depth:2, budget:15_000_000_000 },
      ]},
    ],
  };
}

async function batchQuery(queries: { query: string; params: any[] }[]) {
  // Execute queries one-by-one (neon http doesn't support transactions natively in tagged template)
  for (const q of queries) {
    await sql.query(q.query, q.params);
  }
}

async function main() {
  cnt = 1;
  const sectors = flatten(buildTree(), null);
  console.log(`Sectors to insert: ${sectors.length}`);

  // Clean tables
  console.log("Cleaning tables...");
  for (const t of ["notification_recipients","notifications","purchase_order_items","purchase_orders","revocations","allocations","budget_cycles","audit_logs","sector_controls","approval_limits","users","sectors","products"]) {
    try { await sql.query(`DELETE FROM ${t}`); } catch {}
  }

  // max_depth_visible
  await sql.query("ALTER TABLE sectors ADD COLUMN IF NOT EXISTS max_depth_visible INTEGER NOT NULL DEFAULT 1").catch(()=>{});

  // Insert sectors in chunks of 20 (neon http has a payload limit)
  console.log("Inserting sectors...");
  for (let i = 0; i < sectors.length; i += 20) {
    const chunk = sectors.slice(i, i+20);
    const vals = chunk.map((_,j)=>`($${j*6+1},$${j*6+2},$${j*6+3},$${j*6+4},$${j*6+5},$${j*6+6},NOW(),NOW())`).join(",");
    const params: any[] = [];
    chunk.forEach(s=>params.push(s.id,s.parentId,s.name,s.code,s.depth,s.depth<=1?2:1));
    await sql.query(`INSERT INTO sectors (id,parent_id,name,code,depth,max_depth_visible,created_at,updated_at) VALUES ${vals}`, params);
    process.stdout.write(`\r  sectors: ${Math.min(i+20,sectors.length)}/${sectors.length}`);
  }
  await sql.query(`SELECT setval('sectors_id_seq',(SELECT MAX(id) FROM sectors))`);
  console.log("\nSectors done.");

  // Build users
  const fns = ["James","Mary","John","Grace","Peter","Faith","David","Mercy","Joseph","Joy","Daniel","Esther","Samuel","Anne","Michael","Christine","Stephen","Lucy","George","Alice"];
  const lns = ["Odhiambo","Wanjiku","Kamau","Otieno","Njoroge","Mwangi","Kipchoge","Cherop","Mutai","Achieng","Kiprotich","Wambui","Omondi","Nyambura","Koech","Kariuki","Sang","Muthoni","Rono","Wairimu"];
  const usedEmails = new Set<string>();
  function roleFor(d:number){return d===0?"super_admin":d===1?"ceo":d===2?"ministry_head":"department_head";}
  function titleFor(d:number){return d===0?"Controller":d===1?"CS":d===2?"PS":d===3?"Director":"HOD";}
  function mkName(u:number){return`${fns[u%fns.length]} ${lns[Math.floor(u/fns.length)%lns.length]}`;}
  function mkEmail(code:string,pfx:string,uid:number){
    const b=`${pfx}.${code.toLowerCase().replace(/[^a-z0-9]/g,"")}@budget.go.ke`;
    const e=usedEmails.has(b)?`${pfx}.${code.toLowerCase().replace(/[^a-z0-9]/g,"")}.${uid}@budget.go.ke`:b;
    usedEmails.add(e);return e;
  }
  const users: any[][] = [];
  let uid = 1;
  for (const s of sectors) {
    const hasChildren = sectors.some(c=>c.parentId===s.id);
    users.push([uid++,`${titleFor(s.depth)} ${mkName(uid)}`,mkEmail(s.code,titleFor(s.depth).toLowerCase(),uid),PASSWORD_HASH,roleFor(s.depth),s.id]);
    if (hasChildren) users.push([uid++,`Admin ${mkName(uid)}`,mkEmail(s.code,"admin",uid),PASSWORD_HASH,s.depth<=1?"super_admin":"ministry_head",s.id]);
  }
  users.push([uid,"Budget Auditor","auditor@budget.go.ke",PASSWORD_HASH,"viewer",sectors[0].id]);

  console.log(`Inserting ${users.length} users...`);
  for (let i = 0; i < users.length; i += 20) {
    const chunk = users.slice(i, i+20);
    const vals = chunk.map((_,j)=>`($${j*6+1},$${j*6+2},$${j*6+3},$${j*6+4},$${j*6+5},$${j*6+6},NOW(),NOW())`).join(",");
    await sql.query(`INSERT INTO users (id,name,email,password_hash,role,sector_id,created_at,updated_at) VALUES ${vals}`, chunk.flat());
    process.stdout.write(`\r  users: ${Math.min(i+20,users.length)}/${users.length}`);
  }
  await sql.query(`SELECT setval('users_id_seq',(SELECT MAX(id) FROM users))`);
  console.log("\nUsers done.");

  // Budget cycle
  await sql.query(`INSERT INTO budget_cycles (id,name,start_date,end_date,total_budget,is_active,created_by,created_at,updated_at) VALUES (1,'FY 2025/2026','2025-07-01','2026-06-30',$1,true,1,NOW(),NOW())`, [TOTAL_BUDGET]);
  console.log("Budget cycle done.");

  // Allocations
  const allocRows: {from:number;to:number;amount:number}[] = [];
  function collectAllocs(pid: number) {
    for (const c of sectors.filter(s=>s.parentId===pid)) { allocRows.push({from:pid,to:c.id,amount:c.budget}); collectAllocs(c.id); }
  }
  collectAllocs(sectors[0].id);

  console.log(`Inserting ${allocRows.length} allocations...`);
  for (let i = 0; i < allocRows.length; i += 20) {
    const chunk = allocRows.slice(i, i+20);
    const vals = chunk.map((_,j)=>`($${j*4+1},1,$${j*4+2},$${j*4+3},$${j*4+4},'active',1,NOW(),NOW(),NOW())`).join(",");
    const params: any[] = [];
    chunk.forEach((a,j)=>params.push(i+j+1,a.from,a.to,a.amount));
    await sql.query(`INSERT INTO allocations (id,budget_cycle_id,from_sector_id,to_sector_id,amount,status,allocated_by,allocated_at,created_at,updated_at) VALUES ${vals}`, params);
    process.stdout.write(`\r  allocations: ${Math.min(i+20,allocRows.length)}/${allocRows.length}`);
  }
  await sql.query(`SELECT setval('allocations_id_seq',${allocRows.length})`);
  console.log("\nAllocations done.");

  // Products
  const products: [number,string,string,string,number][] = [
    [1,"Desktop Computer","ICT Equipment","unit",85000],
    [2,"Laptop Computer","ICT Equipment","unit",120000],
    [3,"Office Desk","Furniture","unit",25000],
    [4,"Office Chair","Furniture","unit",15000],
    [5,"Projector","ICT Equipment","unit",95000],
    [6,"Printer (Laser)","ICT Equipment","unit",45000],
    [7,"Textbooks (Set)","Teaching Aids","set",12000],
    [8,"Lab Equipment Kit","Lab Equipment","kit",350000],
    [9,"Medical Supplies Kit","Medical","kit",180000],
    [10,"Ambulance","Vehicles","unit",8500000],
    [11,"School Bus","Vehicles","unit",6500000],
    [12,"Server Rack","ICT Equipment","unit",450000],
    [13,"Network Switch (48-port)","ICT Equipment","unit",65000],
    [14,"Welding Machine","Workshop Equipment","unit",180000],
    [15,"Tractor","Agriculture","unit",4500000],
    [16,"Water Pump","Agriculture","unit",120000],
    [17,"Solar Panel Kit (5kW)","Energy","kit",750000],
    [18,"Security Camera System","Security","system",250000],
    [19,"Whiteboard","Teaching Aids","unit",8000],
    [20,"Automotive Diagnostic Tool","Workshop Equipment","unit",350000],
  ];
  const pVals = products.map((_,j)=>`($${j*5+1},$${j*5+2},$${j*5+3},$${j*5+4},$${j*5+5},NOW(),NOW())`).join(",");
  await sql.query(`INSERT INTO products (id,name,category,unit,unit_price,created_at,updated_at) VALUES ${pVals}`, products.flat());
  await sql.query(`SELECT setval('products_id_seq',20)`);

  console.log("\n=== Seed complete! ===");
  console.log(`Sectors: ${sectors.length}  Users: ${users.length}  Allocations: ${allocRows.length}  Products: ${products.length}`);
  console.log(`Total Budget: KES ${TOTAL_BUDGET.toLocaleString()}`);
}

main().catch(e => { console.error(e); process.exit(1); });
