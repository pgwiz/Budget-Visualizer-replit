import { Router } from "express";
import { pool } from "@workspace/db";

const router = Router();

const PASSWORD_HASH = "9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d";
const TOTAL_BUDGET = 1_000_000_000_000;

interface SD { name: string; code: string; depth: number; budget: number; children?: SD[]; }

let idCounter = 1;
function nextId() { return idCounter++; }

function generateUniversities(): SD[] {
  const universities = [
    { name: "Kenyatta University (KU)", code: "KU", budget: 2_800_000_000 },
    { name: "University of Nairobi (UoN)", code: "UON", budget: 4_200_000_000 },
    { name: "Jomo Kenyatta University (JKUAT)", code: "JKUAT", budget: 3_100_000_000 },
    { name: "Moi University", code: "MOI-U", budget: 2_500_000_000 },
    { name: "Egerton University", code: "EGERTON", budget: 1_800_000_000 },
    { name: "Maseno University", code: "MASENO", budget: 1_400_000_000 },
    { name: "Masinde Muliro University (MMUST)", code: "MMUST", budget: 1_200_000_000 },
    { name: "Dedan Kimathi University", code: "DEKUT", budget: 1_100_000_000 },
    { name: "Technical University of Kenya (TUK)", code: "TUK", budget: 1_500_000_000 },
    { name: "Technical University of Mombasa (TUM)", code: "TUM", budget: 1_000_000_000 },
    { name: "Karatina University", code: "KARU", budget: 800_000_000 },
    { name: "University of Eldoret", code: "UOE", budget: 900_000_000 },
    { name: "Kisii University", code: "KISII-U", budget: 850_000_000 },
    { name: "Meru University of Science & Technology", code: "MUST", budget: 550_000_000 },
  ];
  const schools = ["School of Engineering","School of Business","School of Education","School of Science","School of Medicine"];
  return universities.map(u => ({
    name: u.name, code: u.code, depth: 3, budget: u.budget,
    children: schools.slice(0, 3).map((s, i) => ({
      name: `${u.code} - ${s}`, code: `${u.code}-S${i+1}`, depth: 4,
      budget: Math.round(u.budget * 0.1),
      children: [
        { name: `${u.code}-S${i+1} Teaching Resources`, code: `${u.code}-S${i+1}-TR`, depth: 5, budget: Math.round(u.budget * 0.02) },
        { name: `${u.code}-S${i+1} Research Lab`, code: `${u.code}-S${i+1}-RL`, depth: 5, budget: Math.round(u.budget * 0.015) },
      ],
    })),
  }));
}

function generateTVETs(): SD[] {
  const tvets = [
    "Nairobi Technical Training Institute","Mombasa Technical Training Institute",
    "Kisumu National Polytechnic","Eldoret National Polytechnic",
    "Kabete National Polytechnic","Thika Technical Training Institute",
    "Nyeri National Polytechnic","Meru National Polytechnic",
    "Nakuru Technical Training Institute","Kakamega Technical Training Institute",
  ];
  const depts = ["Automotive Engineering","Electrical Engineering","ICT","Building & Construction","Business Studies"];
  return tvets.map((name, idx) => {
    const code = `TVET-${String(idx+1).padStart(3,"0")}`;
    const budget = 150_000_000 + Math.round(Math.random() * 300_000_000);
    return {
      name, code, depth: 3, budget,
      children: depts.slice(0, 3).map((dept, di) => ({
        name: `${name.split(" ").slice(0,2).join(" ")} - ${dept}`,
        code: `${code}-D${di+1}`, depth: 4,
        budget: Math.round(budget * 0.1),
      })),
    };
  });
}

function generateCountyEducation(): SD[] {
  const counties = ["Nairobi","Mombasa","Kisumu","Nakuru","Kiambu","Machakos","Meru","Nyeri","Embu","Kisii","Kakamega","Bungoma","Kilifi","Garissa","Turkana"];
  return counties.map((county, i) => ({
    name: `${county} County Education Office`, code: `CEO-${String(i+1).padStart(3,"0")}`, depth: 3,
    budget: 400_000_000 + Math.round(Math.random() * 400_000_000),
    children: [
      { name: `${county} - Primary Education`, code: `CEO-${String(i+1).padStart(3,"0")}-PE`, depth: 4, budget: 180_000_000 },
      { name: `${county} - Secondary Education`, code: `CEO-${String(i+1).padStart(3,"0")}-SE`, depth: 4, budget: 140_000_000 },
    ],
  }));
}

function buildTree(): SD {
  return {
    name: "Republic of Kenya National Budget", code: "GOK-NAT", depth: 0, budget: TOTAL_BUDGET,
    children: [
      { name: "Ministry of Education", code: "MOE", depth: 1, budget: 250_000_000_000, children: [
        { name: "State Dept for Higher Education", code: "SD-HE", depth: 2, budget: 95_000_000_000,
          children: [
            { name: "HELB", code: "HELB", depth: 3, budget: 30_000_000_000 },
            { name: "Universities Fund", code: "UF", depth: 3, budget: 45_000_000_000 },
            ...generateUniversities(),
          ]},
        { name: "State Dept for TVET", code: "SD-TVET", depth: 2, budget: 55_000_000_000,
          children: [
            { name: "TVETA", code: "TVETA", depth: 3, budget: 3_000_000_000 },
            { name: "KNEC", code: "KNEC", depth: 3, budget: 5_000_000_000 },
            ...generateTVETs(),
          ]},
        { name: "State Dept for Basic Education", code: "SD-BE", depth: 2, budget: 100_000_000_000,
          children: [
            { name: "Teachers Service Commission (TSC)", code: "TSC", depth: 3, budget: 60_000_000_000 },
            { name: "KICD", code: "KICD", depth: 3, budget: 4_000_000_000 },
            ...generateCountyEducation(),
          ]},
      ]},
      { name: "Ministry of Health", code: "MOH", depth: 1, budget: 180_000_000_000, children: [
        { name: "State Dept for Medical Services", code: "SD-MS", depth: 2, budget: 100_000_000_000, children: [
          { name: "KEMSA", code: "KEMSA", depth: 3, budget: 25_000_000_000 },
          { name: "Kenyatta National Hospital (KNH)", code: "KNH", depth: 3, budget: 12_000_000_000 },
          { name: "Moi Teaching & Referral Hospital", code: "MTRH", depth: 3, budget: 8_000_000_000 },
          ...["Nairobi","Mombasa","Kisumu","Nakuru","Eldoret","Nyeri","Meru","Embu","Kisii","Kakamega"].map((c,i) => ({
            name: `${c} County Health Services`, code: `CHS-${String(i+1).padStart(3,"0")}`, depth: 3,
            budget: 700_000_000 + Math.round(Math.random() * 800_000_000),
            children: [
              { name: `${c} County Referral Hospital`, code: `CHS-${String(i+1).padStart(3,"0")}-RH`, depth: 4, budget: 300_000_000 },
            ],
          })),
        ]},
        { name: "State Dept for Public Health", code: "SD-PH", depth: 2, budget: 80_000_000_000, children: [
          { name: "KEMRI", code: "KEMRI", depth: 3, budget: 8_000_000_000 },
          { name: "National Public Health Laboratories", code: "NPHL", depth: 3, budget: 3_000_000_000 },
        ]},
      ]},
      { name: "Ministry of Defence", code: "MOD", depth: 1, budget: 120_000_000_000, children: [
        { name: "Kenya Defence Forces HQ", code: "KDF-HQ", depth: 2, budget: 60_000_000_000, children: [
          { name: "Kenya Army", code: "KA", depth: 3, budget: 30_000_000_000, children: [
            { name: "KA Logistics Command", code: "KA-LC", depth: 4, budget: 12_000_000_000 },
            { name: "KA Training Command", code: "KA-TC", depth: 4, budget: 8_000_000_000 },
          ]},
          { name: "Kenya Air Force", code: "KAF", depth: 3, budget: 18_000_000_000 },
          { name: "Kenya Navy", code: "KN", depth: 3, budget: 12_000_000_000 },
        ]},
        { name: "National Intelligence Service", code: "NIS", depth: 2, budget: 40_000_000_000 },
        { name: "Defence Finance & Admin", code: "DFA", depth: 2, budget: 20_000_000_000 },
      ]},
      { name: "Ministry of Roads & Infrastructure", code: "MORI", depth: 1, budget: 150_000_000_000, children: [
        { name: "Kenya National Highways Authority (KeNHA)", code: "KENHA", depth: 2, budget: 80_000_000_000, children: [
          { name: "KeNHA Northern Corridor", code: "KENHA-NC", depth: 3, budget: 25_000_000_000 },
          { name: "KeNHA Southern Corridor", code: "KENHA-SC", depth: 3, budget: 20_000_000_000 },
          { name: "KeNHA Western Region", code: "KENHA-WR", depth: 3, budget: 18_000_000_000 },
          { name: "KeNHA Eastern Region", code: "KENHA-ER", depth: 3, budget: 12_000_000_000 },
        ]},
        { name: "Kenya Urban Roads Authority (KURA)", code: "KURA", depth: 2, budget: 30_000_000_000, children: [
          { name: "KURA Nairobi Region", code: "KURA-NBI", depth: 3, budget: 12_000_000_000 },
          { name: "KURA Mombasa Region", code: "KURA-MSA", depth: 3, budget: 8_000_000_000 },
        ]},
        { name: "Kenya Rural Roads Authority (KeRRA)", code: "KERRA", depth: 2, budget: 25_000_000_000 },
        { name: "Kenya Railways Corporation", code: "KRC", depth: 2, budget: 10_000_000_000 },
        { name: "Kenya Airports Authority (KAA)", code: "KAA", depth: 2, budget: 5_000_000_000 },
      ]},
      { name: "Ministry of Agriculture", code: "MOA", depth: 1, budget: 80_000_000_000, children: [
        { name: "State Dept for Crop Development", code: "SD-CROP", depth: 2, budget: 30_000_000_000, children: [
          { name: "KALRO", code: "KALRO", depth: 3, budget: 5_000_000_000 },
          { name: "AFC", code: "AFC", depth: 3, budget: 5_000_000_000 },
        ]},
        { name: "State Dept for Livestock", code: "SD-LIVE", depth: 2, budget: 20_000_000_000, children: [
          { name: "Kenya Meat Commission", code: "KMC", depth: 3, budget: 3_000_000_000 },
          { name: "Kenya Dairy Board", code: "KDB", depth: 3, budget: 2_000_000_000 },
        ]},
        { name: "National Irrigation Authority (NIA)", code: "NIA", depth: 2, budget: 15_000_000_000 },
        { name: "State Dept for Fisheries", code: "SD-FISH", depth: 2, budget: 15_000_000_000 },
      ]},
      { name: "Ministry of Interior & National Administration", code: "MOINA", depth: 1, budget: 100_000_000_000, children: [
        { name: "National Police Service (NPS)", code: "NPS", depth: 2, budget: 60_000_000_000, children: [
          { name: "Kenya Police Service", code: "KPS", depth: 3, budget: 30_000_000_000, children: [
            { name: "KPS Operations", code: "KPS-OP", depth: 4, budget: 15_000_000_000 },
            { name: "KPS Criminal Investigations (DCI)", code: "DCI", depth: 4, budget: 5_000_000_000 },
          ]},
          { name: "Administration Police Service", code: "APS", depth: 3, budget: 15_000_000_000 },
        ]},
        { name: "National Registration Bureau", code: "NRB", depth: 2, budget: 8_000_000_000 },
        { name: "Department of Immigration", code: "DIM", depth: 2, budget: 5_000_000_000 },
        { name: "Kenya Prisons Service", code: "KPS-PR", depth: 2, budget: 15_000_000_000 },
        { name: "National Disaster Management Authority", code: "NDMA", depth: 2, budget: 12_000_000_000 },
      ]},
      { name: "Ministry of ICT & Digital Economy", code: "MOICT", depth: 1, budget: 50_000_000_000, children: [
        { name: "ICT Authority", code: "ICTA", depth: 2, budget: 15_000_000_000, children: [
          { name: "ICTA Digital Services", code: "ICTA-DS", depth: 3, budget: 5_000_000_000 },
          { name: "ICTA Government Cloud", code: "ICTA-GC", depth: 3, budget: 4_000_000_000 },
          { name: "ICTA Cyber Security", code: "ICTA-CS", depth: 3, budget: 3_000_000_000 },
        ]},
        { name: "Communications Authority of Kenya", code: "CA", depth: 2, budget: 10_000_000_000 },
        { name: "Konza Technopolis Development Authority", code: "KOTDA", depth: 2, budget: 8_000_000_000 },
        { name: "Kenya Broadcasting Corporation", code: "KBC", depth: 2, budget: 5_000_000_000 },
        { name: "Postal Corporation of Kenya", code: "PCK", depth: 2, budget: 3_000_000_000 },
      ]},
      { name: "Ministry of Energy & Petroleum", code: "MOEP", depth: 1, budget: 70_000_000_000, children: [
        { name: "State Dept for Energy", code: "SD-EN", depth: 2, budget: 35_000_000_000, children: [
          { name: "Kenya Power & Lighting Company (KPLC)", code: "KPLC", depth: 3, budget: 15_000_000_000, children: [
            { name: "KPLC Transmission", code: "KPLC-TR", depth: 4, budget: 5_000_000_000 },
            { name: "KPLC Distribution", code: "KPLC-DI", depth: 4, budget: 5_000_000_000 },
          ]},
          { name: "KenGen", code: "KENGEN", depth: 3, budget: 10_000_000_000 },
          { name: "Rural Electrification Authority (REA)", code: "REA", depth: 3, budget: 3_000_000_000 },
          { name: "KETRACO", code: "KETRACO", depth: 3, budget: 5_000_000_000 },
        ]},
        { name: "State Dept for Petroleum", code: "SD-PET", depth: 2, budget: 20_000_000_000, children: [
          { name: "Kenya Pipeline Company", code: "KPC", depth: 3, budget: 7_000_000_000 },
          { name: "National Oil Corporation", code: "NOCK", depth: 3, budget: 8_000_000_000 },
        ]},
        { name: "Nuclear Power & Energy Agency", code: "NUPEA", depth: 2, budget: 15_000_000_000 },
      ]},
    ],
  };
}

interface FlatSector { id: number; parentId: number | null; name: string; code: string; depth: number; budget: number; }

function flatten(s: SD, parentId: number | null): FlatSector[] {
  const id = nextId();
  const result: FlatSector[] = [{ id, parentId, name: s.name, code: s.code, depth: s.depth, budget: s.budget }];
  for (const c of s.children ?? []) result.push(...flatten(c, id));
  return result;
}

router.post("/admin/seed", async (_req, res): Promise<void> => {
  const client = await pool.connect();
  try {
    idCounter = 1;
    const tree = buildTree();
    const sectors = flatten(tree, null);

    await client.query("BEGIN");

    // Clean existing (order for FKs)
    for (const t of ["notification_recipients","notifications","purchase_order_items","purchase_orders","revocations","allocations","budget_cycles","audit_logs","sector_controls","approval_limits","users","sectors","products"]) {
      try { await client.query(`DELETE FROM ${t}`); } catch {}
    }

    // ensure max_depth_visible column
    await client.query("ALTER TABLE sectors ADD COLUMN IF NOT EXISTS max_depth_visible INTEGER NOT NULL DEFAULT 1").catch(() => {});

    // Insert sectors in chunks of 50
    for (let i = 0; i < sectors.length; i += 50) {
      const chunk = sectors.slice(i, i + 50);
      const vals: string[] = [];
      const params: any[] = [];
      chunk.forEach((s, j) => {
        const b = j * 6;
        vals.push(`($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},NOW(),NOW())`);
        params.push(s.id, s.parentId, s.name, s.code, s.depth, s.depth <= 1 ? 2 : 1);
      });
      await client.query(`INSERT INTO sectors (id,parent_id,name,code,depth,max_depth_visible,created_at,updated_at) VALUES ${vals.join(",")}`, params);
    }
    await client.query(`SELECT setval('sectors_id_seq',(SELECT MAX(id) FROM sectors))`);

    // Generate users
    const firstNames = ["James","Mary","John","Grace","Peter","Faith","David","Mercy","Joseph","Joy","Daniel","Esther","Samuel","Anne","Michael","Christine","Stephen","Lucy","George","Alice","Patrick","Elizabeth","Paul","Jane","Martin","Beatrice","Francis","Caroline","Charles","Florence","Robert","Sarah","Thomas","Margaret","Brian","Hellen","Dennis","Irene","Philip","Catherine"];
    const lastNames = ["Odhiambo","Wanjiku","Kamau","Otieno","Njoroge","Mwangi","Kipchoge","Cherop","Mutai","Achieng","Kiprotich","Wambui","Omondi","Nyambura","Koech","Kariuki","Sang","Muthoni","Rono","Wairimu","Kimutai","Njeri","Kiprop","Gathoni","Langat","Mumbi","Chesang","Wangari","Kibet","Nyokabi","Barasa","Makena","Wafula","Kagure","Simiyu","Wangui","Masinde","Nyaguthii","Juma","Wacera"];
    const usedEmails = new Set<string>();

    function roleFor(depth: number) { if(depth===0)return"super_admin"; if(depth===1)return"ceo"; if(depth===2)return"ministry_head"; return"department_head"; }
    function titleFor(depth: number) { if(depth===0)return"Controller"; if(depth===1)return"CS"; if(depth===2)return"PS"; if(depth===3)return"Director"; return"HOD"; }
    function makeName(seed: number) { return `${firstNames[seed%firstNames.length]} ${lastNames[Math.floor(seed/firstNames.length)%lastNames.length]}`; }
    function makeEmail(code: string, prefix: string, uid: number) {
      const base = `${prefix}.${code.toLowerCase().replace(/[^a-z0-9]/g,"")}@budget.go.ke`;
      const e = usedEmails.has(base) ? `${prefix}.${code.toLowerCase().replace(/[^a-z0-9]/g,"")}.${uid}@budget.go.ke` : base;
      usedEmails.add(e); return e;
    }

    const users: any[] = [];
    let uid = 1;
    for (const s of sectors) {
      const hasChildren = sectors.some(c => c.parentId === s.id);
      const nm = makeName(uid);
      users.push([uid++, `${titleFor(s.depth)} ${nm}`, makeEmail(s.code, titleFor(s.depth).toLowerCase(), uid), PASSWORD_HASH, roleFor(s.depth), s.id]);
      if (hasChildren) {
        const nm2 = makeName(uid);
        users.push([uid++, `Admin ${nm2}`, makeEmail(s.code, "admin", uid), PASSWORD_HASH, s.depth<=1?"super_admin":"ministry_head", s.id]);
      }
    }
    users.push([uid, "Budget Auditor", "auditor@budget.go.ke", PASSWORD_HASH, "viewer", sectors[0].id]);

    for (let i = 0; i < users.length; i += 50) {
      const chunk = users.slice(i, i + 50);
      const vals = chunk.map((_,j) => `($${j*6+1},$${j*6+2},$${j*6+3},$${j*6+4},$${j*6+5},$${j*6+6},NOW(),NOW())`);
      const params = chunk.flat();
      await client.query(`INSERT INTO users (id,name,email,password_hash,role,sector_id,created_at,updated_at) VALUES ${vals.join(",")}`, params);
    }
    await client.query(`SELECT setval('users_id_seq',(SELECT MAX(id) FROM users))`);

    // Budget cycle
    await client.query(
      `INSERT INTO budget_cycles (id,name,start_date,end_date,total_budget,is_active,created_by,created_at,updated_at) VALUES (1,'FY 2025/2026','2025-07-01','2026-06-30',$1,true,1,NOW(),NOW())`,
      [TOTAL_BUDGET]
    );

    // Allocations
    const allocRows: {from:number;to:number;amount:number}[] = [];
    function collectAllocs(ps: FlatSector) {
      for (const c of sectors.filter(s=>s.parentId===ps.id)) { allocRows.push({from:ps.id,to:c.id,amount:c.budget}); collectAllocs(c); }
    }
    collectAllocs(sectors[0]);

    for (let i = 0; i < allocRows.length; i += 50) {
      const chunk = allocRows.slice(i, i+50);
      const vals = chunk.map((_,j)=>`($${j*4+1},1,$${j*4+2},$${j*4+3},$${j*4+4},'active',1,NOW(),NOW(),NOW())`);
      const params: any[] = [];
      chunk.forEach((a,j)=>params.push(i+j+1,a.from,a.to,a.amount));
      await client.query(`INSERT INTO allocations (id,budget_cycle_id,from_sector_id,to_sector_id,amount,status,allocated_by,allocated_at,created_at,updated_at) VALUES ${vals.join(",")}`,params);
    }
    await client.query(`SELECT setval('allocations_id_seq',${allocRows.length})`);

    // Products
    const products = [
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
    for (const [id,name,cat,unit,price] of products) {
      await client.query(`INSERT INTO products (id,name,category,unit,unit_price,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`, [id,name,cat,unit,price]);
    }
    await client.query(`SELECT setval('products_id_seq',20)`);

    await client.query("COMMIT");

    res.json({
      success: true,
      sectors: sectors.length,
      users: users.length,
      allocations: allocRows.length,
      products: products.length,
      totalBudget: `KES ${TOTAL_BUDGET.toLocaleString()}`,
    });
  } catch (err: any) {
    await client.query("ROLLBACK").catch(()=>{});
    console.error("[seed] error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
