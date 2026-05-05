/**
 * Massive Kenya Budget Seed — generates 1000+ sectors across all 8 ministries
 * with realistic sub-hierarchy and distributes 1 Trillion KES budget.
 *
 * Run: npx tsx scripts/src/seed-kenya-massive.ts
 * Requires DATABASE_URL (Prisma) or SUPABASEDB_STRING (Supabase) env var.
 * Optional: DB_TYPE="supabase" or DB_TYPE="prisma" (default: prisma)
 */
import pg from "pg";

const dbType = process.env.DB_TYPE || "prisma";
const connectionString = 
  dbType === "supabase" 
    ? process.env.SUPABASEDB_STRING 
    : process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    `${dbType === "supabase" ? "SUPABASEDB_STRING" : "DATABASE_URL"} is required. Set DB_TYPE to "prisma" or "supabase".`,
  );
  process.exit(1);
}

const client = new pg.Client({ 
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const PASSWORD_HASH = "9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d";

// ── Kenya Government Structure ──
// Level 0: Republic of Kenya
// Level 1: 8 Ministries
// Level 2: State Departments / Parastatals / Regulatory Bodies
// Level 3: Institutions (Universities, TVETs, Colleges, Hospitals, etc.)
// Level 4: Schools / Departments within institutions
// Level 5: Units / Sections

interface SectorDef {
  name: string;
  code: string;
  depth: number;
  budget: number; // in KES
  children?: SectorDef[];
}

let idCounter = 1;

function nextId() { return idCounter++; }

// ── Education Ministry — fully expanded from CSV ──
const educationChildren: SectorDef[] = [
  {
    name: "State Department for Higher Education", code: "SD-HE", depth: 2, budget: 95_000_000_000,
    children: [
      { name: "Kenya Universities & Colleges Central Placement (KUCCPS)", code: "KUCCPS", depth: 3, budget: 2_500_000_000, children: [
        { name: "KUCCPS ICT Division", code: "KUCCPS-ICT", depth: 4, budget: 450_000_000 },
        { name: "KUCCPS Placement Division", code: "KUCCPS-PL", depth: 4, budget: 1_200_000_000 },
        { name: "KUCCPS Finance Division", code: "KUCCPS-FIN", depth: 4, budget: 850_000_000 },
      ]},
      { name: "Universities Fund (UF)", code: "UF", depth: 3, budget: 45_000_000_000, children: [
        { name: "UF Grants Division", code: "UF-GR", depth: 4, budget: 42_000_000_000 },
        { name: "UF Administration", code: "UF-ADM", depth: 4, budget: 3_000_000_000 },
      ]},
      { name: "Higher Education Loans Board (HELB)", code: "HELB", depth: 3, budget: 30_000_000_000, children: [
        { name: "HELB Undergraduate Loans", code: "HELB-UG", depth: 4, budget: 22_000_000_000 },
        { name: "HELB Postgraduate Loans", code: "HELB-PG", depth: 4, budget: 5_000_000_000 },
        { name: "HELB Bursary Fund", code: "HELB-BF", depth: 4, budget: 3_000_000_000 },
      ]},
      { name: "Kenya Education Management Institute (KEMI)", code: "KEMI", depth: 3, budget: 1_500_000_000 },
      ...generateUniversities(),
    ]
  },
  {
    name: "State Department for TVET", code: "SD-TVET", depth: 2, budget: 55_000_000_000,
    children: [
      { name: "TVET Authority (TVETA)", code: "TVETA", depth: 3, budget: 3_000_000_000, children: [
        { name: "TVETA Inspection & Assessment", code: "TVETA-IA", depth: 4, budget: 1_800_000_000 },
        { name: "TVETA Curriculum Development", code: "TVETA-CD", depth: 4, budget: 1_200_000_000 },
      ]},
      { name: "Kenya National Examinations Council (KNEC)", code: "KNEC", depth: 3, budget: 5_000_000_000, children: [
        { name: "KNEC TVET Examinations", code: "KNEC-TV", depth: 4, budget: 3_200_000_000 },
        { name: "KNEC Basic Education Exams", code: "KNEC-BE", depth: 4, budget: 1_800_000_000 },
      ]},
      ...generateTVETs(),
    ]
  },
  {
    name: "State Department for Basic Education", code: "SD-BE", depth: 2, budget: 100_000_000_000,
    children: [
      { name: "Kenya Institute of Curriculum Development (KICD)", code: "KICD", depth: 3, budget: 4_000_000_000 },
      { name: "Teachers Service Commission (TSC)", code: "TSC", depth: 3, budget: 60_000_000_000, children: [
        { name: "TSC Recruitment Division", code: "TSC-REC", depth: 4, budget: 35_000_000_000 },
        { name: "TSC Quality Assurance", code: "TSC-QA", depth: 4, budget: 15_000_000_000 },
        { name: "TSC ICT Division", code: "TSC-ICT", depth: 4, budget: 10_000_000_000 },
      ]},
      ...generateCountyEducationOffices(),
    ]
  },
];

function generateUniversities(): SectorDef[] {
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
    { name: "Laikipia University", code: "LAIKIPIA", budget: 750_000_000 },
    { name: "Chuka University", code: "CHUKA", budget: 700_000_000 },
    { name: "University of Eldoret", code: "UOE", budget: 900_000_000 },
    { name: "Kisii University", code: "KISII-U", budget: 850_000_000 },
    { name: "Jaramogi Oginga Odinga University (JOOUST)", code: "JOOUST", budget: 650_000_000 },
    { name: "South Eastern Kenya University (SEKU)", code: "SEKU", budget: 600_000_000 },
    { name: "Pwani University", code: "PWANI", budget: 550_000_000 },
    { name: "Garissa University", code: "GARISSA-U", budget: 400_000_000 },
    { name: "Kirinyaga University", code: "KIRINYAGA", budget: 350_000_000 },
    { name: "Murang'a University of Technology", code: "MURANGA", budget: 500_000_000 },
    { name: "Machakos University", code: "MACHAKOS", budget: 600_000_000 },
    { name: "Taita Taveta University", code: "TTU", budget: 450_000_000 },
    { name: "University of Embu", code: "EMBU", budget: 400_000_000 },
    { name: "Rongo University", code: "RONGO", budget: 350_000_000 },
    { name: "Kibabii University", code: "KIBU", budget: 380_000_000 },
    { name: "University of Kabianga", code: "KABIANGA", budget: 320_000_000 },
    { name: "Cooperative University of Kenya", code: "CUK", budget: 450_000_000 },
    { name: "Multimedia University of Kenya", code: "MMU", budget: 500_000_000 },
    { name: "Meru University of Science & Technology", code: "MUST", budget: 550_000_000 },
  ];

  const schoolNames = [
    "School of Engineering", "School of Business", "School of Education",
    "School of Science", "School of Medicine", "School of Law",
    "School of Agriculture", "School of ICT", "School of Arts",
    "School of Social Sciences",
  ];

  const unitNames = [
    "Library & Information Services", "Health Unit", "Sports & Recreation",
    "Student Welfare", "Transport Unit", "ICT Support", "Registry & Records",
    "Finance & Accounts", "Human Resources", "Procurement Unit",
  ];

  return universities.map(u => ({
    name: u.name, code: u.code, depth: 3, budget: u.budget,
    children: [
      ...schoolNames.slice(0, 4 + Math.floor(Math.random() * 6)).map((s, i) => ({
        name: `${u.name.split("(")[0].trim()} - ${s}`,
        code: `${u.code}-S${i + 1}`,
        depth: 4,
        budget: Math.round(u.budget * (0.08 + Math.random() * 0.12)),
        children: [
          { name: `${s} - Teaching Resources`, code: `${u.code}-S${i + 1}-TR`, depth: 5, budget: Math.round(u.budget * 0.02) },
          { name: `${s} - Research Lab`, code: `${u.code}-S${i + 1}-RL`, depth: 5, budget: Math.round(u.budget * 0.015) },
          { name: `${s} - Staff Development`, code: `${u.code}-S${i + 1}-SD`, depth: 5, budget: Math.round(u.budget * 0.005) },
        ],
      })),
      ...unitNames.slice(0, 3 + Math.floor(Math.random() * 5)).map((unit, i) => ({
        name: `${u.name.split("(")[0].trim()} - ${unit}`,
        code: `${u.code}-U${i + 1}`,
        depth: 4,
        budget: Math.round(u.budget * (0.01 + Math.random() * 0.03)),
      })),
    ],
  }));
}

function generateTVETs(): SectorDef[] {
  const tvets = [
    "Nairobi Technical Training Institute", "Mombasa Technical Training Institute",
    "Kisumu National Polytechnic", "Eldoret National Polytechnic",
    "Kenya Coast National Polytechnic", "Kabete National Polytechnic",
    "The Kenya Polytechnic", "Sigalagala National Polytechnic",
    "Kitale National Polytechnic", "Bumbe Technical Training Institute",
    "Thika Technical Training Institute", "Nyandarua Institute of Science & Technology",
    "PC Kinyanjui Technical Training Institute", "Kiambu Institute of Science & Technology",
    "Rift Valley Technical Training Institute", "Ramogi Institute of Advanced Technology",
    "Nyeri National Polytechnic", "Meru National Polytechnic",
    "Michuki Technical Training Institute", "Keroka Technical Training Institute",
    "Nkabune Technical Training Institute", "Mathenge Technical Training Institute",
    "Kaiboi Technical Training Institute", "Shamberere Technical Training Institute",
    "Ol'lessos Technical Training Institute", "Sang'alo Institute of Science & Technology",
    "Bukura Agricultural College", "Baringo Technical College",
    "Ekerubo Gietai Technical Training Institute", "Kisiwa Technical Training Institute",
    "Mukiria Technical Training Institute", "Tharaka Technical Training Institute",
    "Coast Institute of Technology", "Naivasha Technical Training Institute",
    "Nakuru Technical Training Institute", "Naivasaha TTI Satellite",
    "Embu College of Technology", "Rwika TTI",
    "Mawego Technical Training Institute", "Athi River TTI",
  ];

  const deptNames = [
    "Department of Automotive Engineering", "Department of Electrical Engineering",
    "Department of Mechanical Engineering", "Department of ICT",
    "Department of Building & Construction", "Department of Business Studies",
    "Department of Hospitality", "Department of Applied Sciences",
    "Department of Fashion & Design", "Department of Agriculture",
  ];

  return tvets.map((name, idx) => {
    const code = `TVET-${String(idx + 1).padStart(3, "0")}`;
    const budget = 100_000_000 + Math.round(Math.random() * 400_000_000);
    return {
      name, code, depth: 3, budget,
      children: deptNames.slice(0, 3 + Math.floor(Math.random() * 5)).map((dept, di) => ({
        name: `${name.split(" ").slice(0, 2).join(" ")} - ${dept}`,
        code: `${code}-D${di + 1}`,
        depth: 4,
        budget: Math.round(budget * (0.08 + Math.random() * 0.12)),
        children: [
          { name: `${dept} - Workshop Stores`, code: `${code}-D${di + 1}-WS`, depth: 5, budget: Math.round(budget * 0.01) },
          { name: `${dept} - Student Welfare`, code: `${code}-D${di + 1}-SW`, depth: 5, budget: Math.round(budget * 0.008) },
        ],
      })),
    };
  });
}

function generateCountyEducationOffices(): SectorDef[] {
  const counties = [
    "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Uasin Gishu", "Kiambu",
    "Machakos", "Kajiado", "Kilifi", "Meru", "Nyeri", "Murang'a",
    "Nyandarua", "Laikipia", "Embu", "Tharaka-Nithi", "Kitui", "Makueni",
    "Nandi", "Baringo", "Kericho", "Bomet", "Narok", "Samburu",
    "Trans-Nzoia", "West Pokot", "Elgeyo-Marakwet", "Bungoma", "Busia",
    "Kakamega", "Vihiga", "Siaya", "Kisii", "Nyamira", "Migori",
    "Homa Bay", "Kwale", "Taita-Taveta", "Lamu", "Tana River",
    "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Turkana",
    "Kirinyaga",
  ];

  return counties.map((county, idx) => {
    const budget = 300_000_000 + Math.round(Math.random() * 500_000_000);
    return {
      name: `${county} County Education Office`,
      code: `CEO-${String(idx + 1).padStart(3, "0")}`,
      depth: 3,
      budget,
      children: [
        { name: `${county} - Primary Education`, code: `CEO-${String(idx + 1).padStart(3, "0")}-PE`, depth: 4, budget: Math.round(budget * 0.45) },
        { name: `${county} - Secondary Education`, code: `CEO-${String(idx + 1).padStart(3, "0")}-SE`, depth: 4, budget: Math.round(budget * 0.35) },
        { name: `${county} - Special Needs Education`, code: `CEO-${String(idx + 1).padStart(3, "0")}-SN`, depth: 4, budget: Math.round(budget * 0.1) },
        { name: `${county} - Education Admin`, code: `CEO-${String(idx + 1).padStart(3, "0")}-AD`, depth: 4, budget: Math.round(budget * 0.1) },
      ],
    };
  });
}

// ── Health Ministry ──
const healthChildren: SectorDef[] = [
  {
    name: "State Department for Medical Services", code: "SD-MS", depth: 2, budget: 100_000_000_000,
    children: [
      { name: "Kenya Medical Supplies Authority (KEMSA)", code: "KEMSA", depth: 3, budget: 25_000_000_000, children: [
        { name: "KEMSA Procurement Division", code: "KEMSA-PR", depth: 4, budget: 20_000_000_000 },
        { name: "KEMSA Warehousing & Distribution", code: "KEMSA-WD", depth: 4, budget: 5_000_000_000 },
      ]},
      ...generateHospitals("National", [
        { name: "Kenyatta National Hospital (KNH)", code: "KNH", budget: 12_000_000_000 },
        { name: "Moi Teaching & Referral Hospital (MTRH)", code: "MTRH", budget: 8_000_000_000 },
        { name: "Kenyatta University Teaching Hospital", code: "KUTH", budget: 5_000_000_000 },
        { name: "Mathare National Teaching Hospital", code: "MNTH", budget: 2_500_000_000 },
      ]),
      ...generateMedicalColleges(),
    ]
  },
  {
    name: "State Department for Public Health", code: "SD-PH", depth: 2, budget: 80_000_000_000,
    children: [
      { name: "Kenya Medical Research Institute (KEMRI)", code: "KEMRI", depth: 3, budget: 8_000_000_000, children: [
        { name: "KEMRI Centre for Virus Research", code: "KEMRI-CVR", depth: 4, budget: 2_500_000_000 },
        { name: "KEMRI Centre for Microbiology", code: "KEMRI-CM", depth: 4, budget: 2_000_000_000 },
        { name: "KEMRI Centre for Clinical Research", code: "KEMRI-CCR", depth: 4, budget: 1_500_000_000 },
        { name: "KEMRI Centre for Biotechnology", code: "KEMRI-CB", depth: 4, budget: 2_000_000_000 },
      ]},
      { name: "National Public Health Laboratories", code: "NPHL", depth: 3, budget: 3_000_000_000 },
      ...generateCountyHealthFacilities(),
    ]
  },
];

function generateHospitals(tier: string, hospitals: { name: string; code: string; budget: number }[]): SectorDef[] {
  const depts = ["Surgery", "Internal Medicine", "Pediatrics", "Obstetrics & Gynaecology", "Radiology", "Pharmacy", "Laboratory", "ICU"];
  return hospitals.map(h => ({
    name: h.name, code: h.code, depth: 3, budget: h.budget,
    children: depts.map((d, i) => ({
      name: `${h.code} - ${d}`, code: `${h.code}-D${i + 1}`, depth: 4,
      budget: Math.round(h.budget * (0.08 + Math.random() * 0.1)),
    })),
  }));
}

function generateMedicalColleges(): SectorDef[] {
  const colleges = [
    "KMTC Nairobi", "KMTC Mombasa", "KMTC Kisumu", "KMTC Nakuru",
    "KMTC Eldoret", "KMTC Nyeri", "KMTC Embu", "KMTC Meru",
    "KMTC Machakos", "KMTC Thika", "KMTC Kakamega", "KMTC Kisii",
    "KMTC Homa Bay", "KMTC Garissa", "KMTC Lodwar", "KMTC Naivasha",
  ];
  return colleges.map((name, i) => ({
    name, code: `KMTC-${String(i + 1).padStart(3, "0")}`, depth: 3,
    budget: 300_000_000 + Math.round(Math.random() * 400_000_000),
    children: [
      { name: `${name} - Dept of Nursing`, code: `KMTC-${String(i + 1).padStart(3, "0")}-NR`, depth: 4, budget: 80_000_000 },
      { name: `${name} - Dept of Clinical Medicine`, code: `KMTC-${String(i + 1).padStart(3, "0")}-CM`, depth: 4, budget: 60_000_000 },
      { name: `${name} - Dept of Lab Technology`, code: `KMTC-${String(i + 1).padStart(3, "0")}-LT`, depth: 4, budget: 40_000_000 },
      { name: `${name} - Admin & Student Affairs`, code: `KMTC-${String(i + 1).padStart(3, "0")}-AD`, depth: 4, budget: 30_000_000 },
    ],
  }));
}

function generateCountyHealthFacilities(): SectorDef[] {
  const counties = [
    "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Machakos",
    "Kajiado", "Kilifi", "Meru", "Nyeri", "Murang'a", "Embu",
    "Kitui", "Makueni", "Nandi", "Baringo", "Kericho", "Narok",
    "Bungoma", "Kakamega", "Siaya", "Kisii", "Migori", "Homa Bay",
    "Garissa", "Wajir", "Mandera", "Turkana", "Marsabit", "Isiolo",
  ];
  return counties.map((county, i) => ({
    name: `${county} County Health Services`,
    code: `CHS-${String(i + 1).padStart(3, "0")}`,
    depth: 3,
    budget: 500_000_000 + Math.round(Math.random() * 1_500_000_000),
    children: [
      { name: `${county} County Referral Hospital`, code: `CHS-${String(i + 1).padStart(3, "0")}-RH`, depth: 4, budget: 200_000_000 + Math.round(Math.random() * 300_000_000) },
      { name: `${county} Sub-County Hospitals`, code: `CHS-${String(i + 1).padStart(3, "0")}-SH`, depth: 4, budget: 150_000_000 + Math.round(Math.random() * 200_000_000) },
      { name: `${county} Health Centres`, code: `CHS-${String(i + 1).padStart(3, "0")}-HC`, depth: 4, budget: 50_000_000 + Math.round(Math.random() * 100_000_000) },
    ],
  }));
}

// ── Other Ministries (Defense, Infrastructure, Agriculture, Interior, ICT, Energy) ──

function generateDefenceChildren(): SectorDef[] {
  return [
    { name: "Kenya Defence Forces HQ", code: "KDF-HQ", depth: 2, budget: 60_000_000_000, children: [
      { name: "Kenya Army", code: "KA", depth: 3, budget: 30_000_000_000, children: [
        { name: "KA Training Command", code: "KA-TC", depth: 4, budget: 8_000_000_000 },
        { name: "KA Logistics Command", code: "KA-LC", depth: 4, budget: 12_000_000_000 },
        { name: "KA Engineering Brigade", code: "KA-EB", depth: 4, budget: 5_000_000_000 },
        { name: "KA Medical Corps", code: "KA-MC", depth: 4, budget: 5_000_000_000 },
      ]},
      { name: "Kenya Air Force", code: "KAF", depth: 3, budget: 18_000_000_000, children: [
        { name: "KAF Operations", code: "KAF-OP", depth: 4, budget: 10_000_000_000 },
        { name: "KAF Maintenance & Engineering", code: "KAF-ME", depth: 4, budget: 5_000_000_000 },
        { name: "KAF Training", code: "KAF-TR", depth: 4, budget: 3_000_000_000 },
      ]},
      { name: "Kenya Navy", code: "KN", depth: 3, budget: 12_000_000_000, children: [
        { name: "KN Fleet Command", code: "KN-FC", depth: 4, budget: 7_000_000_000 },
        { name: "KN Marine Operations", code: "KN-MO", depth: 4, budget: 3_000_000_000 },
        { name: "KN Base Operations", code: "KN-BO", depth: 4, budget: 2_000_000_000 },
      ]},
    ]},
    { name: "National Intelligence Service", code: "NIS", depth: 2, budget: 40_000_000_000, children: [
      { name: "NIS Operations", code: "NIS-OP", depth: 3, budget: 25_000_000_000 },
      { name: "NIS Counter-Terrorism", code: "NIS-CT", depth: 3, budget: 10_000_000_000 },
      { name: "NIS Cyber Security", code: "NIS-CS", depth: 3, budget: 5_000_000_000 },
    ]},
    { name: "Defence Staff College", code: "DSC", depth: 2, budget: 5_000_000_000 },
    { name: "Defence Finance & Admin", code: "DFA", depth: 2, budget: 15_000_000_000 },
  ];
}

function generateInfrastructureChildren(): SectorDef[] {
  return [
    { name: "Kenya National Highways Authority (KeNHA)", code: "KENHA", depth: 2, budget: 80_000_000_000, children: [
      { name: "KeNHA Northern Corridor", code: "KENHA-NC", depth: 3, budget: 25_000_000_000 },
      { name: "KeNHA Southern Corridor", code: "KENHA-SC", depth: 3, budget: 20_000_000_000 },
      { name: "KeNHA Western Region", code: "KENHA-WR", depth: 3, budget: 18_000_000_000 },
      { name: "KeNHA Eastern Region", code: "KENHA-ER", depth: 3, budget: 12_000_000_000 },
      { name: "KeNHA Maintenance Division", code: "KENHA-MD", depth: 3, budget: 5_000_000_000 },
    ]},
    { name: "Kenya Urban Roads Authority (KURA)", code: "KURA", depth: 2, budget: 30_000_000_000, children: [
      { name: "KURA Nairobi Region", code: "KURA-NBI", depth: 3, budget: 12_000_000_000 },
      { name: "KURA Mombasa Region", code: "KURA-MSA", depth: 3, budget: 6_000_000_000 },
      { name: "KURA Western Region", code: "KURA-WR", depth: 3, budget: 5_000_000_000 },
      { name: "KURA Other Regions", code: "KURA-OR", depth: 3, budget: 7_000_000_000 },
    ]},
    { name: "Kenya Rural Roads Authority (KeRRA)", code: "KERRA", depth: 2, budget: 25_000_000_000, children: generateKeRRARegions() },
    { name: "Kenya Railways Corporation", code: "KRC", depth: 2, budget: 10_000_000_000, children: [
      { name: "KRC SGR Operations", code: "KRC-SGR", depth: 3, budget: 5_000_000_000 },
      { name: "KRC Legacy Rail", code: "KRC-LR", depth: 3, budget: 3_000_000_000 },
      { name: "KRC Infrastructure", code: "KRC-INF", depth: 3, budget: 2_000_000_000 },
    ]},
    { name: "Kenya Airports Authority (KAA)", code: "KAA", depth: 2, budget: 5_000_000_000, children: [
      { name: "JKIA Operations", code: "KAA-JKIA", depth: 3, budget: 2_500_000_000 },
      { name: "Moi International Airport", code: "KAA-MIA", depth: 3, budget: 1_000_000_000 },
      { name: "Kisumu Airport", code: "KAA-KIS", depth: 3, budget: 500_000_000 },
      { name: "Regional Airstrips", code: "KAA-REG", depth: 3, budget: 1_000_000_000 },
    ]},
  ];
}

function generateKeRRARegions(): SectorDef[] {
  const regions = ["Central", "Eastern", "Western", "Rift Valley", "Nyanza", "Coast", "North Eastern"];
  return regions.map((r, i) => ({
    name: `KeRRA ${r} Region`, code: `KERRA-${String(i + 1).padStart(2, "0")}`, depth: 3,
    budget: 2_000_000_000 + Math.round(Math.random() * 2_000_000_000),
    children: [
      { name: `KeRRA ${r} - Road Construction`, code: `KERRA-${String(i + 1).padStart(2, "0")}-RC`, depth: 4, budget: 1_500_000_000 },
      { name: `KeRRA ${r} - Maintenance`, code: `KERRA-${String(i + 1).padStart(2, "0")}-MT`, depth: 4, budget: 500_000_000 },
    ],
  }));
}

function generateAgricultureChildren(): SectorDef[] {
  return [
    { name: "State Department for Crop Development", code: "SD-CROP", depth: 2, budget: 30_000_000_000, children: [
      { name: "Kenya Agricultural & Livestock Research (KALRO)", code: "KALRO", depth: 3, budget: 5_000_000_000, children: [
        { name: "KALRO Food Crops Research", code: "KALRO-FC", depth: 4, budget: 2_000_000_000 },
        { name: "KALRO Livestock Research", code: "KALRO-LR", depth: 4, budget: 1_500_000_000 },
        { name: "KALRO Tea Research", code: "KALRO-TR", depth: 4, budget: 1_000_000_000 },
        { name: "KALRO Coffee Research", code: "KALRO-CR", depth: 4, budget: 500_000_000 },
      ]},
      ...generateCountyAgricultureOffices(),
    ]},
    { name: "State Department for Livestock", code: "SD-LIVE", depth: 2, budget: 20_000_000_000, children: [
      { name: "Kenya Meat Commission", code: "KMC", depth: 3, budget: 3_000_000_000 },
      { name: "Kenya Dairy Board", code: "KDB", depth: 3, budget: 2_000_000_000 },
      { name: "Kenya Veterinary Board", code: "KVB", depth: 3, budget: 1_500_000_000 },
      { name: "Kenya Animal Genetic Resources Centre", code: "KAGRC", depth: 3, budget: 1_000_000_000 },
      { name: "Livestock Dept - Arid Zones", code: "SD-LIVE-AZ", depth: 3, budget: 8_000_000_000 },
      { name: "Livestock Dept - Extension Services", code: "SD-LIVE-ES", depth: 3, budget: 4_500_000_000 },
    ]},
    { name: "State Department for Fisheries & Blue Economy", code: "SD-FISH", depth: 2, budget: 10_000_000_000, children: [
      { name: "Kenya Fisheries Service", code: "KFS", depth: 3, budget: 4_000_000_000 },
      { name: "Kenya Marine & Fisheries Research (KMFRI)", code: "KMFRI", depth: 3, budget: 2_000_000_000 },
      { name: "Beach Management Units", code: "BMU", depth: 3, budget: 1_500_000_000 },
      { name: "Aquaculture Development", code: "AQUA", depth: 3, budget: 2_500_000_000 },
    ]},
    { name: "Agriculture Finance Corporation (AFC)", code: "AFC", depth: 2, budget: 10_000_000_000 },
    { name: "National Irrigation Authority (NIA)", code: "NIA", depth: 2, budget: 10_000_000_000, children: [
      { name: "NIA Mwea Scheme", code: "NIA-MW", depth: 3, budget: 3_000_000_000 },
      { name: "NIA Bura Scheme", code: "NIA-BR", depth: 3, budget: 2_000_000_000 },
      { name: "NIA Galana-Kulalu Project", code: "NIA-GK", depth: 3, budget: 3_000_000_000 },
      { name: "NIA Other Schemes", code: "NIA-OT", depth: 3, budget: 2_000_000_000 },
    ]},
  ];
}

function generateCountyAgricultureOffices(): SectorDef[] {
  const counties = ["Nakuru", "Uasin Gishu", "Trans-Nzoia", "Nandi", "Bungoma", "Kakamega", "Meru", "Embu", "Kirinyaga", "Nyeri", "Kiambu", "Murang'a", "Laikipia", "Kericho", "Bomet", "Narok"];
  return counties.map((county, i) => ({
    name: `${county} County Agriculture Office`, code: `CAO-${String(i + 1).padStart(3, "0")}`, depth: 3,
    budget: 500_000_000 + Math.round(Math.random() * 1_000_000_000),
    children: [
      { name: `${county} - Crop Extension`, code: `CAO-${String(i + 1).padStart(3, "0")}-CE`, depth: 4, budget: 200_000_000 },
      { name: `${county} - Livestock Extension`, code: `CAO-${String(i + 1).padStart(3, "0")}-LE`, depth: 4, budget: 150_000_000 },
    ],
  }));
}

function generateInteriorChildren(): SectorDef[] {
  return [
    { name: "National Police Service (NPS)", code: "NPS", depth: 2, budget: 60_000_000_000, children: [
      { name: "Kenya Police Service", code: "KPS", depth: 3, budget: 30_000_000_000, children: [
        { name: "KPS Operations", code: "KPS-OP", depth: 4, budget: 15_000_000_000 },
        { name: "KPS Training", code: "KPS-TR", depth: 4, budget: 5_000_000_000 },
        { name: "KPS Logistics", code: "KPS-LG", depth: 4, budget: 5_000_000_000 },
        { name: "KPS Criminal Investigations (DCI)", code: "DCI", depth: 4, budget: 5_000_000_000 },
      ]},
      { name: "Administration Police Service", code: "APS", depth: 3, budget: 15_000_000_000, children: [
        { name: "APS Border Security", code: "APS-BS", depth: 4, budget: 5_000_000_000 },
        { name: "APS Rapid Deployment", code: "APS-RD", depth: 4, budget: 5_000_000_000 },
        { name: "APS Training", code: "APS-TR", depth: 4, budget: 5_000_000_000 },
      ]},
      { name: "National Police Service Commission", code: "NPSC", depth: 3, budget: 2_000_000_000 },
      { name: "Independent Policing Oversight Authority", code: "IPOA", depth: 3, budget: 1_500_000_000 },
      { name: "National Police Service - ICT Division", code: "NPS-ICT", depth: 3, budget: 3_000_000_000 },
    ]},
    { name: "National Registration Bureau", code: "NRB", depth: 2, budget: 8_000_000_000, children: [
      { name: "NRB ID Production", code: "NRB-ID", depth: 3, budget: 5_000_000_000 },
      { name: "NRB Registration Centres", code: "NRB-RC", depth: 3, budget: 3_000_000_000 },
    ]},
    { name: "Department of Immigration", code: "DIM", depth: 2, budget: 5_000_000_000, children: [
      { name: "Passport Services", code: "DIM-PS", depth: 3, budget: 3_000_000_000 },
      { name: "Immigration Enforcement", code: "DIM-IE", depth: 3, budget: 2_000_000_000 },
    ]},
    { name: "Kenya Prisons Service", code: "KPS-PR", depth: 2, budget: 15_000_000_000, children: [
      { name: "Prisons Operations", code: "KPS-PR-OP", depth: 3, budget: 8_000_000_000 },
      { name: "Prisons Rehabilitation", code: "KPS-PR-RH", depth: 3, budget: 4_000_000_000 },
      { name: "Prisons Administration", code: "KPS-PR-AD", depth: 3, budget: 3_000_000_000 },
    ]},
    { name: "National Disaster Management Authority", code: "NDMA", depth: 2, budget: 8_000_000_000 },
    { name: "Betting Control & Licensing Board", code: "BCLB", depth: 2, budget: 2_000_000_000 },
    { name: "County Commissioners Offices", code: "CCO", depth: 2, budget: 2_000_000_000 },
  ];
}

function generateICTChildren(): SectorDef[] {
  return [
    { name: "ICT Authority", code: "ICTA", depth: 2, budget: 15_000_000_000, children: [
      { name: "ICTA Digital Services", code: "ICTA-DS", depth: 3, budget: 5_000_000_000 },
      { name: "ICTA Government Cloud (G-Cloud)", code: "ICTA-GC", depth: 3, budget: 4_000_000_000 },
      { name: "ICTA Cyber Security", code: "ICTA-CS", depth: 3, budget: 3_000_000_000 },
      { name: "ICTA Shared Services", code: "ICTA-SS", depth: 3, budget: 3_000_000_000 },
    ]},
    { name: "Communications Authority of Kenya", code: "CA", depth: 2, budget: 10_000_000_000, children: [
      { name: "CA Spectrum Management", code: "CA-SM", depth: 3, budget: 4_000_000_000 },
      { name: "CA Consumer Protection", code: "CA-CP", depth: 3, budget: 2_000_000_000 },
      { name: "CA Licensing", code: "CA-LIC", depth: 3, budget: 2_000_000_000 },
      { name: "CA Universal Service Fund", code: "CA-USF", depth: 3, budget: 2_000_000_000 },
    ]},
    { name: "Konza Technopolis Development Authority", code: "KOTDA", depth: 2, budget: 8_000_000_000, children: [
      { name: "Konza Smart City Infrastructure", code: "KOTDA-SC", depth: 3, budget: 5_000_000_000 },
      { name: "Konza Data Centre", code: "KOTDA-DC", depth: 3, budget: 3_000_000_000 },
    ]},
    { name: "Kenya Broadcasting Corporation", code: "KBC", depth: 2, budget: 5_000_000_000 },
    { name: "Kenya Film Classification Board", code: "KFCB", depth: 2, budget: 1_000_000_000 },
    { name: "Media Council of Kenya", code: "MCK", depth: 2, budget: 1_000_000_000 },
    { name: "Postal Corporation of Kenya", code: "PCK", depth: 2, budget: 3_000_000_000 },
    { name: "Kenya Institute of Mass Communication", code: "KIMC", depth: 2, budget: 2_000_000_000 },
    { name: "Kenya Year Book Editorial Board", code: "KYEB", depth: 2, budget: 500_000_000 },
    { name: "Brand Kenya Board", code: "BKB", depth: 2, budget: 1_500_000_000 },
    { name: "Government Advertising Agency", code: "GAA", depth: 2, budget: 3_000_000_000 },
  ];
}

function generateEnergyChildren(): SectorDef[] {
  return [
    { name: "State Department for Energy", code: "SD-EN", depth: 2, budget: 35_000_000_000, children: [
      { name: "Kenya Power & Lighting Company (KPLC)", code: "KPLC", depth: 3, budget: 15_000_000_000, children: [
        { name: "KPLC Transmission", code: "KPLC-TR", depth: 4, budget: 5_000_000_000 },
        { name: "KPLC Distribution", code: "KPLC-DI", depth: 4, budget: 5_000_000_000 },
        { name: "KPLC Last Mile Connectivity", code: "KPLC-LM", depth: 4, budget: 3_000_000_000 },
        { name: "KPLC Customer Services", code: "KPLC-CS", depth: 4, budget: 2_000_000_000 },
      ]},
      { name: "Kenya Electricity Generating Company (KenGen)", code: "KENGEN", depth: 3, budget: 10_000_000_000, children: [
        { name: "KenGen Geothermal", code: "KG-GEO", depth: 4, budget: 4_000_000_000 },
        { name: "KenGen Hydro", code: "KG-HYD", depth: 4, budget: 3_000_000_000 },
        { name: "KenGen Wind & Solar", code: "KG-WS", depth: 4, budget: 3_000_000_000 },
      ]},
      { name: "Geothermal Development Company (GDC)", code: "GDC", depth: 3, budget: 5_000_000_000 },
      { name: "Rural Electrification Authority (REA)", code: "REA", depth: 3, budget: 3_000_000_000 },
      { name: "Energy & Petroleum Regulatory Authority", code: "EPRA", depth: 3, budget: 2_000_000_000 },
    ]},
    { name: "State Department for Petroleum", code: "SD-PET", depth: 2, budget: 20_000_000_000, children: [
      { name: "National Oil Corporation", code: "NOCK", depth: 3, budget: 8_000_000_000 },
      { name: "Kenya Pipeline Company", code: "KPC", depth: 3, budget: 7_000_000_000, children: [
        { name: "KPC Mombasa Terminal", code: "KPC-MSA", depth: 4, budget: 2_500_000_000 },
        { name: "KPC Nairobi Terminal", code: "KPC-NBI", depth: 4, budget: 2_500_000_000 },
        { name: "KPC Western Operations", code: "KPC-WO", depth: 4, budget: 2_000_000_000 },
      ]},
      { name: "Strategic Petroleum Reserve", code: "SPR", depth: 3, budget: 5_000_000_000 },
    ]},
    { name: "Nuclear Power & Energy Agency", code: "NUPEA", depth: 2, budget: 5_000_000_000 },
    { name: "Energy Tribunal", code: "ET", depth: 2, budget: 500_000_000 },
    { name: "Kenya Electricity Transmission Company (KETRACO)", code: "KETRACO", depth: 2, budget: 9_500_000_000, children: [
      { name: "KETRACO 400kV Lines", code: "KET-400", depth: 3, budget: 5_000_000_000 },
      { name: "KETRACO 220kV Lines", code: "KET-220", depth: 3, budget: 3_000_000_000 },
      { name: "KETRACO Substations", code: "KET-SUB", depth: 3, budget: 1_500_000_000 },
    ]},
  ];
}

// ── Build full tree ──

const TOTAL_BUDGET = 1_000_000_000_000; // 1 Trillion KES

const rootTree: SectorDef = {
  name: "Republic of Kenya National Budget", code: "GOK-NAT", depth: 0, budget: TOTAL_BUDGET,
  children: [
    { name: "Ministry of Education", code: "MOE", depth: 1, budget: 250_000_000_000, children: educationChildren },
    { name: "Ministry of Health", code: "MOH", depth: 1, budget: 180_000_000_000, children: healthChildren },
    { name: "Ministry of Defence", code: "MOD", depth: 1, budget: 120_000_000_000, children: generateDefenceChildren() },
    { name: "Ministry of Roads & Infrastructure", code: "MORI", depth: 1, budget: 150_000_000_000, children: generateInfrastructureChildren() },
    { name: "Ministry of Agriculture", code: "MOA", depth: 1, budget: 80_000_000_000, children: generateAgricultureChildren() },
    { name: "Ministry of Interior & National Administration", code: "MOINA", depth: 1, budget: 100_000_000_000, children: generateInteriorChildren() },
    { name: "Ministry of ICT & Digital Economy", code: "MOICT", depth: 1, budget: 50_000_000_000, children: generateICTChildren() },
    { name: "Ministry of Energy & Petroleum", code: "MOEP", depth: 1, budget: 70_000_000_000, children: generateEnergyChildren() },
  ],
};

// ── Count sectors ──
function countSectors(s: SectorDef): number {
  return 1 + (s.children ?? []).reduce((sum, c) => sum + countSectors(c), 0);
}

// ── SQL Generation ──
interface FlatSector {
  id: number;
  parentId: number | null;
  name: string;
  code: string;
  depth: number;
  budget: number;
}

function flattenTree(s: SectorDef, parentId: number | null): FlatSector[] {
  const id = nextId();
  const result: FlatSector[] = [{ id, parentId, name: s.name, code: s.code, depth: s.depth, budget: s.budget }];
  for (const child of s.children ?? []) {
    result.push(...flattenTree(child, id));
  }
  return result;
}

async function main() {
  const totalCount = countSectors(rootTree);
  console.log(`Total sectors to seed: ${totalCount}`);

  idCounter = 1;
  const sectors = flattenTree(rootTree, null);
  console.log(`Flattened: ${sectors.length} sectors`);

  await client.connect();
  console.log("Connected to database");

  try {
    await client.query("BEGIN");

    // Clean existing data (order matters for FK constraints)
    console.log("Cleaning existing data...");
    const tablesToClean = [
      "purchase_order_items", "purchase_orders", "revocations",
      "allocations", "budget_cycles", "audit_logs",
      "sector_controls", "approval_limits", "users", "sectors", "products",
    ];
    for (const table of tablesToClean) {
      try { await client.query(`DELETE FROM ${table}`); } catch (e) { /* table may not exist */ }
    }

    // Add max_depth_visible column if not exists
    try {
      await client.query("ALTER TABLE sectors ADD COLUMN IF NOT EXISTS max_depth_visible INTEGER NOT NULL DEFAULT 1");
    } catch (e) {
      console.log("max_depth_visible column may already exist");
    }

    // Insert sectors in batches
    console.log("Inserting sectors...");
    const SECTOR_CHUNK = 50;
    for (let i = 0; i < sectors.length; i += SECTOR_CHUNK) {
      const chunk = sectors.slice(i, i + SECTOR_CHUNK);
      const values: string[] = [];
      const params: (string | number | null)[] = [];
      chunk.forEach((s, j) => {
        const base = j * 6;
        values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, NOW(), NOW())`);
        params.push(s.id, s.parentId, s.name, s.code, s.depth, s.depth <= 1 ? 2 : 1);
      });
      await client.query(
        `INSERT INTO sectors (id, parent_id, name, code, depth, max_depth_visible, created_at, updated_at)
         VALUES ${values.join(", ")}`,
        params
      );
    }
    await client.query(`SELECT setval('sectors_id_seq', (SELECT MAX(id) FROM sectors))`);
    console.log(`Inserted ${sectors.length} sectors`);

    // Insert users — every sector gets a responsible officer (HOD/Head)
    // Parent sectors (those with children) also get a supervisor/admin
    console.log("Generating per-sector users...");

    // Kenyan first/last names for realistic user generation
    const firstNames = [
      "James","Mary","John","Grace","Peter","Faith","David","Mercy","Joseph","Joy",
      "Daniel","Esther","Samuel","Anne","Michael","Christine","Stephen","Lucy","George","Alice",
      "Patrick","Elizabeth","Paul","Jane","Martin","Beatrice","Francis","Caroline","Charles","Florence",
      "Robert","Sarah","Thomas","Margaret","Brian","Hellen","Dennis","Irene","Philip","Catherine",
      "Albert","Diana","Evans","Eunice","Kelvin","Gladys","Victor","Nancy","Andrew","Ruth",
      "Edwin","Rose","Moses","Winnie","Isaac","Pamela","Solomon","Stella","Benjamin","Agnes",
      "Caleb","Doris","Nathan","Eunice","Timothy","Judith","Wycliffe","Marion","Sylvester","Phoebe",
      "Amos","Charity","Elijah","Dorcas","Jeremiah","Leah","Samson","Lilian","Ezekiel","Naomi",
    ];
    const lastNames = [
      "Odhiambo","Wanjiku","Kamau","Otieno","Njoroge","Mwangi","Kipchoge","Cherop","Mutai","Achieng",
      "Kiprotich","Wambui","Omondi","Nyambura","Koech","Kariuki","Sang","Muthoni","Rono","Wairimu",
      "Kimutai","Njeri","Kiprop","Gathoni","Langat","Mumbi","Chesang","Wangari","Kibet","Nyokabi",
      "Barasa","Makena","Wafula","Kagure","Simiyu","Wangui","Masinde","Nyaguthii","Juma","Wacera",
      "Okello","Nduta","Onyango","Nyambane","Ochieng","Wachira","Kiplagat","Njoki","Rotich","Waithera",
    ];

    function roleName(depth: number): string {
      if (depth === 0) return "super_admin";
      if (depth === 1) return "ceo";
      if (depth === 2) return "ministry_head";
      return "department_head";
    }

    function titlePrefix(depth: number): string {
      if (depth === 0) return "Controller";
      if (depth === 1) return "CS";
      if (depth === 2) return "PS";
      if (depth === 3) return "Director";
      if (depth === 4) return "HOD";
      return "Officer";
    }

    interface UserRecord {
      id: number;
      name: string;
      email: string;
      role: string;
      sectorId: number;
      sectorCode: string;
      sectorName: string;
      isSupervisor: boolean;
    }

    const allUsers: UserRecord[] = [];
    let userId = 1;
    const usedEmails = new Set<string>();

    function makeEmail(code: string, suffix: string): string {
      let email = `${suffix}.${code.toLowerCase().replace(/[^a-z0-9]/g, "")}@budget.go.ke`;
      if (usedEmails.has(email)) {
        email = `${suffix}.${code.toLowerCase().replace(/[^a-z0-9]/g, "")}.${userId}@budget.go.ke`;
      }
      usedEmails.add(email);
      return email;
    }

    function pickName(seed: number): string {
      const fn = firstNames[seed % firstNames.length];
      const ln = lastNames[Math.floor(seed / firstNames.length) % lastNames.length];
      return `${fn} ${ln}`;
    }

    for (const sector of sectors) {
      const hasChildren = sectors.some(s => s.parentId === sector.id);

      // Every sector gets a responsible officer / head
      const headName = pickName(userId);
      const headEmail = makeEmail(sector.code, titlePrefix(sector.depth).toLowerCase());
      allUsers.push({
        id: userId++,
        name: `${titlePrefix(sector.depth)} ${headName}`,
        email: headEmail,
        role: roleName(sector.depth),
        sectorId: sector.id,
        sectorCode: sector.code,
        sectorName: sector.name,
        isSupervisor: false,
      });

      // Parent sectors also get a supervisor/admin
      if (hasChildren) {
        const supName = pickName(userId);
        const supEmail = makeEmail(sector.code, "admin");
        allUsers.push({
          id: userId++,
          name: `Admin ${supName}`,
          email: supEmail,
          role: sector.depth <= 1 ? "super_admin" : "ministry_head",
          sectorId: sector.id,
          sectorCode: sector.code,
          sectorName: sector.name,
          isSupervisor: true,
        });
      }
    }

    // Also add a global auditor
    allUsers.push({
      id: userId++,
      name: "Budget Auditor",
      email: "auditor@budget.go.ke",
      role: "viewer",
      sectorId: sectors[0].id,
      sectorCode: sectors[0].code,
      sectorName: sectors[0].name,
      isSupervisor: false,
    });

    console.log(`Inserting ${allUsers.length} users...`);

    // Batch insert users in chunks for speed
    const CHUNK = 50;
    for (let i = 0; i < allUsers.length; i += CHUNK) {
      const chunk = allUsers.slice(i, i + CHUNK);
      const values: string[] = [];
      const params: (string | number | boolean)[] = [];
      chunk.forEach((u, j) => {
        const base = j * 6;
        values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, NOW(), NOW())`);
        params.push(u.id, u.name, u.email, PASSWORD_HASH, u.role, u.sectorId);
      });
      await client.query(
        `INSERT INTO users (id, name, email, password_hash, role, sector_id, created_at, updated_at)
         VALUES ${values.join(", ")}`,
        params
      );
    }
    await client.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`);
    console.log(`Inserted ${allUsers.length} users`);

    // Create budget cycle
    console.log("Creating budget cycle...");
    await client.query(
      `INSERT INTO budget_cycles (id, name, start_date, end_date, total_budget, is_active, created_by, created_at, updated_at)
       VALUES (1, 'FY 2025/2026', '2025-07-01', '2026-06-30', $1, true, 1, NOW(), NOW())`,
      [TOTAL_BUDGET]
    );
    await client.query(`SELECT setval('budget_cycles_id_seq', 1)`);

    // Create allocations — cascade from national down (batched)
    console.log("Creating allocations...");
    const adminUserId = allUsers[0].id;

    // Build all allocation rows first
    interface AllocRow { fromId: number; toId: number; amount: number; }
    const allocRows: AllocRow[] = [];
    function collectAllocations(parentSector: FlatSector) {
      const children = sectors.filter(s => s.parentId === parentSector.id);
      for (const child of children) {
        allocRows.push({ fromId: parentSector.id, toId: child.id, amount: child.budget });
        collectAllocations(child);
      }
    }
    collectAllocations(sectors[0]);

    // Batch insert allocations
    const ALLOC_CHUNK = 50;
    for (let i = 0; i < allocRows.length; i += ALLOC_CHUNK) {
      const chunk = allocRows.slice(i, i + ALLOC_CHUNK);
      const values: string[] = [];
      const params: (string | number)[] = [];
      chunk.forEach((a, j) => {
        const base = j * 4;
        values.push(`($${base + 1}, 1, $${base + 2}, $${base + 3}, $${base + 4}, 'active', ${adminUserId}, NOW(), NOW(), NOW())`);
        params.push(i + j + 1, a.fromId, a.toId, a.amount);
      });
      await client.query(
        `INSERT INTO allocations (id, budget_cycle_id, from_sector_id, to_sector_id, amount, status, allocated_by, allocated_at, created_at, updated_at)
         VALUES ${values.join(", ")}`,
        params
      );
    }
    await client.query(`SELECT setval('allocations_id_seq', ${allocRows.length})`);
    console.log(`Created ${allocRows.length} allocations`);

    // Create some products
    console.log("Creating products...");
    const products = [
      { name: "Desktop Computer", category: "ICT Equipment", unit: "unit", price: 85000 },
      { name: "Laptop Computer", category: "ICT Equipment", unit: "unit", price: 120000 },
      { name: "Office Desk", category: "Furniture", unit: "unit", price: 25000 },
      { name: "Office Chair", category: "Furniture", unit: "unit", price: 15000 },
      { name: "Whiteboard", category: "Teaching Aids", unit: "unit", price: 8000 },
      { name: "Projector", category: "ICT Equipment", unit: "unit", price: 95000 },
      { name: "Printer (Laser)", category: "ICT Equipment", unit: "unit", price: 45000 },
      { name: "Textbooks (Set)", category: "Teaching Aids", unit: "set", price: 12000 },
      { name: "Lab Equipment Kit", category: "Lab Equipment", unit: "kit", price: 350000 },
      { name: "Medical Supplies Kit", category: "Medical", unit: "kit", price: 180000 },
      { name: "Ambulance", category: "Vehicles", unit: "unit", price: 8500000 },
      { name: "School Bus", category: "Vehicles", unit: "unit", price: 6500000 },
      { name: "Security Camera System", category: "Security", unit: "system", price: 250000 },
      { name: "Server Rack", category: "ICT Equipment", unit: "unit", price: 450000 },
      { name: "Network Switch (48-port)", category: "ICT Equipment", unit: "unit", price: 65000 },
      { name: "Welding Machine", category: "Workshop Equipment", unit: "unit", price: 180000 },
      { name: "Automotive Diagnostic Tool", category: "Workshop Equipment", unit: "unit", price: 350000 },
      { name: "Solar Panel Kit (5kW)", category: "Energy", unit: "kit", price: 750000 },
      { name: "Water Pump", category: "Agriculture", unit: "unit", price: 120000 },
      { name: "Tractor", category: "Agriculture", unit: "unit", price: 4500000 },
    ];

    for (let i = 0; i < products.length; i++) {
      await client.query(
        `INSERT INTO products (id, name, category, unit, unit_price, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [i + 1, products[i].name, products[i].category, products[i].unit, products[i].price]
      );
    }
    await client.query(`SELECT setval('products_id_seq', ${products.length})`);
    console.log(`Inserted ${products.length} products`);

    await client.query("COMMIT");
    console.log("\n=== Seed complete! ===");
    console.log(`Total sectors: ${sectors.length}`);
    console.log(`Total budget: KES ${TOTAL_BUDGET.toLocaleString()}`);
    console.log(`Total allocations: ${allocRows.length}`);
    console.log(`Total users: ${allUsers.length}`);
    console.log(`Total products: ${products.length}`);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error seeding:", err);
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(console.error);
