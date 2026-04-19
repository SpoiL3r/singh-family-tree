(function () {
  const FAMILY_DATA = window.FAMILY_DATA || {};
  const PERSONS = Array.isArray(FAMILY_DATA.persons) ? FAMILY_DATA.persons : [];
  const BRANCH_META = FAMILY_DATA.branchMeta || {};

  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
  const CARD_WIDTH = 200;
  const CARD_HEIGHT = 116;
  const CARD_HEIGHT_ROOT = 132;
  const CARD_WIDTH_ROOT = 220;
  const H_GAP = 28;
  const V_GAP = 110;
  const PAD = 180;
  const MIN_SCALE = 0.1;
  const MAX_SCALE = 3.2;
  const BRANCH_KEYS = ["A", "B", "C", "D"];

  const Motion = {
    reduced: typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    get enabled() { return !this.reduced && typeof window.anime === "function"; }
  };
  if (typeof window.matchMedia === "function") {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = (event) => { Motion.reduced = event.matches; };
    if (mq.addEventListener) mq.addEventListener("change", listener);
    else if (mq.addListener) mq.addListener(listener);
  }

  const Elements = {
    wrap: document.getElementById("tree-wrapper"),
    svg: document.getElementById("lines"),
    cont: document.getElementById("canvas-container"),
    mobilePanel: document.getElementById("mobile-panel"),
    mobileInfoToggle: document.getElementById("mobile-info-toggle"),
    mobileDockInfo: document.getElementById("mobile-dock-info"),
    mobilePanelClose: document.getElementById("mobile-panel-close"),
    desktopPanel: document.getElementById("desktop-panel"),
    desktopPanelToggle: document.getElementById("desktop-panel-toggle"),
    desktopPanelClose: document.getElementById("desktop-panel-close"),
    zoomReadout: document.getElementById("zoom-readout"),
    mobileZoomReadout: document.getElementById("mobile-zoom-readout"),
    personOptions: document.getElementById("person-options"),
    startupError: document.getElementById("startup-error"),
    overviewBranchGrid: document.getElementById("overview-branch-grid"),
    mobileBranchGrid: document.getElementById("mobile-branch-grid"),
    fitViewButton: document.getElementById("fit-view-button"),
    centerRootButton: document.getElementById("center-root-button"),
    zoomInButton: document.getElementById("zoom-in-button"),
    zoomOutButton: document.getElementById("zoom-out-button"),
    mobileFitViewButton: document.getElementById("mobile-fit-view-button"),
    mobileCenterRootButton: document.getElementById("mobile-center-root-button"),
    mobileZoomInButton: document.getElementById("mobile-zoom-in-button"),
    mobileZoomOutButton: document.getElementById("mobile-zoom-out-button"),
    relationHero: document.getElementById("relation-hero"),
    relationHeroCollapse: document.getElementById("relation-hero-collapse"),
    relationResult: document.getElementById("relation-result"),
    relationResultClose: document.getElementById("relation-result-close"),
    mobileRelationResult: document.getElementById("mobile-relation-result"),
    mobileToast: document.getElementById("mobile-result-toast"),
    mobileToastClose: document.getElementById("mobile-toast-close"),
    mobileToastDetails: document.getElementById("mobile-toast-details")
  };

  const State = {
    byId: {},
    kids: {},
    pos: {},
    root: null,
    layoutMetrics: null,
    founderIdByBranch: {}
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = String(value);
  }

  function normalizeKey(value) {
    return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function cardWidthForPerson(person) {
    return person.gen <= 1 ? CARD_WIDTH_ROOT : CARD_WIDTH;
  }

  function cardHeightForPerson(person) {
    return person.gen <= 1 ? CARD_HEIGHT_ROOT : CARD_HEIGHT;
  }

  function parentIdsOf(person) {
    if (!person) return [];
    const ids = [];
    if (person.parentId) ids.push(person.parentId);
    if (person.motherId) ids.push(person.motherId);
    return ids;
  }

  function buildIndexes() {
    State.byId = {};
    State.kids = {};
    State.kidsByEitherParent = {};
    State.insertionOrder = {};

    PERSONS.forEach((person, index) => {
      State.byId[person.id] = person;
      State.insertionOrder[person.id] = index;
      // State.kids tracks the paternal line only (drives the visible tree layout).
      if (person.parentId) {
        if (!State.kids[person.parentId]) State.kids[person.parentId] = [];
        State.kids[person.parentId].push(person.id);
      }
      // State.kidsByEitherParent drives relation traversal through mothers too.
      parentIdsOf(person).forEach((parentId) => {
        if (!State.kidsByEitherParent[parentId]) State.kidsByEitherParent[parentId] = [];
        if (!State.kidsByEitherParent[parentId].includes(person.id)) {
          State.kidsByEitherParent[parentId].push(person.id);
        }
      });
    });

    State.root = PERSONS.find((person) => !person.parentId && !person.motherId) || null;
    BRANCH_KEYS.forEach((branch) => {
      const founder = PERSONS.find((person) => person.branch === branch && person.gen === 2 && person.gender === "M");
      if (founder) State.founderIdByBranch[branch] = founder.id;
    });
  }

  function siblingSortKey(id) {
    const person = State.byId[id];
    if (!person) return Number.MAX_SAFE_INTEGER;
    if (typeof person.birthOrder === "number") return person.birthOrder;
    return State.insertionOrder[id];
  }

  function orderedSiblingIds(parentId) {
    const ids = State.kidsByEitherParent[parentId] || [];
    return ids.slice().sort((a, b) => siblingSortKey(a) - siblingSortKey(b));
  }

  const subtreeWidthCache = new Map();
  function subtreeWidth(id) {
    const cached = subtreeWidthCache.get(id);
    if (cached !== undefined) return cached;
    const children = State.kids[id] || [];
    const me = State.byId[id];
    const myWidth = cardWidthForPerson(me);
    const value = children.length
      ? Math.max(myWidth, children.reduce((sum, childId) => sum + subtreeWidth(childId), 0) + H_GAP * (children.length - 1))
      : myWidth;
    subtreeWidthCache.set(id, value);
    return value;
  }

  function layout(id, centerX, topY) {
    const person = State.byId[id];
    const myWidth = cardWidthForPerson(person);
    State.pos[id] = { x: centerX - myWidth / 2, y: topY };
    const children = State.kids[id] || [];
    if (!children.length) return;

    const widths = children.map(subtreeWidth);
    const total = widths.reduce((sum, width) => sum + width, 0) + H_GAP * (children.length - 1);
    let cursor = centerX - total / 2;
    const nextTop = topY + cardHeightForPerson(person) + V_GAP;

    children.forEach((childId, index) => {
      layout(childId, cursor + widths[index] / 2, nextTop);
      cursor += widths[index] + H_GAP;
    });
  }

  function computeLayout() {
    if (!State.root) throw new Error("Root family member could not be determined from the dataset.");

    State.pos = {};
    subtreeWidthCache.clear();
    layout(State.root.id, 0, 0);

    let minX = Infinity;
    let maxX = -Infinity;
    let maxY = 0;

    Object.entries(State.pos).forEach(([id, coords]) => {
      const person = State.byId[id];
      const cardHeight = cardHeightForPerson(person);
      const cardWidth = cardWidthForPerson(person);
      minX = Math.min(minX, coords.x);
      maxX = Math.max(maxX, coords.x + cardWidth);
      maxY = Math.max(maxY, coords.y + cardHeight);
    });

    const totalWidth = maxX - minX + PAD * 2;
    const totalHeight = maxY + PAD * 2;
    const offsetX = -minX + PAD;
    const offsetY = PAD;

    State.layoutMetrics = {
      cardWidth: CARD_WIDTH,
      cardHeight: CARD_HEIGHT,
      horizontalGap: H_GAP,
      verticalGap: V_GAP,
      pad: PAD,
      totalWidth,
      totalHeight,
      offsetX,
      offsetY
    };

    Elements.wrap.style.width = `${totalWidth}px`;
    Elements.wrap.style.height = `${totalHeight}px`;
    Elements.svg.setAttribute("width", String(totalWidth));
    Elements.svg.setAttribute("height", String(totalHeight));
  }

  function getBoundsForPeople(predicate) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    PERSONS.forEach((person) => {
      if (predicate && !predicate(person)) return;
      const coords = State.pos[person.id];
      if (!coords) return;
      const cardHeight = cardHeightForPerson(person);
      const cardWidth = cardWidthForPerson(person);
      const x = coords.x + State.layoutMetrics.offsetX;
      const y = coords.y + State.layoutMetrics.offsetY;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + cardWidth);
      maxY = Math.max(maxY, y + cardHeight);
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }

  function generationLabel(gen) {
    return `Gen ${ROMAN[gen] || String(gen + 1)}`;
  }

  function personLookupLabel(person) {
    const gen = generationLabel(person.gen);
    if (!person.parentId) return `${person.name} (root, ${gen})`;
    const parent = State.byId[person.parentId];
    return `${person.name} (child of ${parent ? parent.name : "Unknown"}, ${gen})`;
  }

  const NameLookup = {
    nameToIds: new Map(),
    labelToId: new Map(),
    lookupLabelById: {},
    build() {
      this.nameToIds.clear();
      this.labelToId.clear();
      this.lookupLabelById = {};

      PERSONS.forEach((person) => {
        const nameKey = normalizeKey(person.name);
        const ids = this.nameToIds.get(nameKey) || [];
        ids.push(person.id);
        this.nameToIds.set(nameKey, ids);

        const lookupLabel = personLookupLabel(person);
        this.lookupLabelById[person.id] = lookupLabel;
        this.labelToId.set(normalizeKey(lookupLabel), person.id);
      });

      const datalistValues = [];
      PERSONS.forEach((person) => {
        const ids = this.nameToIds.get(normalizeKey(person.name)) || [];
        datalistValues.push(ids.length > 1 ? this.lookupLabelById[person.id] : person.name);
      });

      Elements.personOptions.innerHTML = Array.from(new Set(datalistValues))
        .sort((a, b) => a.localeCompare(b))
        .map((value) => `<option value="${escapeHtml(value)}"></option>`)
        .join("");
    },
    resolveInput(value) {
      const key = normalizeKey(value);
      if (!key) return { state: "empty" };
      if (this.labelToId.has(key)) return { state: "ok", person: State.byId[this.labelToId.get(key)] };

      const ids = this.nameToIds.get(key);
      if (!ids || !ids.length) return { state: "missing" };
      if (ids.length === 1) return { state: "ok", person: State.byId[ids[0]] };

      return { state: "ambiguous", labels: ids.map((id) => this.lookupLabelById[id]) };
    }
  };

  const TreeSummary = {
    get memberCount() { return PERSONS.length; },
    get generationCount() { return Math.max(...PERSONS.map((p) => p.gen)) + 1; },
    get branchCounts() {
      return BRANCH_KEYS.map((branch) => ({
        branch,
        count: PERSONS.filter((person) => person.branch === branch).length
      }));
    },
    renderStats() {
      setText("member-count-chip", this.memberCount);
      setText("generation-count-chip", this.generationCount);
      setText("branch-count-chip", BRANCH_KEYS.length);
    },
    branchCardMarkup(branch, count) {
      const meta = BRANCH_META[branch];
      const founderId = State.founderIdByBranch[branch];
      const monogram = meta.founder ? meta.founder.charAt(0).toUpperCase() : branch;
      return [
        `<button class="branch-card" type="button" data-focus-person="${founderId}" style="--branch-color:${meta.color}">`,
          `<span class="branch-card-monogram">${escapeHtml(monogram)}</span>`,
          '<span class="branch-card-body">',
            `<span class="branch-card-label">${escapeHtml(meta.label)}</span>`,
            `<strong class="branch-card-founder">${escapeHtml(meta.founder)}</strong>`,
          "</span>",
          `<span class="branch-card-count">${count}</span>`,
        "</button>"
      ].join("");
    },
    renderBranchOverview(target) {
      if (!target) return;
      target.innerHTML = this.branchCounts.map(({ branch, count }) => this.branchCardMarkup(branch, count)).join("");
    },
    renderBranchOverviews() {
      this.renderBranchOverview(Elements.overviewBranchGrid);
      this.renderBranchOverview(Elements.mobileBranchGrid);
    }
  };

  /* ====================== RELATION ENGINE ======================
     The engine walks a DAG (father + optional mother links) with BFS to find
     the closest common ancestor, then labels the relation using the genders
     of the intermediate steps — so "Dada vs Nana" and "Tau vs Mama" come out
     correctly whenever motherId data is present.
     ================================================================ */

  function buildAncestorMap(personId) {
    const map = new Map();
    const queue = [{ id: personId, path: [personId] }];
    while (queue.length) {
      const { id, path } = queue.shift();
      const existing = map.get(id);
      if (existing && existing.path.length <= path.length) continue;
      map.set(id, { distance: path.length - 1, path });
      const person = State.byId[id];
      if (!person) continue;
      parentIdsOf(person).forEach((parentId) => {
        if (!State.byId[parentId] || path.indexOf(parentId) !== -1) return;
        queue.push({ id: parentId, path: path.concat(parentId) });
      });
    }
    return map;
  }

  function findCommonAncestorDetails(firstId, secondId) {
    const firstMap = buildAncestorMap(firstId);
    const secondMap = buildAncestorMap(secondId);
    let best = null;
    firstMap.forEach((firstInfo, id) => {
      const secondInfo = secondMap.get(id);
      if (!secondInfo) return;
      const combined = firstInfo.distance + secondInfo.distance;
      const max = Math.max(firstInfo.distance, secondInfo.distance);
      if (!best || combined < best.combined || (combined === best.combined && max < best.maxDistance)) {
        best = {
          ancestor: State.byId[id],
          selfDistance: firstInfo.distance,
          targetDistance: secondInfo.distance,
          selfPath: firstInfo.path,
          targetPath: secondInfo.path,
          combined,
          maxDistance: max
        };
      }
    });
    return best;
  }

  function buildConnectionTrail(firstId, secondId) {
    const details = findCommonAncestorDetails(firstId, secondId);
    if (!details) return { details: null, personIds: [], edgeChildIds: [] };
    // Order: self → ... → common ancestor → ... → target, so the draw-on animation
    // traces the relation the way the mind does.
    const selfSide = details.selfPath;
    const targetSide = details.targetPath.slice(0, -1).reverse();
    const personIds = [];
    const personSeen = new Set();
    [...selfSide, ...targetSide].forEach((id) => {
      if (!personSeen.has(id)) { personSeen.add(id); personIds.push(id); }
    });
    const edgeChildIds = [];
    const edgeSeen = new Set();
    for (let i = 0; i < details.selfPath.length - 1; i += 1) {
      const id = details.selfPath[i];
      if (!edgeSeen.has(id)) { edgeSeen.add(id); edgeChildIds.push(id); }
    }
    for (let i = details.targetPath.length - 2; i >= 0; i -= 1) {
      const id = details.targetPath[i];
      if (!edgeSeen.has(id)) { edgeSeen.add(id); edgeChildIds.push(id); }
    }
    return { details, personIds, edgeChildIds };
  }

  function stepKind(childId, parentId) {
    // Returns "father" | "mother" | null — which parent link the step represents.
    const child = State.byId[childId];
    if (!child) return null;
    if (child.parentId === parentId) return "father";
    if (child.motherId === parentId) return "mother";
    return null;
  }

  function pathIsAllPaternal(path) {
    for (let i = 0; i < path.length - 1; i += 1) {
      if (stepKind(path[i], path[i + 1]) !== "father") return false;
    }
    return true;
  }

  function pathIsAllMaternal(path) {
    for (let i = 0; i < path.length - 1; i += 1) {
      if (stepKind(path[i], path[i + 1]) !== "mother") return false;
    }
    return true;
  }

  function firstStepKind(path) {
    if (!path || path.length < 2) return null;
    return stepKind(path[0], path[1]);
  }

  function formatTimes(value) { return value === 1 ? "1×" : `${value}×`; }

  function ordinalSuffix(n) {
    const v = n % 100;
    if (v >= 11 && v <= 13) return "th";
    switch (n % 10) { case 1: return "st"; case 2: return "nd"; case 3: return "rd"; default: return "th"; }
  }

  function buildGreatLabel(base, greatCount) {
    if (greatCount <= 0) return base;
    if (greatCount === 1) return `Great ${base}`;
    return `${formatTimes(greatCount)} Great ${base}`;
  }

  function buildHindiGreatLabel(base, greatCount) {
    if (greatCount <= 0) return base;
    if (greatCount === 1) return `Par ${base}`;
    return `${formatTimes(greatCount)} Par ${base}`;
  }

  function buildCousinLabel(degree, removed) {
    let base = "Cousin";
    if (degree === 2) base = "Second Cousin";
    else if (degree === 3) base = "Third Cousin";
    else if (degree >= 4) base = `${degree}${ordinalSuffix(degree)} Cousin`;
    if (removed === 0) return base;
    if (removed === 1) return `${base}, once removed`;
    if (removed === 2) return `${base}, twice removed`;
    return `${base}, ${removed} times removed`;
  }

  function possessiveName(name) {
    return /s$/i.test(name) ? `${name}'` : `${name}'s`;
  }

  function hindiSpan(text) {
    return `<span lang="hi-Latn">${escapeHtml(text)}</span>`;
  }

  function makeTerm(hindi, english) {
    if (!hindi) return { termHtml: escapeHtml(english), term: english };
    if (!english) return { termHtml: hindiSpan(hindi), term: hindi };
    return {
      termHtml: `${hindiSpan(hindi)} <span class="term-eng">(${escapeHtml(english)})</span>`,
      term: `${hindi} (${english})`
    };
  }

  function isSibling(personA, personB) {
    if (!personA || !personB || personA.id === personB.id) return false;
    const parentsA = parentIdsOf(personA);
    const parentsB = parentIdsOf(personB);
    return parentsA.some((id) => parentsB.includes(id));
  }

  function describeSiblingRelation(self, target) {
    // Find the shared parent; compare birth order on the shared parent's ordered children.
    const shared = parentIdsOf(self).find((id) => parentIdsOf(target).includes(id));
    const siblings = shared ? orderedSiblingIds(shared) : [];
    const selfIdx = siblings.indexOf(self.id);
    const targetIdx = siblings.indexOf(target.id);
    const older = targetIdx > -1 && selfIdx > -1 && targetIdx < selfIdx;
    if (target.gender === "M") {
      const t = makeTerm(older ? "Bade Bhai" : "Chhote Bhai", older ? "elder brother" : "younger brother");
      return { ...t, explain: `${target.name} is ${possessiveName(self.name)} ${older ? "elder" : "younger"} brother.` };
    }
    const t = makeTerm(older ? "Badi Behen" : "Chhoti Behen", older ? "elder sister" : "younger sister");
    return { ...t, explain: `${target.name} is ${possessiveName(self.name)} ${older ? "elder" : "younger"} sister.` };
  }

  function describeAncestorRelation(self, target, details) {
    const distance = details.selfDistance;
    if (distance === 1) {
      const t = target.gender === "F" ? makeTerm("Maa", "mother") : makeTerm("Pita", "father");
      return { ...t, explain: `${target.name} is ${possessiveName(self.name)} ${target.gender === "F" ? "mother" : "father"}.` };
    }
    const firstStep = firstStepKind(details.selfPath);
    const viaFather = firstStep === "father";
    if (distance === 2) {
      if (target.gender === "F") {
        const hindi = viaFather ? "Dadi" : "Nani";
        const english = viaFather ? "paternal grandmother" : "maternal grandmother";
        return { ...makeTerm(hindi, english), explain: `${target.name} is ${possessiveName(self.name)} ${english}.` };
      }
      const hindi = viaFather ? "Dada" : "Nana";
      const english = viaFather ? "paternal grandfather" : "maternal grandfather";
      return { ...makeTerm(hindi, english), explain: `${target.name} is ${possessiveName(self.name)} ${english}.` };
    }
    // distance >= 3: Hindi "Par ..." only when the whole path stays on one side.
    const allPaternal = pathIsAllPaternal(details.selfPath);
    const allMaternal = pathIsAllMaternal(details.selfPath);
    const hindiRoot = target.gender === "F"
      ? (allPaternal ? "Dadi" : (allMaternal ? "Nani" : null))
      : (allPaternal ? "Dada" : (allMaternal ? "Nana" : null));
    const englishBase = target.gender === "F" ? "Grandmother" : "Grandfather";
    const englishTerm = buildGreatLabel(englishBase, distance - 2).toLowerCase();
    const hindiTerm = hindiRoot ? buildHindiGreatLabel(hindiRoot, distance - 2) : null;
    return { ...makeTerm(hindiTerm, englishTerm), explain: `${target.name} is ${possessiveName(self.name)} ${englishTerm}.` };
  }

  function describeDescendantRelation(self, target, details) {
    const distance = details.targetDistance;
    if (distance === 1) {
      const t = target.gender === "F" ? makeTerm("Beti", "daughter") : makeTerm("Beta", "son");
      return { ...t, explain: `${target.name} is ${possessiveName(self.name)} ${target.gender === "F" ? "daughter" : "son"}.` };
    }
    if (distance === 2) {
      const childId = details.targetPath[details.targetPath.length - 2];
      const child = State.byId[childId];
      const throughSon = child && child.gender !== "F";
      if (target.gender === "F") {
        const hindi = throughSon ? "Poti" : "Naatin";
        const english = throughSon ? "granddaughter through a son" : "granddaughter through a daughter";
        return { ...makeTerm(hindi, english), explain: `${target.name} is ${possessiveName(self.name)} ${english}.` };
      }
      const hindi = throughSon ? "Pota" : "Naati";
      const english = throughSon ? "grandson through a son" : "grandson through a daughter";
      return { ...makeTerm(hindi, english), explain: `${target.name} is ${possessiveName(self.name)} ${english}.` };
    }
    const base = target.gender === "F" ? "Granddaughter" : "Grandson";
    const englishTerm = buildGreatLabel(base, distance - 2).toLowerCase();
    return { ...makeTerm(null, englishTerm), explain: `${target.name} is ${possessiveName(self.name)} ${englishTerm}.` };
  }

  function describeAuntOrUncleRelation(self, target, details) {
    const selfDistance = details.selfDistance;
    if (selfDistance === 2) {
      const parent = State.byId[details.selfPath[1]];
      const viaFather = firstStepKind(details.selfPath) === "father";
      if (viaFather) {
        if (target.gender === "M") {
          // Compare birth order under the common ancestor so Tau / Chacha respects age.
          const ordered = orderedSiblingIds(details.ancestor.id);
          const parentIdx = ordered.indexOf(parent.id);
          const targetIdx = ordered.indexOf(target.id);
          const older = targetIdx > -1 && parentIdx > -1 && targetIdx < parentIdx;
          const hindi = older ? "Tau" : "Chacha";
          const english = older ? "father's elder brother" : "father's younger brother";
          return { ...makeTerm(hindi, english), explain: `${target.name} is the ${older ? "elder" : "younger"} brother of ${self.name}'s father.` };
        }
        return { ...makeTerm("Bua", "father's sister"), explain: `${target.name} is the sister of ${self.name}'s father.` };
      }
      // via mother
      if (target.gender === "M") {
        return { ...makeTerm("Mama", "mother's brother"), explain: `${target.name} is the brother of ${self.name}'s mother.` };
      }
      return { ...makeTerm("Mausi", "mother's sister"), explain: `${target.name} is the sister of ${self.name}'s mother.` };
    }
    if (selfDistance === 3) {
      const allPaternal = pathIsAllPaternal(details.selfPath);
      const allMaternal = pathIsAllMaternal(details.selfPath);
      const hindi = target.gender === "M"
        ? (allPaternal ? "Bade Dada" : (allMaternal ? "Bade Nana" : null))
        : (allPaternal ? "Badi Dadi" : (allMaternal ? "Badi Nani" : null));
      const englishBase = target.gender === "F" ? "Grandaunt" : "Granduncle";
      return { ...makeTerm(hindi, englishBase.toLowerCase()), explain: `${target.name} is ${possessiveName(self.name)} ${englishBase.toLowerCase()}.` };
    }
    const base = target.gender === "F" ? "Grandaunt" : "Granduncle";
    const englishTerm = buildGreatLabel(base, selfDistance - 3).toLowerCase();
    return { ...makeTerm(null, englishTerm), explain: `${target.name} is ${possessiveName(self.name)} ${englishTerm}.` };
  }

  function describeNieceOrNephewRelation(self, target, details) {
    const targetDistance = details.targetDistance;
    if (targetDistance === 2) {
      const siblingId = details.targetPath[details.targetPath.length - 2];
      const sibling = State.byId[siblingId];
      const throughBrother = sibling && sibling.gender !== "F";
      if (throughBrother) {
        if (target.gender === "F") {
          return { ...makeTerm("Bhatiji", "brother's daughter"), explain: `${target.name} is the daughter of ${self.name}'s brother.` };
        }
        return { ...makeTerm("Bhatija", "brother's son"), explain: `${target.name} is the son of ${self.name}'s brother.` };
      }
      if (target.gender === "F") {
        return { ...makeTerm("Bhanji", "sister's daughter"), explain: `${target.name} is the daughter of ${self.name}'s sister.` };
      }
      return { ...makeTerm("Bhanja", "sister's son"), explain: `${target.name} is the son of ${self.name}'s sister.` };
    }
    const base = target.gender === "F" ? "Grandniece" : "Grandnephew";
    const englishTerm = buildGreatLabel(base, targetDistance - 3).toLowerCase();
    return { ...makeTerm(null, englishTerm), explain: `${target.name} is ${possessiveName(self.name)} ${englishTerm}.` };
  }

  function describeCousinLikeRelation(self, target, details) {
    const degree = Math.min(details.selfDistance, details.targetDistance) - 1;
    const removed = Math.abs(details.selfDistance - details.targetDistance);
    const englishTerm = buildCousinLabel(degree, removed);
    // First-cousin Hindi: the kind of the self-side intermediate (father vs mother)
    // plus the target-side intermediate's gender names the link class.
    let hindi = null;
    if (degree === 1 && removed === 0) {
      const selfLink = firstStepKind(details.selfPath);
      const targetLink = firstStepKind(details.targetPath);
      // Common ancestor's child-on-self-side links self; on target side links target.
      const selfParent = State.byId[details.selfPath[1]];
      const targetParent = State.byId[details.targetPath[1]];
      const selfParentIsMale = selfParent && selfParent.gender !== "F";
      const targetParentIsMale = targetParent && targetParent.gender !== "F";
      const suffixM = target.gender === "F" ? "Behen" : "Bhai";
      if (selfLink === "father" && targetParentIsMale) hindi = `Chachera ${suffixM}`;
      else if (selfLink === "father" && !targetParentIsMale) hindi = `Phuphera ${suffixM}`;
      else if (selfLink === "mother" && targetParentIsMale) hindi = `Mamera ${suffixM}`;
      else if (selfLink === "mother" && !targetParentIsMale) hindi = `Mausera ${suffixM}`;
    }
    const selfPossessive = possessiveName(self.name);
    const direction = details.targetDistance < details.selfDistance ? "above" : "below";
    const explain = removed === 0
      ? `${self.name} and ${target.name} share ${details.ancestor.name} as a common ancestor in the same generation.`
      : `${target.name} is ${removed} generation${removed === 1 ? "" : "s"} ${direction} ${self.name} on ${selfPossessive} extended line through ${details.ancestor.name}.`;
    return {
      ...makeTerm(hindi, englishTerm),
      explain,
      examples: `${self.name} and ${target.name} meet in the lineage at ${details.ancestor.name}.`
    };
  }

  const RelationEngine = {
    compute(self, target) {
      if (self.id === target.id) {
        return {
          ...makeTerm(null, "Same person"),
          explain: `${self.name} and ${target.name} refer to the same individual.`,
          examples: "Pick two different family members to compare."
        };
      }
      const details = findCommonAncestorDetails(self.id, target.id);
      if (!details) {
        return {
          ...makeTerm(null, "Relation not traceable"),
          explain: `${target.name} could not be linked to ${self.name} through the recorded parent–child paths.`
        };
      }
      const { selfDistance, targetDistance } = details;
      if (targetDistance === 0) return describeAncestorRelation(self, target, details);
      if (selfDistance === 0) return describeDescendantRelation(self, target, details);
      if (selfDistance === 1 && targetDistance === 1 && isSibling(self, target)) return describeSiblingRelation(self, target);
      if (targetDistance === 1) return describeAuntOrUncleRelation(self, target, details);
      if (selfDistance === 1) return describeNieceOrNephewRelation(self, target, details);
      return describeCousinLikeRelation(self, target, details);
    }
  };

  function setTermHtml(id, result) {
    const node = document.getElementById(id);
    if (!node) return;
    if (result.termHtml) node.innerHTML = result.termHtml;
    else node.textContent = result.term || "";
  }

  function writeRelationResult(prefix, result) {
    setText(`${prefix}relation-kicker`, result.kicker || "Relation");
    setTermHtml(`${prefix}relation-term`, result);
    setText(`${prefix}relation-explain`, result.explain || "");
    setText(`${prefix}relation-examples`, result.examples || "");

    // toggle active state
    const resultEl = document.getElementById(`${prefix}relation-result`);
    if (resultEl) resultEl.classList.add("is-active");
  }

  function resetRelationResult(prefix) {
    TreeRenderer.clearHighlight();
    const resultEl = document.getElementById(`${prefix}relation-result`);
    if (resultEl) resultEl.classList.remove("is-active");
    setText(`${prefix}relation-kicker`, "Awaiting two names");
    setText(`${prefix}relation-term`, "Choose two names to begin");
    setText(`${prefix}relation-explain`, "The kinship term and connecting path will appear here once both names resolve.");
    setText(`${prefix}relation-examples`, "");
    if (typeof MobileToast !== "undefined") MobileToast.hide();
  }

  function runRelationLookup(selfValue, otherValue, prefix) {
    const selfMatch = NameLookup.resolveInput(selfValue);
    if (selfMatch.state === "empty") {
      TreeRenderer.clearHighlight();
      writeRelationResult(prefix, { kicker: "Need a starting point", term: "Enter your name", explain: "Start by entering your own name from the chart." });
      return;
    }
    if (selfMatch.state === "missing") {
      TreeRenderer.clearHighlight();
      writeRelationResult(prefix, { kicker: "No match", term: "Name not found", explain: `No chart entry matched "${selfValue}".`, examples: "Try the exact chart name or pick a suggestion from the list." });
      return;
    }
    if (selfMatch.state === "ambiguous") {
      TreeRenderer.clearHighlight();
      writeRelationResult(prefix, { kicker: "Multiple matches", term: `"${selfValue}" appears more than once`, explain: "Pick the suggestion that includes the parent name to disambiguate.", examples: selfMatch.labels.join("  ·  ") });
      return;
    }

    const otherMatch = NameLookup.resolveInput(otherValue);
    if (otherMatch.state === "empty") {
      TreeRenderer.clearHighlight();
      writeRelationResult(prefix, { kicker: "One more name", term: "Enter the second name", explain: "Add the other family member to compare the relation." });
      return;
    }
    if (otherMatch.state === "missing") {
      TreeRenderer.clearHighlight();
      writeRelationResult(prefix, { kicker: "No match", term: "Name not found", explain: `No chart entry matched "${otherValue}".`, examples: "Try the exact chart name or pick a suggestion from the list." });
      return;
    }
    if (otherMatch.state === "ambiguous") {
      TreeRenderer.clearHighlight();
      writeRelationResult(prefix, { kicker: "Multiple matches", term: `"${otherValue}" appears more than once`, explain: "Pick the suggestion that includes the parent name to disambiguate.", examples: otherMatch.labels.join("  ·  ") });
      return;
    }

    const relation = RelationEngine.compute(selfMatch.person, otherMatch.person);
    const trail = buildConnectionTrail(selfMatch.person.id, otherMatch.person.id);
    relation.kicker = `${otherMatch.person.name} is ${selfMatch.person.name}'s relation`;
    relation.examples = relation.examples
      ? `${relation.examples} The connecting path is highlighted on the tree.`
      : "The connecting path is highlighted on the tree.";

    TreeRenderer.highlightTrail(trail.personIds, trail.edgeChildIds);
    writeRelationResult(prefix, relation);

    // After highlighting, frame the trail in viewport
    if (trail.personIds.length) Viewport.frameTrail(trail.personIds);

    // Mobile UX: close panel and show floating result toast so the tree is visible.
    if (prefix === "mobile-" && Elements.mobilePanel && Elements.mobilePanel.classList.contains("open")) {
      PanelManager.setMobileOpen(false);
    }
    if (prefix === "mobile-" || window.innerWidth < 980) {
      MobileToast.show(relation);
    }
  }

  const MobileToast = {
    show(result) {
      if (!Elements.mobileToast) return;
      setText("mobile-toast-kicker", result.kicker || "Relation");
      setTermHtml("mobile-toast-term", result);
      setText("mobile-toast-explain", result.explain || "");
      Elements.mobileToast.classList.add("is-active");
    },
    hide() {
      if (!Elements.mobileToast) return;
      Elements.mobileToast.classList.remove("is-active");
    }
  };

  const RelationForms = [
    { formId: "relation-form", selfId: "relation-self-input", otherId: "relation-other-input", clearId: "relation-clear-button", prefix: "" },
    { formId: "mobile-relation-form", selfId: "mobile-relation-self-input", otherId: "mobile-relation-other-input", clearId: "mobile-relation-clear-button", prefix: "mobile-" }
  ];

  /* ====================== TREE RENDERING ====================== */

  const TreeRenderer = {
    cardById: new Map(),
    lineByChildId: new Map(),
    renderGenerationGuides() {
      const generationY = {};
      PERSONS.forEach((person) => {
        if (generationY[person.gen] !== undefined) return;
        generationY[person.gen] = State.pos[person.id].y + State.layoutMetrics.offsetY;
      });

      Object.entries(generationY).forEach(([generation, y]) => {
        const guide = document.createElementNS("http://www.w3.org/2000/svg", "line");
        guide.setAttribute("x1", "0");
        guide.setAttribute("x2", String(State.layoutMetrics.totalWidth));
        guide.setAttribute("y1", String(y - 24));
        guide.setAttribute("y2", String(y - 24));
        guide.setAttribute("stroke", "rgba(214, 178, 96, 0.10)");
        guide.setAttribute("stroke-width", "1");
        guide.setAttribute("stroke-dasharray", "2 8");
        Elements.svg.appendChild(guide);

        const marker = document.createElement("div");
        marker.className = "generation-marker";
        marker.style.top = `${y - 56}px`;
        marker.style.left = `${State.layoutMetrics.pad - 60}px`;
        marker.innerHTML = [
          `<span class="gm-roman">${ROMAN[Number(generation)] || Number(generation) + 1}</span>`,
          `<span>Generation ${ROMAN[Number(generation)] || Number(generation) + 1}</span>`,
          '<span class="gm-rule"></span>'
        ].join("");
        Elements.wrap.appendChild(marker);
      });
    },
    renderConnections() {
      PERSONS.forEach((person) => {
        if (!person.parentId || !State.pos[person.id] || !State.pos[person.parentId]) return;

        const parent = State.pos[person.parentId];
        const child = State.pos[person.id];
        const parentPerson = State.byId[person.parentId];
        const parentHeight = cardHeightForPerson(parentPerson);
        const parentWidth = cardWidthForPerson(parentPerson);
        const childWidth = cardWidthForPerson(person);
        const px = parent.x + State.layoutMetrics.offsetX + parentWidth / 2;
        const py = parent.y + State.layoutMetrics.offsetY + parentHeight;
        const cx = child.x + State.layoutMetrics.offsetX + childWidth / 2;
        const cy = child.y + State.layoutMetrics.offsetY;
        const meta = BRANCH_META[person.branch] || BRANCH_META.root;

        // Orthogonal lines with rounded corners — feels more architectural
        const midY = py + (cy - py) * 0.55;
        const r = 10;
        let d;
        if (Math.abs(cx - px) < 1) {
          d = `M${px},${py} L${cx},${cy}`;
        } else {
          const dirX = cx > px ? 1 : -1;
          const x1 = px;
          const y1 = py;
          const x2 = cx;
          const y2 = cy;
          // Down to midY-r, arc, horizontal to (cx -/+ r), arc, down to cy
          d = [
            `M${x1},${y1}`,
            `L${x1},${midY - r}`,
            `Q${x1},${midY} ${x1 + dirX * r},${midY}`,
            `L${x2 - dirX * r},${midY}`,
            `Q${x2},${midY} ${x2},${midY + r}`,
            `L${x2},${y2}`
          ].join(" ");
        }

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("class", "tree-line");
        path.setAttribute("d", d);
        path.setAttribute("stroke", meta.line);
        path.setAttribute("stroke-width", person.marriedOut ? "1.4" : (parentPerson.gen <= 1 ? "2.4" : "1.8"));
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        path.setAttribute("fill", "none");
        path.setAttribute("opacity", person.marriedOut ? "0.5" : "0.78");
        if (person.marriedOut) path.setAttribute("stroke-dasharray", "4 5");
        Elements.svg.appendChild(path);
        this.lineByChildId.set(person.id, path);
      });
    },
    describeCardContext(person) {
      if (!person.parentId) return "Patriarch of the recorded lineage";
      if (person.marriedOut) return "Married into another family";
      if (person.issueless) return "No recorded issue in the archive";
      const parent = State.byId[person.parentId];
      if (!parent) return "Member of the family archive";
      return `Child of ${parent.name}`;
    },
    createCard(person) {
      const coords = State.pos[person.id];
      if (!coords) return null;

      const meta = BRANCH_META[person.branch] || BRANCH_META.root;
      const isUnknownName = /^Unknown Daughter/.test(person.name);
      const card = document.createElement("button");
      card.type = "button";
      card.className = [
        "card",
        person.gen <= 1 ? "card-root" : "",
        isUnknownName ? "card-unknown" : "",
        person.marriedOut ? "married-out" : "",
        person.status === "deceased" ? "deceased" : ""
      ].filter(Boolean).join(" ");
      card.dataset.personId = person.id;

      card.style.left = `${coords.x + State.layoutMetrics.offsetX}px`;
      card.style.top = `${coords.y + State.layoutMetrics.offsetY}px`;
      card.style.setProperty("--accent", meta.color);
      card.style.setProperty("--surface", meta.surface);
      card.style.setProperty("--stroke", meta.stroke);

      const badges = [];
      if (person.status === "deceased") badges.push('<span class="badge badge-deceased">In Memoriam</span>');
      if (person.issueless) badges.push('<span class="badge badge-issueless">No issue</span>');
      if (person.marriedOut) badges.push('<span class="badge badge-married">Married out</span>');
      if (isUnknownName) badges.push('<span class="badge badge-unknown">Name unknown</span>');

      const genderClass = person.gender === "F" ? "card-gender female" : "card-gender";
      const genderGlyph = person.gender === "F" ? "F" : "M";
      const branchLabel = meta.label || "";

      card.innerHTML = [
        '<div class="card-inner">',
          '<div class="card-topline">',
            `<span class="card-branch-label">${escapeHtml(branchLabel)}</span>`,
            `<span class="card-generation">${ROMAN[person.gen] || person.gen + 1}</span>`,
          "</div>",
          '<div class="card-name-row">',
            `<div class="card-name">${escapeHtml(person.name)}</div>`,
            `<span class="${genderClass}" aria-hidden="true">${genderGlyph}</span>`,
          "</div>",
          `<div class="card-sub">${escapeHtml(this.describeCardContext(person))}</div>`,
          '<div class="card-footer">',
            `<div class="card-badges">${badges.join("")}</div>`,
          "</div>",
        "</div>"
      ].join("");

      const tooltipParts = [
        person.name,
        `Generation ${ROMAN[person.gen] || person.gen + 1}`,
        person.gender === "F" ? "Female" : "Male"
      ];
      if (person.status === "deceased") tooltipParts.push("In Memoriam");
      if (person.marriedOut) tooltipParts.push("Married out");
      if (person.issueless) tooltipParts.push("No issue");
      card.title = tooltipParts.join("  ·  ");
      card.setAttribute("aria-label", `Focus ${person.name}`);

      card.addEventListener("click", () => {
        this.clearHighlight();
        Viewport.focusPerson(person.id);
      });

      return card;
    },
    renderCards() {
      PERSONS.forEach((person) => {
        const card = this.createCard(person);
        if (!card) return;
        Elements.wrap.appendChild(card);
        this.cardById.set(person.id, card);
      });
    },
    pendingCardTimers: [],
    clearHighlight() {
      Elements.wrap.classList.remove("tree-has-highlight");
      this.cardById.forEach((card) => card.classList.remove("is-highlighted-card"));
      this.lineByChildId.forEach((line) => {
        line.classList.remove("is-highlighted-line");
        if (window.anime && typeof window.anime.remove === "function") window.anime.remove(line);
        line.style.strokeDasharray = "";
        line.style.strokeDashoffset = "";
      });
      this.pendingCardTimers.forEach((timer) => clearTimeout(timer));
      this.pendingCardTimers = [];
    },
    highlightTrail(personIds, edgeChildIds) {
      this.clearHighlight();
      if (!personIds.length && !edgeChildIds.length) return;
      Elements.wrap.classList.add("tree-has-highlight");

      const animated = Motion.enabled;
      const edges = edgeChildIds
        .map((id) => ({ id, line: this.lineByChildId.get(id) }))
        .filter((entry) => entry.line);

      if (!animated) {
        personIds.forEach((id) => {
          const card = this.cardById.get(id);
          if (card) card.classList.add("is-highlighted-card");
        });
        edges.forEach(({ line }) => line.classList.add("is-highlighted-line"));
        return;
      }

      const stagger = 90;
      const drawDuration = 360;

      edges.forEach(({ line }, index) => {
        const length = typeof line.getTotalLength === "function" ? line.getTotalLength() : 400;
        line.style.strokeDasharray = `${length}`;
        line.style.strokeDashoffset = `${length}`;
        line.classList.add("is-highlighted-line");
        window.anime({
          targets: line,
          strokeDashoffset: [length, 0],
          duration: drawDuration,
          delay: index * stagger,
          easing: "easeInOutQuart",
          complete: () => {
            line.style.strokeDasharray = "";
            line.style.strokeDashoffset = "";
          }
        });
      });

      personIds.forEach((id, index) => {
        const card = this.cardById.get(id);
        if (!card) return;
        const delay = Math.max(0, index * stagger - 40);
        const timer = setTimeout(() => card.classList.add("is-highlighted-card"), delay);
        this.pendingCardTimers.push(timer);
      });
    },
    renderAll() {
      this.renderGenerationGuides();
      this.renderConnections();
      this.renderCards();
    }
  };

  /* ====================== VIEWPORT ====================== */

  const Viewport = {
    scale: 1, x: 0, y: 0,
    drag: false, lastX: 0, lastY: 0, vx: 0, vy: 0, rafId: null,
    touches: {}, pinchDist: null, pinchMid: null,
    tween: null,

    applyTransform() {
      Elements.wrap.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.scale})`;
      const pct = `${Math.round(this.scale * 100)}%`;
      if (Elements.zoomReadout) Elements.zoomReadout.textContent = pct;
      if (Elements.mobileZoomReadout) Elements.mobileZoomReadout.textContent = pct;
    },

    cancelTween() {
      if (this.tween) {
        if (typeof this.tween.pause === "function") this.tween.pause();
        this.tween = null;
      }
    },

    tweenTo(target, options) {
      this.cancelTween();
      const opts = options || {};
      const duration = opts.duration == null ? 520 : opts.duration;
      this.vx = 0; this.vy = 0;
      if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
      if (!Motion.enabled || duration <= 0) {
        this.scale = target.scale;
        this.x = target.x;
        this.y = target.y;
        this.applyTransform();
        return;
      }
      const from = { scale: this.scale, x: this.x, y: this.y };
      const progress = { t: 0 };
      const self = this;
      this.tween = window.anime({
        targets: progress,
        t: 1,
        duration,
        easing: opts.easing || "easeInOutQuart",
        update() {
          self.scale = from.scale + (target.scale - from.scale) * progress.t;
          self.x = from.x + (target.x - from.x) * progress.t;
          self.y = from.y + (target.y - from.y) * progress.t;
          self.applyTransform();
        },
        complete() {
          self.tween = null;
          self.scale = target.scale;
          self.x = target.x;
          self.y = target.y;
          self.applyTransform();
        }
      });
    },

    getInsets() {
      const width = Elements.cont.clientWidth;
      const isCompact = width < 980;
      const isPhone = width < 560;
      const heroHeight = (Elements.relationHero && !Elements.relationHero.classList.contains("is-collapsed") && getComputedStyle(Elements.relationHero).display !== "none")
        ? Elements.relationHero.offsetHeight + 24
        : 24;

      if (isCompact) {
        return {
          top: 88,
          right: isPhone ? 12 : 18,
          bottom: width < 720 ? 132 : isPhone ? 122 : 108,
          left: isPhone ? 12 : 18
        };
      }
      const panelOpen = Elements.desktopPanel && Elements.desktopPanel.classList.contains("open");
      return {
        top: 76 + heroHeight,
        left: 24,
        right: panelOpen ? 360 : 24,
        bottom: 36
      };
    },

    getViewportBox() {
      const width = Elements.cont.clientWidth;
      const height = Elements.cont.clientHeight;
      const insets = this.getInsets();
      const innerWidth = Math.max(120, width - insets.left - insets.right);
      const innerHeight = Math.max(120, height - insets.top - insets.bottom);
      return { width, height, insets, innerWidth, innerHeight };
    },

    frameBounds(bounds, options) {
      if (!bounds) return;
      const config = options || {};
      const box = this.getViewportBox();
      const paddingX = config.paddingX === undefined ? 80 : config.paddingX;
      const paddingY = config.paddingY === undefined ? 60 : config.paddingY;
      const targetWidth = bounds.width + paddingX * 2;
      const targetHeight = bounds.height + paddingY * 2;
      const scaleX = box.innerWidth / targetWidth;
      const scaleY = box.innerHeight / targetHeight;
      const preferred = Math.min(scaleX, scaleY);
      const minScale = config.minScale === undefined ? MIN_SCALE : config.minScale;
      const maxScale = config.maxScale === undefined ? MAX_SCALE : config.maxScale;
      let scale = Math.min(maxScale, Math.max(minScale, preferred));
      scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

      const freeX = Math.max(0, box.innerWidth - bounds.width * scale);
      const freeY = Math.max(0, box.innerHeight - bounds.height * scale);
      const alignX = config.alignX === undefined ? 0.5 : config.alignX;
      const alignY = config.alignY === undefined ? 0.4 : config.alignY;

      const x = box.insets.left + freeX * alignX - bounds.minX * scale;
      const y = box.insets.top + freeY * alignY - bounds.minY * scale;
      this.tweenTo({ scale, x, y }, { duration: config.duration, easing: config.easing });
    },

    zoomAt(factor, originX, originY) {
      // Zoom is interactive (wheel, +/- buttons) — stay instant for responsiveness.
      this.cancelTween();
      const rect = Elements.cont.getBoundingClientRect();
      const x = originX === undefined ? rect.width / 2 : originX;
      const y = originY === undefined ? rect.height / 2 : originY;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.scale * factor));
      const appliedFactor = nextScale / this.scale;
      this.x = x - (x - this.x) * appliedFactor;
      this.y = y - (y - this.y) * appliedFactor;
      this.scale = nextScale;
      this.applyTransform();
    },

    fitView(options) {
      const box = this.getViewportBox();
      const scaleX = box.innerWidth / State.layoutMetrics.totalWidth;
      const scaleY = box.innerHeight / State.layoutMetrics.totalHeight;
      let scale = Math.min(0.9, scaleX, scaleY);
      scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
      const x = box.insets.left + (box.innerWidth - State.layoutMetrics.totalWidth * scale) / 2;
      const y = box.insets.top + (box.innerHeight - State.layoutMetrics.totalHeight * scale) / 2;
      this.tweenTo({ scale, x, y }, options);
    },

    showUpperGenerations(maxGeneration) {
      const width = Elements.cont.clientWidth;
      const isPhone = width < 560;
      const isCompact = width < 980;
      const bounds = getBoundsForPeople((person) => person.gen <= maxGeneration);
      this.frameBounds(bounds, {
        paddingX: isCompact ? 50 : 90,
        paddingY: isCompact ? 40 : 60,
        minScale: isCompact ? (isPhone ? 0.44 : 0.32) : 0.22,
        maxScale: isCompact ? (isPhone ? 1.02 : 0.6) : 0.45,
        alignX: 0.5,
        alignY: 0.05
      });
    },

    centerRoot(options) {
      if (!State.root) return;
      const box = this.getViewportBox();
      const rootPos = State.pos[State.root.id];
      const rootWidth = cardWidthForPerson(State.root);
      const rootCenterX = rootPos.x + State.layoutMetrics.offsetX + rootWidth / 2;
      const compact = box.width < 980;
      const phone = box.width < 560;
      const scale = compact ? (phone ? 0.95 : 0.7) : 0.55;
      const x = box.insets.left + box.innerWidth / 2 - rootCenterX * scale;
      const y = box.insets.top + 20;
      this.tweenTo({ scale, x, y }, options);
    },

    focusPerson(personId, preferredScale, options) {
      const person = State.byId[personId];
      const coords = State.pos[personId];
      if (!person || !coords) return;
      const box = this.getViewportBox();
      const cardHeight = cardHeightForPerson(person);
      const cardWidth = cardWidthForPerson(person);
      const cardCenterX = coords.x + State.layoutMetrics.offsetX + cardWidth / 2;
      const cardCenterY = coords.y + State.layoutMetrics.offsetY + cardHeight / 2;
      const compact = box.width < 980;
      const phone = box.width < 560;
      let scale = preferredScale || (compact ? (phone ? 1.0 : 0.92) : 0.85);
      scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
      const x = box.insets.left + box.innerWidth / 2 - cardCenterX * scale;
      const y = box.insets.top + box.innerHeight / 2 - cardCenterY * scale;
      this.tweenTo({ scale, x, y }, options);
    },

    frameTrail(personIds) {
      const set = new Set(personIds);
      const bounds = getBoundsForPeople((p) => set.has(p.id));
      if (!bounds) return;
      const box = this.getViewportBox();
      const compact = box.width < 980;
      this.frameBounds(bounds, {
        paddingX: compact ? 40 : 80,
        paddingY: compact ? 40 : 70,
        minScale: 0.18,
        maxScale: 1.1,
        alignX: 0.5,
        alignY: 0.4
      });
    },

    initialView() {
      this.centerRoot({ duration: 0 });
    },

    initialViewWhenReady(attempt) {
      const nextAttempt = attempt || 0;
      const width = Elements.cont.clientWidth;
      const height = Elements.cont.clientHeight;
      if ((width < 40 || height < 40) && nextAttempt < 12) {
        setTimeout(() => this.initialViewWhenReady(nextAttempt + 1), 90);
        return;
      }
      this.initialView();
    },

    momentum() {
      if (Math.abs(this.vx) < 0.35 && Math.abs(this.vy) < 0.35) return;
      this.x += this.vx; this.y += this.vy;
      this.vx *= 0.92; this.vy *= 0.92;
      this.applyTransform();
      this.rafId = requestAnimationFrame(() => this.momentum());
    },

    bindPointerEvents() {
      Elements.cont.addEventListener("mousedown", (event) => {
        this.cancelTween();
        this.drag = true;
        this.lastX = event.clientX; this.lastY = event.clientY;
        this.vx = 0; this.vy = 0;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        Elements.cont.classList.add("dragging");
      });

      window.addEventListener("mouseup", () => {
        if (!this.drag) return;
        this.drag = false;
        Elements.cont.classList.remove("dragging");
        this.rafId = requestAnimationFrame(() => this.momentum());
      });

      window.addEventListener("mousemove", (event) => {
        if (!this.drag) return;
        const dx = event.clientX - this.lastX;
        const dy = event.clientY - this.lastY;
        this.x += dx; this.y += dy;
        this.vx = dx; this.vy = dy;
        this.lastX = event.clientX; this.lastY = event.clientY;
        this.applyTransform();
      });

      Elements.cont.addEventListener("wheel", (event) => {
        event.preventDefault();
        const rect = Elements.cont.getBoundingClientRect();
        const originX = event.clientX - rect.left;
        const originY = event.clientY - rect.top;
        this.zoomAt(event.deltaY < 0 ? 1.12 : 0.89, originX, originY);
      }, { passive: false });

      Elements.cont.addEventListener("touchstart", (event) => {
        this.cancelTween();
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.vx = 0; this.vy = 0;
        Array.from(event.changedTouches).forEach((touch) => {
          this.touches[touch.identifier] = { x: touch.clientX, y: touch.clientY };
        });
        const ids = Object.keys(this.touches);
        if (ids.length === 2) {
          const a = this.touches[ids[0]];
          const b = this.touches[ids[1]];
          this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
          this.pinchMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        }
        const primary = this.touches[ids[0]];
        this.lastX = primary.x; this.lastY = primary.y;
        this.drag = true;
      }, { passive: false });

      const endTouches = (event) => {
        Array.from(event.changedTouches).forEach((touch) => delete this.touches[touch.identifier]);
        const ids = Object.keys(this.touches);
        if (ids.length < 2) { this.pinchDist = null; this.pinchMid = null; }
        if (!ids.length) {
          this.drag = false;
          this.rafId = requestAnimationFrame(() => this.momentum());
        } else {
          this.lastX = this.touches[ids[0]].x;
          this.lastY = this.touches[ids[0]].y;
          this.vx = 0; this.vy = 0;
        }
      };
      Elements.cont.addEventListener("touchend", endTouches, { passive: true });
      Elements.cont.addEventListener("touchcancel", endTouches, { passive: true });

      Elements.cont.addEventListener("touchmove", (event) => {
        event.preventDefault();
        Array.from(event.changedTouches).forEach((touch) => {
          this.touches[touch.identifier] = { x: touch.clientX, y: touch.clientY };
        });
        const ids = Object.keys(this.touches);
        if (ids.length === 1) {
          const touch = this.touches[ids[0]];
          const dx = touch.x - this.lastX;
          const dy = touch.y - this.lastY;
          this.x += dx; this.y += dy;
          this.vx = dx; this.vy = dy;
          this.lastX = touch.x; this.lastY = touch.y;
          this.applyTransform();
          return;
        }
        if (ids.length === 2) {
          const a = this.touches[ids[0]];
          const b = this.touches[ids[1]];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          const rect = Elements.cont.getBoundingClientRect();
          const originX = mid.x - rect.left;
          const originY = mid.y - rect.top;
          if (this.pinchDist) {
            const factor = distance / this.pinchDist;
            this.zoomAt(factor, originX, originY);
          }
          if (this.pinchMid) { this.x += mid.x - this.pinchMid.x; this.y += mid.y - this.pinchMid.y; }
          this.pinchDist = distance; this.pinchMid = mid;
          this.applyTransform();
        }
      }, { passive: false });
    }
  };

  /* ====================== PANELS ====================== */

  const PanelManager = {
    setDesktopOpen(open) {
      if (!Elements.desktopPanel || !Elements.desktopPanelToggle) return;
      Elements.desktopPanel.classList.toggle("open", open);
      Elements.desktopPanel.setAttribute("aria-hidden", String(!open));
      Elements.desktopPanelToggle.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("panel-open", open);
    },
    toggleDesktop() {
      if (!Elements.desktopPanel) return;
      const isOpen = Elements.desktopPanel.classList.contains("open");
      this.setDesktopOpen(!isOpen);
    },
    setMobileOpen(open) {
      if (!Elements.mobilePanel) return;
      Elements.mobilePanel.classList.toggle("open", open);
      if (Elements.mobileInfoToggle) Elements.mobileInfoToggle.setAttribute("aria-expanded", String(open));
      if (Elements.mobileDockInfo) Elements.mobileDockInfo.setAttribute("aria-expanded", String(open));
    },
    toggleMobile() {
      const isOpen = Elements.mobilePanel.classList.contains("open");
      this.setMobileOpen(!isOpen);
    },
    bind() {
      if (Elements.mobileInfoToggle) Elements.mobileInfoToggle.addEventListener("click", () => this.toggleMobile());
      if (Elements.mobileDockInfo) Elements.mobileDockInfo.addEventListener("click", () => this.toggleMobile());
      if (Elements.mobilePanelClose) Elements.mobilePanelClose.addEventListener("click", () => this.setMobileOpen(false));
      if (Elements.desktopPanelToggle) Elements.desktopPanelToggle.addEventListener("click", () => this.toggleDesktop());
      if (Elements.desktopPanelClose) Elements.desktopPanelClose.addEventListener("click", () => this.setDesktopOpen(false));
    }
  };

  /* ====================== APP ====================== */

  const App = {
    resizeTimer: null,
    lastWidth: window.innerWidth,
    showStartupError(error) {
      if (!Elements.startupError) return;
      Elements.startupError.classList.add("open");
      if (error && error.message) {
        const detail = Elements.startupError.querySelector("span");
        if (detail) detail.textContent = `The browser failed while starting the interactive view: ${error.message}`;
      }
    },
    bindControls() {
      const bind = (el, fn) => { if (el) el.addEventListener("click", fn); };
      bind(Elements.fitViewButton, () => Viewport.fitView());
      bind(Elements.centerRootButton, () => Viewport.centerRoot());
      bind(Elements.zoomInButton, () => Viewport.zoomAt(1.18));
      bind(Elements.zoomOutButton, () => Viewport.zoomAt(0.85));
      bind(Elements.mobileFitViewButton, () => Viewport.fitView());
      bind(Elements.mobileCenterRootButton, () => Viewport.centerRoot());
      bind(Elements.mobileZoomInButton, () => Viewport.zoomAt(1.18));
      bind(Elements.mobileZoomOutButton, () => Viewport.zoomAt(0.85));

      // Topbar stat clicks open branches panel
      document.querySelectorAll("[data-jump-target]").forEach((node) => {
        node.addEventListener("click", () => {
          const target = node.getAttribute("data-jump-target");
          if (target === "branches" || target === "root") {
            if (window.innerWidth < 980) PanelManager.setMobileOpen(true);
            else PanelManager.setDesktopOpen(true);
          }
          if (target === "root") Viewport.centerRoot();
        });
      });

      if (Elements.relationHeroCollapse) {
        Elements.relationHeroCollapse.addEventListener("click", () => {
          if (!Elements.relationHero) return;
          const collapsed = Elements.relationHero.classList.toggle("is-collapsed");
          Elements.relationHeroCollapse.setAttribute("aria-expanded", String(!collapsed));
          if (collapsed) Elements.relationHero.style.cursor = "pointer";
          else Elements.relationHero.style.cursor = "";
        });
        Elements.relationHero.addEventListener("click", (event) => {
          if (Elements.relationHero.classList.contains("is-collapsed") && event.target === Elements.relationHero) {
            Elements.relationHero.classList.remove("is-collapsed");
            Elements.relationHeroCollapse.setAttribute("aria-expanded", "true");
          }
        });
      }

      if (Elements.relationResultClose) {
        Elements.relationResultClose.addEventListener("click", () => {
          resetRelationResult("");
          Viewport.centerRoot();
        });
      }

      if (Elements.mobileToastClose) {
        Elements.mobileToastClose.addEventListener("click", () => {
          MobileToast.hide();
          TreeRenderer.clearHighlight();
          Viewport.centerRoot();
        });
      }
      if (Elements.mobileToastDetails) {
        Elements.mobileToastDetails.addEventListener("click", () => {
          MobileToast.hide();
          PanelManager.setMobileOpen(true);
          setTimeout(() => {
            const result = document.getElementById("mobile-relation-result");
            if (result) result.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }, 220);
        });
      }
    },
    bindBranchJumpCards() {
      [Elements.overviewBranchGrid, Elements.mobileBranchGrid]
        .filter(Boolean)
        .forEach((container) => {
          container.addEventListener("click", (event) => {
            const button = event.target.closest("[data-focus-person]");
            if (!button) return;
            const personId = button.getAttribute("data-focus-person");
            if (!personId) return;
            TreeRenderer.clearHighlight();
            Viewport.focusPerson(personId);
            // Auto-close mobile panel
            if (window.innerWidth < 980) PanelManager.setMobileOpen(false);
          });
        });
    },
    bindRelationForms() {
      RelationForms.forEach(({ formId, selfId, otherId, clearId, prefix }) => {
        const form = document.getElementById(formId);
        const selfInput = document.getElementById(selfId);
        const otherInput = document.getElementById(otherId);
        const clearButton = document.getElementById(clearId);
        if (!form || !selfInput || !otherInput) return;

        form.addEventListener("submit", (event) => {
          event.preventDefault();
          runRelationLookup(selfInput.value, otherInput.value, prefix);
        });

        if (clearButton) {
          clearButton.addEventListener("click", () => {
            selfInput.value = "";
            otherInput.value = "";
            resetRelationResult(prefix);
            Viewport.centerRoot();
          });
        }
      });
    },
    bindKeyboard() {
      window.addEventListener("keydown", (event) => {
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
        const active = document.activeElement;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;

        if (event.key === "+" || event.key === "=") { event.preventDefault(); Viewport.zoomAt(1.15); }
        else if (event.key === "-" || event.key === "_") { event.preventDefault(); Viewport.zoomAt(0.87); }
        else if (event.key === "0" || event.key === "Home") { event.preventDefault(); Viewport.fitView(); }
        else if (event.key === "Escape") {
          TreeRenderer.clearHighlight();
          resetRelationResult("");
          resetRelationResult("mobile-");
        }
        else if (event.key === "ArrowLeft") { event.preventDefault(); Viewport.cancelTween(); Viewport.x += 52; Viewport.applyTransform(); }
        else if (event.key === "ArrowRight") { event.preventDefault(); Viewport.cancelTween(); Viewport.x -= 52; Viewport.applyTransform(); }
        else if (event.key === "ArrowUp") { event.preventDefault(); Viewport.cancelTween(); Viewport.y += 52; Viewport.applyTransform(); }
        else if (event.key === "ArrowDown") { event.preventDefault(); Viewport.cancelTween(); Viewport.y -= 52; Viewport.applyTransform(); }
      });
    },
    bindResize() {
      window.addEventListener("resize", () => {
        const newWidth = window.innerWidth;
        if (Math.abs(newWidth - this.lastWidth) < 2) return;
        this.lastWidth = newWidth;
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => Viewport.initialViewWhenReady(0), 180);
      });
      window.addEventListener("load", () => Viewport.initialViewWhenReady(0));
      window.addEventListener("pageshow", () => Viewport.initialViewWhenReady(0));
      window.addEventListener("orientationchange", () => {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => Viewport.initialViewWhenReady(0), 220);
      });
    },
    init() {
      if (!PERSONS.length || !Object.keys(BRANCH_META).length) {
        throw new Error("Family dataset is missing.");
      }
      buildIndexes();
      computeLayout();
      NameLookup.build();
      TreeSummary.renderStats();
      TreeSummary.renderBranchOverviews();
      TreeRenderer.renderAll();
      this.bindControls();
      this.bindBranchJumpCards();
      this.bindRelationForms();
      Viewport.bindPointerEvents();
      PanelManager.bind();
      this.bindKeyboard();
      this.bindResize();
      Viewport.initialViewWhenReady(0);
    }
  };

  try { App.init(); }
  catch (error) {
    console.error(error);
    App.showStartupError(error);
  }
})();
