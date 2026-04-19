// =============================================================
// SHEO DEEN VANSH â€” FAMILY TREE BUILDER
// Figma Plugin  |  code.js
// =============================================================
// HOW TO RUN:
//   1. Figma Desktop â†’ Plugins â†’ Development â†’ Import plugin from manifest
//   2. Select the manifest.json in this folder
//   3. Plugins â†’ Development â†’ "Sheo Deen Vansh â€” Family Tree Builder"
//   4. Wait ~15 seconds â€” done!
// =============================================================

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 1. COLOR UTILITIES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function hex(h) {
  return {
    r: parseInt(h.slice(1, 3), 16) / 255,
    g: parseInt(h.slice(3, 5), 16) / 255,
    b: parseInt(h.slice(5, 7), 16) / 255,
  };
}

const C = {
  canvas:     hex('#F5F0E8'),
  surface:    hex('#FAF7F2'),
  surfaceAlt: hex('#EDE5D8'),
  textPrim:   hex('#2C1810'),
  textSec:    hex('#6B5744'),
  textMuted:  hex('#9E8874'),
  border:     hex('#D5C9BB'),
  connector:  hex('#C4B49A'),
  gold:       hex('#C8A84B'),
  male:       hex('#4A6FA5'),
  female:     hex('#A5607A'),
  deceased:   hex('#C8BDB0'),
  rootDark:   hex('#3D2B1F'),
  rootMid:    hex('#5C3D2E'),
  // Branch colors
  branchA:    hex('#7B6B52'),
  branchAL:   hex('#C4B49A'),
  branchAP:   hex('#EDE5D8'),
  branchB:    hex('#5C7A6B'),
  branchBL:   hex('#9DB8AD'),
  branchBP:   hex('#D8E8E3'),
  branchC:    hex('#8B6B42'),
  branchCL:   hex('#C9A87A'),
  branchCP:   hex('#EED9BE'),
  branchD:    hex('#6B5A7E'),
  branchDL:   hex('#ADA0BD'),
  branchDP:   hex('#E2DCEB'),
};

function branchMain(b) {
  return { root: C.rootDark, A: C.branchA, B: C.branchB, C: C.branchC, D: C.branchD }[b] || C.rootDark;
}
function branchLight(b) {
  return { root: C.connector, A: C.branchAL, B: C.branchBL, C: C.branchCL, D: C.branchDL }[b] || C.connector;
}
function branchPale(b) {
  return { root: C.surfaceAlt, A: C.branchAP, B: C.branchBP, C: C.branchCP, D: C.branchDP }[b] || C.surfaceAlt;
}
function solid(color, opacity = 1) {
  return [{ type: 'SOLID', color, opacity }];
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 2. FAMILY DATA
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// branch:     root | A | B | C | D
// status:     living | deceased
// relation:   son (default) | daughter
// marriedOut: true = daughter who left the family (no children shown)
// issueless:  true = died without children

const PERSONS = [
  // â”€â”€ ROOT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id:'P001', name:'Sheo Deen',       gender:'M', gen:0, branch:'root', status:'deceased', parentId:null },
  { id:'P002', name:'Durga Prasad',    gender:'M', gen:1, branch:'root', status:'deceased', parentId:'P001' },

  // â”€â”€ GEN 1 â€” SHEO DEEN'S SONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id:'P003', name:'Mata Deen',       gender:'M', gen:1, branch:'root', status:'deceased', parentId:'P001', issueless:true },

  // â”€â”€ GEN 2 â€” DURGA PRASAD CHILDREN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id:'P004', name:'Mahavir Prasad',  gender:'M', gen:2, branch:'A',    status:'deceased', parentId:'P002' },
  { id:'P005', name:'Mawa Lal',        gender:'M', gen:2, branch:'B',    status:'deceased', parentId:'P002' },
  { id:'P006', name:'Ram Adneen',      gender:'M', gen:2, branch:'C',    status:'deceased', parentId:'P002' },
  { id:'P006b',name:'Smt Mithana',     gender:'F', gen:2, branch:'root', parentId:'P002',   relation:'daughter', marriedOut:true },
  { id:'P006c',name:'Smt Sukhi',       gender:'F', gen:2, branch:'root', parentId:'P002',   relation:'daughter', marriedOut:true },
  { id:'P007', name:'Brij Lal',        gender:'M', gen:2, branch:'D',    status:'deceased', parentId:'P002' },

  // â”€â”€ BRANCH A â€” MAHAVIR PRASAD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id:'P010', name:'Rameshwar Prasad',gender:'M', gen:3, branch:'A', parentId:'P004' },
  { id:'P011', name:'Gauri Shanker',   gender:'M', gen:3, branch:'A', parentId:'P004' },
  { id:'P012', name:'Shyam Lal',       gender:'M', gen:3, branch:'A', parentId:'P004' },
  { id:'P013', name:'Sheo Darshan',    gender:'M', gen:3, branch:'A', parentId:'P004' },

  // A â†’ Rameshwar Prasad
  { id:'P020', name:'Shiv Balak',      gender:'M', gen:4, branch:'A', parentId:'P010' },
  { id:'P021', name:'Rama',            gender:'M', gen:4, branch:'A', parentId:'P010' },
  { id:'P022', name:'Harish Chandra',  gender:'M', gen:4, branch:'A', parentId:'P010' },
  { id:'P023', name:'Gyana',           gender:'F', gen:4, branch:'A', parentId:'P010', relation:'daughter', marriedOut:true },

  // A â†’ Shiv Balak
  { id:'P030', name:'Rakesh',          gender:'M', gen:5, branch:'A', parentId:'P020' },
  { id:'P031', name:'Poonam',          gender:'F', gen:5, branch:'A', parentId:'P020', relation:'daughter', marriedOut:true },
  { id:'P032', name:'Alka',            gender:'F', gen:5, branch:'A', parentId:'P020', relation:'daughter', marriedOut:true },
  { id:'P033', name:'Reena',           gender:'F', gen:5, branch:'A', parentId:'P020', relation:'daughter', marriedOut:true },

  // A â†’ Rakesh
  { id:'P040', name:'Nishtha',         gender:'F', gen:6, branch:'A', parentId:'P030', relation:'daughter' },
  { id:'P041', name:'Krishna',         gender:'M', gen:6, branch:'A', parentId:'P030' },
  { id:'P042', name:'Pratishtha',       gender:'F', gen:6, branch:'A', parentId:'P030', relation:'daughter' },

  // A â†’ Harish Chandra
  { id:'P050', name:'Sandhya',         gender:'F', gen:5, branch:'A', parentId:'P022', relation:'daughter', marriedOut:true },
  { id:'P051', name:'Sandeep',         gender:'M', gen:5, branch:'A', parentId:'P022' },
  { id:'P052', name:'Somi',            gender:'F', gen:5, branch:'A', parentId:'P022', relation:'daughter', marriedOut:true },

  // A â†’ Karan (Shyam Lal's son)
  { id:'P055', name:'Anupma',          gender:'F', gen:5, branch:'A', parentId:'P053', relation:'daughter', marriedOut:true },
  { id:'P056', name:'Ankit',           gender:'M', gen:5, branch:'A', parentId:'P053' },
  { id:'P057', name:'Roli',            gender:'F', gen:5, branch:'A', parentId:'P053', relation:'daughter', marriedOut:true },

  // A â†’ Shyam Lal
  { id:'P053', name:'Karan',           gender:'M', gen:4, branch:'A', parentId:'P012' },
  { id:'P054', name:'Sarveshwari',     gender:'F', gen:4, branch:'A', parentId:'P012', relation:'daughter', marriedOut:true },

  // A â†’ Sheo Darshan
  { id:'P406a', name:'Unknown Daughter 1', gender:'F', gen:4, branch:'A', parentId:'P013', relation:'daughter', marriedOut:true },
  { id:'P406', name:'Kalawati',        gender:'F', gen:4, branch:'A', parentId:'P013', relation:'daughter', marriedOut:true },
  { id:'P406b', name:'Unknown Daughter 2', gender:'F', gen:4, branch:'A', parentId:'P013', relation:'daughter', marriedOut:true },
  { id:'P400', name:'Newal Kishore',   gender:'M', gen:4, branch:'A', parentId:'P013' },
  { id:'P401', name:'Raj Kishore',     gender:'M', gen:4, branch:'A', parentId:'P013' },

  // A â†’ Newal Kishore
  { id:'P402', name:'Savita',          gender:'F', gen:5, branch:'A', parentId:'P400', relation:'daughter', marriedOut:true },
  { id:'P403', name:'Ranjana',         gender:'F', gen:5, branch:'A', parentId:'P400', relation:'daughter', marriedOut:true },
  { id:'P404', name:'Babloo',          gender:'M', gen:5, branch:'A', parentId:'P400' },

  // A â†’ Raj Kishore
  { id:'P405', name:'Swati',           gender:'F', gen:5, branch:'A', parentId:'P401', relation:'daughter', marriedOut:true },

  // D â†’ Tara Chandra (also: Ravindra, Avaneesh, Kapil, Meenal)
  { id:'P301', name:'Ravindra',        gender:'M', gen:4, branch:'D', parentId:'P100' },
  { id:'P302', name:'Avaneesh',        gender:'M', gen:4, branch:'D', parentId:'P100' },
  { id:'P303', name:'Kapil',           gender:'M', gen:4, branch:'D', parentId:'P100' },
  { id:'P304', name:'Meenal',          gender:'F', gen:4, branch:'D', parentId:'P100', relation:'daughter', marriedOut:true },

  // D â†’ Ravindra
  { id:'P312', name:'Raghvendra',      gender:'M', gen:5, branch:'D', parentId:'P301' },
  { id:'P313', name:'Shivendra',       gender:'M', gen:5, branch:'D', parentId:'P301' },

  // D â†’ Avaneesh
  { id:'P314', name:'Srishti',         gender:'F', gen:5, branch:'D', parentId:'P302', relation:'daughter', marriedOut:true },
  { id:'P315', name:'Anushka',         gender:'F', gen:5, branch:'D', parentId:'P302', relation:'daughter', marriedOut:true },

  // D â†’ Kapil
  { id:'P316', name:'Vaibhav',         gender:'M', gen:5, branch:'D', parentId:'P303' },
  { id:'P317', name:'Shivangi',        gender:'F', gen:5, branch:'D', parentId:'P303', relation:'daughter' },

  // â”€â”€ BRANCH B â€” MAWA LAL (no documented descendants) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Mawa Lal's line is not documented in this record.

  // â”€â”€ BRANCH D â€” BRIJ LAL (extended) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Tara Chandra, Ashok, Avadesh, Lalta Prasad are sons of Brij Lal
  { id:'P100', name:'Tara Chandra',    gender:'M', gen:3, branch:'D', status:'deceased', parentId:'P007' },
  { id:'P104', name:'Ashok',           gender:'M', gen:3, branch:'D', status:'deceased', parentId:'P007' },
  { id:'P105', name:'Avadesh',         gender:'M', gen:3, branch:'D', parentId:'P007' },
  { id:'P101', name:'Lalta Prasad',    gender:'M', gen:3, branch:'D', parentId:'P007', status:'deceased' },
  { id:'P102', name:'Jamuna',          gender:'F', gen:3, branch:'D', parentId:'P007', relation:'daughter', marriedOut:true },
  { id:'P103', name:'Kiran',           gender:'F', gen:3, branch:'D', parentId:'P007', relation:'daughter', marriedOut:true },
  { id:'P007f',name:'Smita',           gender:'F', gen:3, branch:'D', parentId:'P007', relation:'daughter', marriedOut:true },

  // D â†’ Tara Chandra (4 sons, 1 daughter â€” Praveen confirmed; others TBD)
  { id:'P300', name:'Praveen',         gender:'M', gen:4, branch:'D', parentId:'P100' },

  // D â†’ Praveen
  { id:'P310', name:'Avantika',        gender:'F', gen:5, branch:'D', parentId:'P300', relation:'daughter', marriedOut:true },
  { id:'P311', name:'Ankur',           gender:'M', gen:5, branch:'D', parentId:'P300' },

  // D â†’ Ankur
  { id:'P318', name:'Sidak',           gender:'M', gen:6, branch:'D', parentId:'P311' },

  // D â†’ Ashok
  { id:'P113', name:'Anshul',          gender:'M', gen:4, branch:'D', parentId:'P104' },
  { id:'P114', name:'Anshuman',        gender:'M', gen:4, branch:'D', parentId:'P104' },

  // D â†’ Avadesh (Awadesh)
  { id:'P110', name:'Anoop',           gender:'M', gen:4, branch:'D', parentId:'P105' },
  { id:'P111', name:'Toshi',           gender:'F', gen:4, branch:'D', parentId:'P105', relation:'daughter', marriedOut:true },
  { id:'P112', name:'Richa',           gender:'F', gen:4, branch:'D', parentId:'P105', relation:'daughter', marriedOut:true },

  // D â†’ Anoop
  { id:'P115', name:'Ishanvi',         gender:'F', gen:5, branch:'D', parentId:'P110' },
  { id:'P116', name:'Ishaan',          gender:'M', gen:5, branch:'D', parentId:'P110' },

  // â”€â”€ BRANCH C â€” RAM ADNEEN (one daughter only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id:'P200', name:'Smt Ram Rani',    gender:'F', gen:3, branch:'C', parentId:'P006', relation:'daughter', marriedOut:true },

  // â”€â”€ BRANCH D â€” BRIJ LAL daughters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id:'P201', name:'Janak Dulari',    gender:'F', gen:3, branch:'D', parentId:'P007', relation:'daughter', marriedOut:true },
  { id:'P202', name:'Kamla',           gender:'F', gen:3, branch:'D', parentId:'P007', relation:'daughter', marriedOut:true },
  { id:'P203', name:'Bimla',           gender:'F', gen:3, branch:'D', parentId:'P007', relation:'daughter', marriedOut:true },

  // â”€â”€ BRANCH A â€” Gauri Shankar â†’ Raja Ram â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id:'P210', name:'Raja Ram',        gender:'M', gen:4, branch:'A', parentId:'P011' },

  // A â†’ Raja Ram
  { id:'P211', name:'Manju',           gender:'F', gen:5, branch:'A', parentId:'P210', relation:'daughter', marriedOut:true },
  { id:'P212', name:'Anju',            gender:'F', gen:5, branch:'A', parentId:'P210', relation:'daughter', marriedOut:true },
  { id:'P213', name:'Neetu',           gender:'F', gen:5, branch:'A', parentId:'P210', relation:'daughter', marriedOut:true },
  { id:'P214', name:'Amit',            gender:'M', gen:5, branch:'A', parentId:'P210', issueless:true },

  // â”€â”€ BRANCH B â€” MAWA LAL children â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id:'P220', name:'Shiva Ram',       gender:'M', gen:3, branch:'B', parentId:'P005' },
  { id:'P223', name:'Ram Singh',       gender:'M', gen:3, branch:'B', parentId:'P005' },

  // B â†’ Mawa Lal (siblings of Shiva Ram)
  { id:'P221', name:'Shiva Rani',      gender:'F', gen:3, branch:'B', parentId:'P005', relation:'daughter', marriedOut:true },
  { id:'P222', name:'Shanti',          gender:'F', gen:3, branch:'B', parentId:'P005', relation:'daughter', marriedOut:true },

  // B â†’ Shiva Ram
  { id:'P230', name:'Mahesh Prasad',   gender:'M', gen:4, branch:'B', parentId:'P220', issueless:true },

  // B â†’ Ram Singh
  { id:'P231', name:'Rajeshwari',      gender:'F', gen:4, branch:'B', parentId:'P220', relation:'daughter', marriedOut:true },
  { id:'P232', name:'Ratnesh',         gender:'M', gen:4, branch:'B', parentId:'P223', status:'deceased' },
  { id:'P233', name:'Brijesh',         gender:'M', gen:4, branch:'B', parentId:'P223', status:'deceased' },
  { id:'P234', name:'Mridulesh',       gender:'M', gen:4, branch:'B', parentId:'P223' },
  { id:'P235', name:'Jyoti',           gender:'F', gen:4, branch:'B', parentId:'P223', relation:'daughter', marriedOut:true },

  // B â†’ Ratnesh
  { id:'P236', name:'Swapnil',         gender:'M', gen:5, branch:'B', parentId:'P232' },

  // B â†’ Brijesh
  { id:'P237', name:'Shubham',         gender:'M', gen:5, branch:'B', parentId:'P233' },

  // â”€â”€ GEN 2 â€” DURGA PRASAD daughters (siblings of Brij Lal) â”€â”€â”€â”€
  { id:'P007a',name:'Poonam',          gender:'F', gen:2, branch:'root', parentId:'P002', relation:'daughter', marriedOut:true },
  { id:'P007b',name:'Dhiraja',         gender:'F', gen:2, branch:'root', parentId:'P002', relation:'daughter', marriedOut:true },
  { id:'P007c',name:'Phul Jhara',      gender:'F', gen:2, branch:'root', parentId:'P002', relation:'daughter', marriedOut:true },
  { id:'P007d',name:'Jashoda',         gender:'F', gen:2, branch:'root', parentId:'P002', relation:'daughter', marriedOut:true },
  { id:'P007e',name:'Bhagwan Dei',     gender:'F', gen:2, branch:'root', parentId:'P002', relation:'daughter', marriedOut:true },
];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 3. LAYOUT ALGORITHM
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CARD_W  = 152;
const CARD_H  = 70;
const H_GAP   = 28;
const V_GAP   = 90;   // space between bottom of parent and top of child
const V_STRIDE = CARD_H + V_GAP;

function getChildren(pid) {
  return PERSONS.filter(p => p.parentId === pid);
}

function subtreeWidth(pid) {
  const kids = getChildren(pid);
  if (kids.length === 0) return CARD_W;
  const total = kids.reduce((s, c) => s + subtreeWidth(c.id), 0)
              + H_GAP * (kids.length - 1);
  return Math.max(CARD_W, total);
}

function computeLayout(pid, cx, cy) {
  const pos = {};
  pos[pid] = { x: cx - CARD_W / 2, y: cy };

  const kids = getChildren(pid);
  if (kids.length === 0) return pos;

  const widths   = kids.map(c => subtreeWidth(c.id));
  const totalW   = widths.reduce((s, w) => s + w, 0) + H_GAP * (kids.length - 1);
  let   childX   = cx - totalW / 2;

  kids.forEach((kid, i) => {
    const kidCX = childX + widths[i] / 2;
    Object.assign(pos, computeLayout(kid.id, kidCX, cy + V_STRIDE));
    childX += widths[i] + H_GAP;
  });

  return pos;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 4. FONT LOADING
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function loadFonts() {
  const wanted = [
    { family: 'Playfair Display', style: 'Bold' },
    { family: 'Playfair Display', style: 'SemiBold' },
    { family: 'Playfair Display', style: 'Regular' },
    { family: 'DM Sans',          style: 'Medium' },
    { family: 'DM Sans',          style: 'Regular' },
  ];
  for (const f of wanted) {
    try { await figma.loadFontAsync(f); }
    catch (_) { /* will use fallback */ }
  }
  // Always load fallbacks
  await figma.loadFontAsync({ family: 'Georgia',     style: 'Regular' });
  await figma.loadFontAsync({ family: 'Georgia',     style: 'Bold' });
  await figma.loadFontAsync({ family: 'Inter',       style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter',       style: 'Medium' });
}

function serifFont(bold = false) {
  try {
    const style = bold ? 'Bold' : 'SemiBold';
    return { family: 'Playfair Display', style };
  } catch (_) {
    return { family: 'Georgia', style: bold ? 'Bold' : 'Regular' };
  }
}

function sansFont(medium = false) {
  try {
    return { family: 'DM Sans', style: medium ? 'Medium' : 'Regular' };
  } catch (_) {
    return { family: 'Inter', style: medium ? 'Medium' : 'Regular' };
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 5. NODE CREATION HELPERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function vLine(parent, cx, y1, y2, color, weight = 1.5) {
  const r = figma.createRectangle();
  r.name = 'Connector/V';
  r.x = Math.round(cx - weight / 2);
  r.y = Math.round(y1);
  r.resize(Math.max(1, weight), Math.max(1, y2 - y1));
  r.fills = solid(color);
  parent.appendChild(r);
  return r;
}

function hLine(parent, x1, x2, cy, color, weight = 1.5) {
  if (Math.abs(x2 - x1) < 1) return;
  const r = figma.createRectangle();
  r.name = 'Connector/H';
  r.x = Math.round(Math.min(x1, x2));
  r.y = Math.round(cy - weight / 2);
  r.resize(Math.max(1, Math.abs(x2 - x1)), Math.max(1, weight));
  r.fills = solid(color);
  parent.appendChild(r);
  return r;
}

function addText(parent, txt, x, y, w, h, fontName, size, color, align = 'LEFT') {
  const t = figma.createText();
  t.x = x; t.y = y;
  t.fontName = fontName;
  t.fontSize = size;
  t.textAlignHorizontal = align;
  t.textAutoResize = 'NONE';
  t.resize(w, h);
  t.characters = txt;
  t.fills = solid(color);
  parent.appendChild(t);
  return t;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 6. PERSON CARD
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function createCard(person, x, y) {
  const isDaughter  = person.relation === 'daughter';
  const isDeceased  = person.status   === 'deceased';
  const isIssueless = !!person.issueless;
  const isRoot      = person.gen <= 1;

  const bMain  = branchMain(person.branch);
  const barClr = isDaughter ? C.female : bMain;
  const bgClr  = isDeceased ? C.deceased
               : isDaughter ? branchPale(person.branch)
               : C.surface;

  // Card frame
  const card = figma.createFrame();
  card.name = `Card/${person.branch}/G${person.gen}_${person.name}`;
  card.x = Math.round(x);
  card.y = Math.round(y);
  card.resize(CARD_W, isRoot ? 80 : CARD_H);
  card.cornerRadius = 10;
  card.clipsContent = true;
  card.fills = solid(bgClr, isDeceased ? 0.75 : 1);
  card.strokes = solid(isDaughter ? C.female : isDeceased ? C.textMuted : C.border);
  card.strokeWeight = isRoot ? 2 : 1;
  card.effects = isRoot ? [] : [{
    type: 'DROP_SHADOW',
    color: { r: 0.17, g: 0.09, b: 0.06, a: 0.10 },
    offset: { x: 0, y: 2 },
    radius: 8,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL',
  }];

  // Top accent bar
  const bar = figma.createRectangle();
  bar.name = 'AccentBar';
  bar.x = 0; bar.y = 0;
  bar.resize(CARD_W, isRoot ? 5 : 4);
  bar.fills = solid(barClr);
  card.appendChild(bar);

  const topPad   = (isRoot ? 5 : 4) + 8;
  const cardH    = isRoot ? 80 : CARD_H;
  const nameFont = serifFont(isRoot);
  const nameSize = isRoot ? 14 : 12;
  const nameClr  = isDeceased ? C.textSec : C.textPrim;

  // Name
  addText(card, person.name, 10, topPad, CARD_W - 20, nameSize + 4, nameFont, nameSize, nameClr);

  // Sub-label (relation or issueless)
  if (isDaughter || isIssueless) {
    const lbl = isIssueless ? '(No Issue Â· Died)' : isDaughter ? '(Daughter)' : '';
    addText(card, lbl, 10, topPad + nameSize + 6, CARD_W - 20, 14, sansFont(), 10,
            isDaughter ? C.female : C.textMuted);
  }

  // Generation badge on root nodes
  if (isRoot) {
    const genNums = ['I','II','III','IV','V','VI','VII'];
    const badge = figma.createFrame();
    badge.name = 'GenBadge';
    badge.x = CARD_W - 30; badge.y = cardH - 22;
    badge.resize(22, 16);
    badge.cornerRadius = 4;
    badge.fills = solid(barClr);
    const bt = figma.createText();
    bt.x = 2; bt.y = 2;
    bt.fontName = sansFont(true);
    bt.fontSize = 9;
    bt.textAlignHorizontal = 'CENTER';
    bt.textAutoResize = 'NONE';
    bt.resize(18, 12);
    bt.characters = genNums[person.gen] || String(person.gen + 1);
    bt.fills = solid(C.surface);
    badge.appendChild(bt);
    card.appendChild(badge);
  }

  // Gender dot
  const dot = figma.createEllipse();
  dot.name = 'GenderDot';
  dot.x = CARD_W - 14; dot.y = topPad + 2;
  dot.resize(7, 7);
  dot.fills = solid(person.gender === 'F' ? C.female : C.male);
  card.appendChild(dot);

  return card;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 7. CONNECTORS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function drawTree(canvas, positions, pid) {
  const person = PERSONS.find(p => p.id === pid);
  const kids   = getChildren(pid);
  if (!kids.length) return;

  const pp   = positions[pid];
  if (!pp) return;
  const ph   = person.gen <= 1 ? 80 : CARD_H;
  const pCX  = pp.x + CARD_W / 2;
  const pBot = pp.y + ph;
  const midY = pBot + Math.round(V_GAP / 2);

  const clr    = branchLight(person.branch);
  const weight = person.gen <= 1 ? 2 : 1.5;

  // Drop from parent
  vLine(canvas, pCX, pBot, midY, clr, weight);

  const kidPositions = kids.map(k => positions[k.id]).filter(Boolean);
  if (!kidPositions.length) return;

  if (kids.length === 1) {
    const kp  = kidPositions[0];
    const kCX = kp.x + CARD_W / 2;
    if (Math.abs(kCX - pCX) > 2) {
      hLine(canvas, pCX, kCX, midY, clr, weight);
    }
    vLine(canvas, kCX, midY, kp.y, clr, weight);
  } else {
    const leftCX  = kidPositions[0].x + CARD_W / 2;
    const rightCX = kidPositions[kidPositions.length - 1].x + CARD_W / 2;
    hLine(canvas, leftCX, rightCX, midY, clr, weight);
    kidPositions.forEach(kp => {
      const kCX = kp.x + CARD_W / 2;
      vLine(canvas, kCX, midY, kp.y, clr, weight);
    });
  }

  kids.forEach(k => drawTree(canvas, positions, k.id));
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 8. TITLE BLOCK
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function buildTitleBlock(canvas, canvasW) {
  const tf = figma.createFrame();
  tf.name = 'TitleBlock';
  tf.x = 0; tf.y = 0;
  tf.resize(canvasW, 88);
  tf.fills = solid(C.rootDark);
  tf.clipsContent = false;

  // Decorative left bar
  const lb = figma.createRectangle();
  lb.x = 0; lb.y = 0;
  lb.resize(6, 88);
  lb.fills = solid(C.gold);
  tf.appendChild(lb);

  addText(tf, 'Sheo Deen Vansh', 24, 14, 600, 38,
          serifFont(true), 28, { r:0.98, g:0.97, b:0.95 });
  addText(tf, 'Family Tree of Sheo Deen Vansh - Babuganj, Lucknow - Compiled by late Shri Tara Chandra Singh - Best of knowledge',
          24, 56, 700, 18, sansFont(), 12, { r:0.70, g:0.60, b:0.55 });

  // Right side: generation count
  addText(tf, `${PERSONS.length} Members   Â·   7 Generations   Â·   3 Branches`,
          canvasW - 360, 36, 340, 18, sansFont(), 11,
          { r:0.55, g:0.45, b:0.40 }, 'RIGHT');

  canvas.appendChild(tf);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 9. LEGEND
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function buildLegend(canvas, lx, ly) {
  const branches = [
    { id:'A', label:'Mahavir Prasad', color: C.branchA },
    { id:'C', label:'Ram Adnoon',     color: C.branchC },
    { id:'D', label:'Brij Lal',       color: C.branchD },
  ];
  const symbols = [
    { dot: C.male,    label: 'Son / Male' },
    { dot: C.female,  label: 'Daughter / Female' },
    { dot: C.deceased,label: 'Deceased' },
  ];

  const lf = figma.createFrame();
  lf.name = 'Legend';
  lf.x = lx; lf.y = ly;
  lf.resize(210, 170);
  lf.cornerRadius = 8;
  lf.fills = solid(C.surface);
  lf.strokes = solid(C.border);
  lf.strokeWeight = 1;
  lf.effects = [{
    type: 'DROP_SHADOW',
    color: { r:0.17, g:0.09, b:0.06, a:0.08 },
    offset: { x:0, y:4 },
    radius: 12,
    spread:0, visible:true, blendMode:'NORMAL',
  }];

  addText(lf, 'BRANCHES', 12, 12, 120, 14, sansFont(true), 10, C.textMuted);

  branches.forEach((b, i) => {
    const dot = figma.createEllipse();
    dot.x = 12; dot.y = 32 + i * 22;
    dot.resize(10, 10);
    dot.fills = solid(b.color);
    lf.appendChild(dot);
    addText(lf, `${b.id} â€” ${b.label}`, 28, 30 + i * 22, 170, 14, sansFont(), 11, C.textPrim);
  });

  addText(lf, 'SYMBOLS', 12, 126, 100, 14, sansFont(true), 10, C.textMuted);
  symbols.forEach((s, i) => {
    const dot = figma.createEllipse();
    dot.x = 12; dot.y = 144 + i * 0; // packed
    dot.resize(8, 8);
    dot.fills = solid(s.dot);
    // Skip for brevity, just label
  });
  addText(lf, 'â— Son   â— Daughter   â—‹ Deceased', 12, 142, 186, 14, sansFont(), 10, C.textMuted);

  canvas.appendChild(lf);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 10. GENERATION RAIL
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function buildGenRail(canvas, genYMap, offsetY, canvasW) {
  const labels = [
    'Gen I â€” Patriarch',
    'Gen II',
    'Gen III â€” Branch Founders',
    'Gen IV',
    'Gen V',
    'Gen VI',
    'Gen VII',
  ];
  const titleH = 88;
  const PAD    = 60;

  for (const [gen, rawY] of Object.entries(genYMap)) {
    const gy = rawY + offsetY + titleH;
    // Hairline guide across full canvas
    const guide = figma.createRectangle();
    guide.name  = `GenGuide/G${gen}`;
    guide.x     = 0;
    guide.y     = Math.round(gy - 1);
    guide.resize(canvasW, 1);
    guide.fills = solid(C.border, 0.25);
    canvas.appendChild(guide);

    // Label
    addText(canvas, labels[parseInt(gen)] || `Gen ${parseInt(gen) + 1}`,
            12, Math.round(gy + 4), 180, 14, sansFont(), 10, C.textMuted);
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 11. BRANCH HEADER BANNERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function buildBranchBanner(canvas, branch, positions, offsetX, offsetY, titleH) {
  const branchPersons = PERSONS.filter(p => p.branch === branch && p.gen === 2);
  if (!branchPersons.length) return;

  const bp = branchPersons[0];
  const pos = positions[bp.id];
  if (!pos) return;

  const bx = pos.x + offsetX - 12;
  const by = (pos.y + offsetY + titleH) - 24;

  addText(canvas,
    `Branch ${branch}`,
    bx, by, 120, 18,
    sansFont(true), 10,
    branchMain(branch));
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 12. MAIN
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function main() {
  figma.notify('Loading fontsâ€¦', { timeout: 20000 });
  await loadFonts();

  figma.notify('Computing layoutâ€¦', { timeout: 20000 });

  // Compute positions (relative, origin at P001 center)
  const rawPos = computeLayout('P001', 0, 0);

  // Canvas bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of Object.values(rawPos)) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x + CARD_W);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y + CARD_H);
  }

  const PAD     = 140;
  const TITLE_H = 88;
  const canvasW = Math.max(maxX - minX + PAD * 2, 1440);
  const canvasH = maxY - minY + PAD * 2 + TITLE_H;
  const offsetX = -minX + PAD;
  const offsetY = -minY + PAD;

  // Adjust positions with offset (for drawing connectors and cards)
  const positions = {};
  for (const [id, p] of Object.entries(rawPos)) {
    positions[id] = {
      x: p.x + offsetX,
      y: p.y + offsetY + TITLE_H,
    };
  }

  // Collect gen Y map
  const genYMap = {};
  for (const person of PERSONS) {
    const pos = rawPos[person.id];
    if (pos && genYMap[person.gen] === undefined) {
      genYMap[person.gen] = pos.y;
    }
  }

  // Create canvas frame
  figma.notify('Building canvasâ€¦', { timeout: 30000 });
  const canvas = figma.createFrame();
  canvas.name = 'Tree/Overview_Desktop';
  canvas.x = 0; canvas.y = 0;
  canvas.resize(Math.round(canvasW), Math.round(canvasH));
  canvas.fills = solid(C.canvas);
  canvas.clipsContent = false;
  figma.currentPage.appendChild(canvas);

  // Title
  await buildTitleBlock(canvas, canvasW);

  // Generation rails
  await buildGenRail(canvas, genYMap, offsetY, canvasW);

  // Branch banners
  for (const b of ['A','B','C','D']) {
    await buildBranchBanner(canvas, b, rawPos, offsetX, offsetY, TITLE_H);
  }

  // Connectors (drawn first so cards appear on top)
  figma.notify('Drawing connectorsâ€¦', { timeout: 30000 });
  drawTree(canvas, positions, 'P001');

  // Person cards
  figma.notify('Creating person cardsâ€¦', { timeout: 60000 });
  for (const person of PERSONS) {
    const pos = positions[person.id];
    if (!pos) continue;
    const card = await createCard(person, pos.x, pos.y);
    canvas.appendChild(card);
  }

  // Legend
  await buildLegend(canvas, 20, TITLE_H + 8);

  // Footer
  addText(canvas,
    'Family tree compiled by late Shri Tara Chandra Singh with best of knowledge - Sheo Deen Vansh - Babuganj, Lucknow',
    PAD, canvasH - 32, canvasW - PAD * 2, 20,
    sansFont(), 11, C.textMuted, 'CENTER');

  // Select and zoom
  figma.currentPage.selection = [canvas];
  figma.viewport.scrollAndZoomIntoView([canvas]);

  figma.notify(`âœ“ Done! ${PERSONS.length} family members placed across ${canvasW.toFixed(0)}Ã—${canvasH.toFixed(0)}px canvas.`, { timeout: 5000 });
  figma.closePlugin();
}

main().catch(err => {
  console.error(err);
  figma.notify(`Error: ${err.message}`, { timeout: 8000 });
  figma.closePlugin();
});

