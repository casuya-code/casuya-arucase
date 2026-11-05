/**
 * Rule-based fallback replies when Mistral is unavailable, misconfigured or
 * times out. The tone is deliberately human — a helpful member of the school
 * office, not a script. Replies are bilingual (English / Kiswahili) and always
 * answer the question first, then give one clear next step.
 */

function getPublicSiteUrl() {
  const raw =
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_SITE_URL ||
    'https://www.arushacatholicseminary.co.tz';
  return String(raw).trim().replace(/\/$/, '');
}

function pickFirst(text, patterns) {
  for (const re of patterns) {
    const m = String(text || '').match(re);
    if (m && m[1] && m[1].trim()) return m[1].trim();
  }
  return '';
}

function extractContactsFromKnowledge(knowledgeBase = '') {
  const kb = String(knowledgeBase);
  const phone = pickFirst(kb, [
    /contact phone:\s*([+\d\s()-]+)/i,
    /^phone:\s*([+\d\s()-]+)$/im,
    /simu:\s*([+\d\s()-]+)/i,
  ]);
  const whatsapp = pickFirst(kb, [
    /contact whatsapp:\s*([+\d\s()-]+)/i,
    /^whatsapp:\s*([+\d\s()-]+)$/im,
  ]);
  const email = pickFirst(kb, [
    /contact email:\s*(\S+@\S+)/i,
    /^email:\s*(\S+@\S+)$/im,
  ]);
  return {
    phone,
    whatsapp,
    email,
    admissionsEmail: pickFirst(kb, [/admissions email:\s*(\S+@\S+)/i]) || email,
    address: pickFirst(kb, [
      /contact address:\s*([^\n]+)/i,
      /^address:\s*([^\n]+)$/im,
    ]),
    officeWeekdays: pickFirst(kb, [/office weekdays:\s*([^\n]+)/i]),
    officeSaturday: pickFirst(kb, [/office saturday:\s*([^\n]+)/i]),
    mapUrl: pickFirst(kb, [/social location:\s*(https?:\/\/\S+)/i]),
  };
}

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

const SWAHILI_MARKERS =
  /\b(na|ya|wa|kwa|ni|za|la|katika|hii|hilo|huyu|wanafunzi|mwanafunzi|shule|seminari|ada|malipo|udahili|darasa|kidato|habari|asante|tafadhali|naomba|nataka|je|gani|ngapi|wapi|lini|vipi|saa|tarehe|leo|kesho|matokeo|walimu|wafanyakazi|mawasiliano|simu|barua|pepe|mahitaji|nafasi|mtoto|mwanangu|nini|kwanini|hapa|pale|yetu|yako|ako|wenu|karibu|hujambo|salamu|mambo|kwaheri|asubuhi|mchana|jioni|usiku|baba|mama|mzazi|mlezi|msaada|sana|ndiyo|hapana)\b/gi;

const ENGLISH_MARKERS =
  /\b(the|is|are|am|was|were|do|does|did|can|could|would|will|how|what|where|when|why|who|which|my|your|our|child|son|daughter|school|fees?|tuition|pay|payment|admission|admissions|apply|application|join|form|standard|seven|results?|necta|contact|phone|email|address|office|hours|located|location|about|please|thanks|thank|hello|hi|hey|good|morning|afternoon|evening|need|want|help|tell|give|send|available|requirements|deadline|date|price|cost|much|many|there|have|has|you|we|they|it|this|that)\b/gi;

function countMatches(text, re) {
  const matches = String(text || '').match(re);
  return matches ? matches.length : 0;
}

/** English when English markers clearly dominate; otherwise Kiswahili. */
function detectLanguage(message) {
  const text = String(message || '');
  const sw = countMatches(text, SWAHILI_MARKERS);
  const en = countMatches(text, ENGLISH_MARKERS);
  return en > sw ? 'en' : 'sw';
}

function prefersSwahili(message) {
  return detectLanguage(message) === 'sw';
}

const t = (lang, en, sw) => (lang === 'en' ? en : sw);

// ---------------------------------------------------------------------------
// Facts extracted from the knowledge base (never invented)
// ---------------------------------------------------------------------------

/** Keep only the fees area so unrelated documents cannot override real amounts. */
function feeSection(knowledgeBase = '') {
  const kb = String(knowledgeBase);
  const start = kb.search(/^=== SCHOOL FEES/im);
  if (start < 0) return kb;
  const end = kb.search(/^=== FAQs?/im);
  return kb.slice(start, end > start ? end : undefined);
}

function extractFeeFacts(knowledgeBase = '') {
  const kb = String(knowledgeBase);
  const fees = feeSection(kb);
  const formFiveBlock = (fees.match(/FORM V[^\n]*\n([\s\S]{0,900})/i) || [])[1] || '';
  return {
    preFormTuition: pickFirst(kb, [
      /TZS\s*([\d,]{6,})\s*\(Pre-Form One\)/i,
      /Pre-Form One[^\n]*?TZS\s*([\d,]{6,})/i,
      /Pre-Form One[^\n]*?Tshs?\.?\s*([\d,]{6,})/i,
      /Pre-Form One[^\n]*?([\d,]{7,})\/=?/i,
    ]),
    formOneTuition: pickFirst(fees, [
      /Ada ni Tshs?\.?\s*([\d,]{7,})\/=\s*kwa mwaka/i,
      /Tshs?\.?\s*([\d,]{7,})\/=\s*kwa mwaka/i,
      /TZS\s*([\d,]{7,})\s*\(Form One\)/i,
    ]),
    formFiveTuition: pickFirst(formFiveBlock, [
      /Ada ni Tshs?\.?\s*([\d,]{7,})\/=\s*kwa mwaka/i,
      /Tshs?\.?\s*([\d,]{7,})\/=\s*kwa mwaka/i,
    ]) || pickFirst(fees, [
      /TZS\s*([\d,]{7,})\s*\((?:full|kamili)\)/i,
    ]),
    formFiveHalf: pickFirst(formFiveBlock, [
      /nusu\s*\(\s*Tshs?\.?\s*([\d,]{7,})\/=/i,
      /nusu\s*\(\s*([\d,]{7,})/i,
    ]),
    construction: pickFirst(fees, [
      /Fedha za Ujenzi[^\n]*?Tshs?\.?\s*([\d,]{6,})\/=\s*kwa kila mwanafunzi kwa mwaka/i,
      /Tshs?\.?\s*([\d,]{6,})\/=\s*kwa kila mwanafunzi kwa mwaka/i,
      /TZS\s*([\d,]{6,})\s*\(annual/i,
    ]),
    tuitionAccount: pickFirst(fees, [
      /NBC[^\n]*?namba\s*(\d{6,})/i,
      /akaunti ya Shule[^\n]*?namba\s*(\d{6,})/i,
      /namba\s+(\d{9,})/i,
    ]),
    constructionAccount: pickFirst(fees, [
      /CRDB[^\n]*?namba\s*(\d{6,})/i,
      /akaunti ya ujenzi[^\n]*?namba\s*(\d{6,})/i,
    ]),
  };
}

function extractOpeningDate(knowledgeBase = '') {
  return pickFirst(knowledgeBase, [
    /tarehe\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
    /(?:opening|reporting)\s+date[^\n]*?(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
    /wanafunzi watafungua shule tarehe\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
  ]);
}

function extractLocation(knowledgeBase = '', lang = 'en') {
  const kb = String(knowledgeBase);
  const en = pickFirst(kb, [/(40\s*km from[^\n,]*)/i]);
  const sw = pickFirst(kb, [/(40\s*km kutoka[^\n,]*)/i]);
  if (lang === 'sw') {
    return sw || en || pickFirst(kb, [/(40\s*km[^\n,]*)/i]);
  }
  return en || sw || pickFirst(kb, [/(40\s*km[^\n,]*)/i]);
}

function extractPreFormIntake(knowledgeBase = '', lang = 'en') {
  const kb = String(knowledgeBase);
  const raw = pickFirst(kb, [
    /Pre-Form One Intake[,\s]+([A-Za-z]+)/i,
    /Pre-Form One[^\n]*?(Oktoba|October)/i,
  ]);
  if (!raw) return '';
  if (lang === 'sw') {
    const englishToSwahili = {
      january: 'Januari',
      february: 'Februari',
      march: 'Machi',
      april: 'Aprili',
      may: 'Mei',
      june: 'Juni',
      july: 'Julai',
      august: 'Agosti',
      september: 'Septemba',
      october: 'Oktoba',
      november: 'Novemba',
      december: 'Desemba',
    };
    return englishToSwahili[raw.toLowerCase()] || raw;
  }
  return raw;
}

function extractFoundedYear(knowledgeBase = '') {
  return pickFirst(knowledgeBase, [
    /ilianzishwa mwaka\s*\*{0,2}(\d{4})/i,
    /founded in\s*(\d{4})/i,
  ]);
}

const SWAHILI_MONTHS = {
  januari: 'January',
  februari: 'February',
  machi: 'March',
  aprili: 'April',
  mei: 'May',
  juni: 'June',
  julai: 'July',
  agosti: 'August',
  septemba: 'September',
  oktoba: 'October',
  novemba: 'November',
  desemba: 'December',
};

function englishDate(dateText) {
  const raw = String(dateText || '').trim();
  return raw.replace(/\b([A-Za-z]+)\b/g, (word) => {
    const key = word.toLowerCase();
    return SWAHILI_MONTHS[key] ? SWAHILI_MONTHS[key] : word;
  });
}

const MONTH_INDEX = {
  january: 0,
  januari: 0,
  february: 1,
  februari: 1,
  march: 2,
  machi: 2,
  april: 3,
  aprili: 3,
  may: 4,
  mei: 4,
  june: 5,
  juni: 5,
  july: 6,
  julai: 6,
  august: 7,
  agosti: 7,
  september: 8,
  septemba: 8,
  october: 9,
  oktoba: 9,
  november: 10,
  novemba: 10,
  december: 11,
  desemba: 11,
};

/** True when the notice date is before today in Tanzania. */
function noticeDateIsPast(dateText) {
  const m = String(dateText || '').match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return false;
  const month = MONTH_INDEX[m[2].toLowerCase()];
  if (month == null) return false;

  const notice = Date.UTC(parseInt(m[3], 10), month, parseInt(m[1], 10));
  const todayParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Dar_es_Salaam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [year, monthNumber, day] = todayParts.split('-').map(Number);
  const today = Date.UTC(year, monthNumber - 1, day);
  return notice < today;
}

// ---------------------------------------------------------------------------
// Small human touches
// ---------------------------------------------------------------------------

function buildGreetingReply(lang) {
  return t(
    lang,
    'Hello! Welcome to ARUCASE. I can help with fees, admissions, results or contact details — what would you like to know?',
    'Habari! Karibu ARUCASE. Naweza kukusaidia kuhusu ada, udahili, matokeo au mawasiliano — ungependa kujua nini?'
  );
}

function buildThanksReply(lang) {
  return t(
    lang,
    "You're very welcome — I'm glad I could help. If anything else comes up, just ask.",
    'Karibu sana — nimefurahi kukusaidia. Kama una swali lingine, uliza tu.'
  );
}

function buildByeReply(lang) {
  return t(
    lang,
    'Goodbye — all the best, and thank you for reaching out to ARUCASE.',
    'Kwaheri, na kila la kheri. Asante kwa kuwasiliana na ARUCASE.'
  );
}

function buildIdentityReply(lang) {
  return t(
    lang,
    'I’m the ARUCASE online assistant. I can help with school fees, admissions (including Pre-Form One), results, staff and contact details. What can I help you with?',
    'Mimi ni msaidizi wa mtandaoni wa ARUCASE. Naweza kukusaidia kuhusu ada, udahili (pamoja na Pre-Form One), matokeo, wafanyakazi na mawasiliano. Naweza kukusaidia nini?'
  );
}

/**
 * Trivial messages that don't need Mistral or a database round-trip.
 * Returns null for anything that needs a real answer.
 */
function buildInstantChatReply(userMessage) {
  const text = String(userMessage || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!text || text.length > 60) return null;
  const core = text.replace(/[!?.,…]+$/g, '').trim();
  const lang = detectLanguage(userMessage);

  if (
    /^(hi|hello|hey|good (morning|afternoon|evening|night)|habari( ya (asubuhi|mchana|jioni|usiku))?( yako| zenu| yenu)?|hujambo|sijambo|salamu|mambo( vipi)?|vipi|shikamoo)( there| tena)?$/.test(
      core
    )
  ) {
    return buildGreetingReply(lang);
  }
  if (
    /^(asante( sana)?( kwa (msaada|muda))?|asanteni|thank(s| you)( so much| very much)?|thank u|thx|many thanks)$/.test(core)
  ) {
    return buildThanksReply(lang);
  }
  if (/^(bye|goodbye|kwaheri|baadaye|see you|tutaonana)( later| tena)?$/.test(core)) {
    return buildByeReply(lang);
  }
  if (
    /^(who are you|what are you|what is your name|nani wewe|wewe ni nani|jina lako nani|jina lako ni nani|what can you do|what do you help with|unaweza kufanya nini|unasaidia nini|i have a question|nina swali|i need help|help me( with something)?|can you help( me)?|naomba msaada|help|msaada)$/.test(
      core
    )
  ) {
    return buildIdentityReply(lang);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Topic replies
// ---------------------------------------------------------------------------

function prettyAddress(address) {
  return String(address || '')
    .replace(/P\.?\s*o\.?\s*Box/i, 'P.O. Box')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A natural contact phrase: "call … or WhatsApp …, or email …". */
function contactClause(lang, contacts) {
  const parts = [];
  const phone = contacts.phone;
  const whatsapp = contacts.whatsapp && contacts.whatsapp !== phone ? contacts.whatsapp : '';
  const email = contacts.admissionsEmail || contacts.email;

  if (phone && whatsapp) {
    parts.push(t(lang, `call ${phone} or WhatsApp ${whatsapp}`, `piga simu ${phone} au WhatsApp ${whatsapp}`));
  } else if (phone) {
    parts.push(t(lang, `call or WhatsApp ${phone}`, `piga simu au WhatsApp ${phone}`));
  } else if (whatsapp) {
    parts.push(`WhatsApp ${whatsapp}`);
  }
  if (email) {
    parts.push(t(lang, `email ${email}`, `barua pepe ${email}`));
  }
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')}${t(lang, ', or ', ', au ')}${parts[parts.length - 1]}`;
}

function buildWebsiteReply(lang) {
  const site = getPublicSiteUrl();
  return t(
    lang,
    `Our official website is ${site}. You’ll find fees, admissions, results and contact details there.`,
    `Tovuti rasmi ni ${site}. Utapata ada, udahili, matokeo na mawasiliano hapo.`
  );
}

function buildFeesReply(userMessage, lang, knowledgeBase) {
  const site = getPublicSiteUrl();
  const facts = extractFeeFacts(knowledgeBase);
  const wantsFormFive = /form\s*(five|5)|kidato\s*cha\s*tano/i.test(userMessage);
  const wantsPreForm = /pre.?form/i.test(userMessage);
  const wantsFormOne = /form\s*(one|1)|kidato\s*cha\s*kwanza/i.test(userMessage);
  const asksHowToPay = /pay|payment|malipo|kulipa|ninalipa|nilipie|lipa/i.test(userMessage);

  const money = (value) => (lang === 'en' ? `TZS ${value}` : `Tsh ${value}`);
  const amountBits = [];

  if (wantsFormFive) {
    if (facts.formFiveTuition) {
      amountBits.push(
        t(
          lang,
          `Form Five tuition is ${money(facts.formFiveTuition)} per year`,
          `Ada ya Kidato cha Tano ni ${money(facts.formFiveTuition)} kwa mwaka`
        ) +
          (facts.formFiveHalf
            ? t(
                lang,
                `, or ${money(facts.formFiveHalf)} if you pay half`,
                `, au ${money(facts.formFiveHalf)} kama unalipa nusu`
              )
            : '')
      );
    }
  } else if (wantsPreForm) {
    if (facts.preFormTuition) {
      amountBits.push(
        t(
          lang,
          `Pre-Form One costs ${money(facts.preFormTuition)} for the whole programme`,
          `Pre-Form One ni ${money(facts.preFormTuition)} kwa muda wote wa programu`
        )
      );
    }
  } else if (wantsFormOne) {
    if (facts.formOneTuition) {
      amountBits.push(
        t(
          lang,
          `Form One tuition is ${money(facts.formOneTuition)} per year`,
          `Ada ya Kidato cha Kwanza ni ${money(facts.formOneTuition)} kwa mwaka`
        )
      );
    }
  } else {
    if (facts.formOneTuition) {
      amountBits.push(
        t(
          lang,
          `Form One tuition is ${money(facts.formOneTuition)} per year`,
          `Ada ya Kidato cha Kwanza ni ${money(facts.formOneTuition)} kwa mwaka`
        )
      );
    }
    if (facts.preFormTuition) {
      amountBits.push(
        t(
          lang,
          `Pre-Form One is ${money(facts.preFormTuition)} for the whole programme`,
          `Pre-Form One ni ${money(facts.preFormTuition)} kwa muda wote wa programu`
        )
      );
    }
  }

  let reply = amountBits.length
    ? `${amountBits.join('. ')}.`
    : t(
        lang,
        'The current fee schedule is on our school-fee page — I don’t want to quote an old amount.',
        'Orodha ya ada ya sasa ipo kwenye ukurasa wa ada — sitaki kukupa kiasi cha zamani.'
      );

  if (facts.construction && !wantsPreForm) {
    reply += t(
      lang,
      ` There is also a construction contribution of ${money(facts.construction)} per student per year.`,
      ` Kuna pia mchango wa ujenzi wa ${money(facts.construction)} kwa mwanafunzi kwa mwaka.`
    );
  }

  if (facts.tuitionAccount || (facts.constructionAccount && !wantsPreForm)) {
    if (facts.tuitionAccount) {
      reply += t(
        lang,
        ` Pay tuition into the NBC Arusha Branch account ${facts.tuitionAccount}`,
        ` Lipa ada kwenye akaunti ya NBC Arusha Branch namba ${facts.tuitionAccount}`
      );
      reply += facts.constructionAccount && !wantsPreForm
        ? t(
            lang,
            `, and construction into the separate CRDB account ${facts.constructionAccount}.`,
            `, na mchango wa ujenzi kwenye akaunti ya CRDB namba ${facts.constructionAccount}.`
          )
        : '.';
    } else {
      reply += t(
        lang,
        ` Construction is paid into the CRDB account ${facts.constructionAccount}.`,
        ` Mchango wa ujenzi unalipwa kwenye akaunti ya CRDB namba ${facts.constructionAccount}.`
      );
    }
    reply += t(
      lang,
      ' Bring the bank slip — the school does not accept cash.',
      ' Leta bank slip — shule haipokei fedha taslimu.'
    );
  }

  if ((asksHowToPay || amountBits.length) && !wantsPreForm) {
    reply += t(
      lang,
      ' You can pay the full amount, or half at the start of the year or term.',
      ' Unaweza kulipa yote, au nusu mwanzoni mwa mwaka au muhula.'
    );
  }

  reply += t(lang, ` Full breakdown: ${site}/school-fee.`, ` Maelezo yote: ${site}/school-fee.`);
  return reply;
}

function buildAdmissionsReply(lang, knowledgeBase) {
  const site = getPublicSiteUrl();
  const contacts = extractContactsFromKnowledge(knowledgeBase);
  const contact = contactClause(lang, contacts);
  let reply = t(
    lang,
    `Start with the requirements and steps on ${site}/admissions, then apply online at ${site}/admissions/apply. Places and dates depend on the current announcements, so check ${site}/announcements before you apply.`,
    `Anza kwa kuangalia mahitaji na hatua kwenye ${site}/admissions, kisha omba mtandaoni kupitia ${site}/admissions/apply. Nafasi na tarehe hutegemea matangazo ya sasa, kwa hiyo angalia ${site}/announcements kabla ya kuomba.`
  );
  if (contact) {
    reply += t(
      lang,
      ` If you need help from the admissions office, ${contact}.`,
      ` Kama unahitaji msaada kutoka ofisi ya udahili, ${contact}.`
    );
  } else {
    reply += t(lang, ` More help: ${site}/contact.`, ` Msaada zaidi: ${site}/contact.`);
  }
  return reply;
}

function buildPreFormReply(lang, knowledgeBase) {
  const site = getPublicSiteUrl();
  const contacts = extractContactsFromKnowledge(knowledgeBase);
  const intake = extractPreFormIntake(knowledgeBase, lang);
  const contact = contactClause(lang, contacts);

  let reply = intake
    ? t(
        lang,
        `The Pre-Form One intake is in ${intake}. Requirements and the application steps are on ${site}/admissions, and you can apply at ${site}/admissions/apply.`,
        `Udahili wa Pre-Form One huwa mwezi wa ${intake}. Mahitaji na hatua za maombi yapo kwenye ${site}/admissions, na unaweza kuomba kupitia ${site}/admissions/apply.`
      )
    : t(
        lang,
        `Pre-Form One requirements and application steps are on ${site}/admissions, and you can apply at ${site}/admissions/apply. Check ${site}/announcements for this year’s dates.`,
        `Mahitaji na hatua za maombi ya Pre-Form One yapo kwenye ${site}/admissions, na unaweza kuomba kupitia ${site}/admissions/apply. Angalia ${site}/announcements kwa tarehe za mwaka huu.`
      );

  reply += contact
    ? t(lang, ` For details, ${contact}.`, ` Kwa maelezo zaidi, ${contact}.`)
    : t(lang, ` More help: ${site}/contact.`, ` Msaada zaidi: ${site}/contact.`);
  return reply;
}

function buildContactReply(lang, knowledgeBase) {
  const site = getPublicSiteUrl();
  const contacts = extractContactsFromKnowledge(knowledgeBase);
  const location = extractLocation(knowledgeBase, lang);
  const contact = contactClause(lang, contacts);
  const address = prettyAddress(contacts.address);

  let reply = contact
    ? t(lang, `To get in touch, ${contact}.`, `Kwa mawasiliano, ${contact}.`)
    : t(lang, `Our contact details are on ${site}/contact.`, `Mawasiliano yetu yapo kwenye ${site}/contact.`);

  if (location) {
    reply += t(lang, ` We’re ${location}.`, ` Tupo ${location}.`);
  }
  if (address) {
    reply += t(lang, ` Post: ${address}.`, ` Barua: ${address}.`);
  }
  reply += t(
    lang,
    ` The map and office hours are on ${site}/contact.`,
    ` Ramani na saa za ofisi zipo kwenye ${site}/contact.`
  );
  return reply;
}

function buildResultsReply(lang, knowledgeBase) {
  const site = getPublicSiteUrl();
  const contacts = extractContactsFromKnowledge(knowledgeBase);
  const contact = contactClause(lang, contacts);
  let reply = t(
    lang,
    `Parents and students can check results with the admission number at ${site}/student-report. NECTA results are at ${site}/necta-results.`,
    `Wazazi na wanafunzi wanaweza kuangalia matokeo kwa namba ya usajili kwenye ${site}/student-report. Matokeo ya NECTA yapo kwenye ${site}/necta-results.`
  );
  if (contact) {
    reply += t(
      lang,
      ` If a result is missing, ${contact} — the office will help.`,
      ` Kama matokeo hayapatikani, ${contact} — ofisi itakusaidia.`
    );
  }
  return reply;
}

function buildStaffReply(lang, knowledgeBase) {
  const site = getPublicSiteUrl();
  const contacts = extractContactsFromKnowledge(knowledgeBase);
  const contact = contactClause(lang, contacts);
  let reply = t(
    lang,
    `Our staff directory — including teachers and their subjects — is at ${site}/staff.`,
    `Orodha ya wafanyakazi — pamoja na walimu na masomo yao — ipo kwenye ${site}/staff.`
  );
  reply += contact
    ? t(lang, ` For a specific office, ${contact}.`, ` Kwa ofisi fulani, ${contact}.`)
    : t(lang, ` Office contacts are on ${site}/contact.`, ` Mawasiliano ya ofisi yapo kwenye ${site}/contact.`);
  return reply;
}

function buildAboutReply(lang, knowledgeBase) {
  const site = getPublicSiteUrl();
  const year = extractFoundedYear(knowledgeBase);
  const founded = year
    ? t(lang, `, founded in ${year}`, `, ilianzishwa mwaka ${year}`)
    : '';
  return t(
    lang,
    `Arusha Catholic Seminary (ARUCASE) is a Catholic secondary seminary at Oldonyosambu in Arusha${founded}. We form young men academically, spiritually and morally. You can read more at ${site}/about.`,
    `Seminari ya Kikatoliki Arusha (ARUCASE) ni seminari ya sekondari ya Kikatoliki iliyopo Oldonyosambu, Arusha${founded}. Tunalenga kuwajenga vijana wa kiume kitaaluma, kiroho na kiadili. Soma zaidi kwenye ${site}/about.`
  );
}

function buildOpeningReply(lang, knowledgeBase) {
  const site = getPublicSiteUrl();
  const contacts = extractContactsFromKnowledge(knowledgeBase);
  const contact = contactClause(lang, contacts);
  const date = extractOpeningDate(knowledgeBase);
  if (!date) {
    return t(
      lang,
      `The latest opening and reporting dates are posted on ${site}/announcements. Please check there before travelling${contact ? `, or ${contact}` : ', or call the school office'}.`,
      `Tarehe za kufungua shule na kuripoti zipo kwenye ${site}/announcements. Tafadhali angalia hapo kabla ya safari${contact ? `, au ${contact}` : ', au piga simu ofisi ya shule'}.`
    );
  }
  const shown = lang === 'en' ? englishDate(date) : date;
  if (noticeDateIsPast(date)) {
    return t(
      lang,
      `The notice currently on our site mentions ${shown}, but that date has already passed. Please check ${site}/announcements for the new reporting date.${contact ? ` If you need help, ${contact}.` : ''}`,
      `Tangazo lililopo kwenye tovuti linasema ${shown}, lakini tarehe hiyo imeshapita. Tafadhali angalia ${site}/announcements kwa tarehe mpya ya kuripoti.${contact ? ` Kama unahitaji msaada, ${contact}.` : ''}`
    );
  }
  return t(
    lang,
    `The current school notice says students report on ${shown}. Please confirm with the office or check ${site}/announcements before travelling.`,
    `Tangazo la sasa la shule linasema wanafunzi wanaripoti tarehe ${shown}. Tafadhali thibitisha na ofisi au angalia ${site}/announcements kabla ya safari.`
  );
}

function buildUnknownReply(lang, knowledgeBase) {
  const site = getPublicSiteUrl();
  const contacts = extractContactsFromKnowledge(knowledgeBase);
  const contact = contactClause(lang, contacts);
  if (contact) {
    return t(
      lang,
      `I’d rather not guess on that one. Please ${contact}. You can also use ${site}/contact — the office will help you directly.`,
      `Sitaki kukisia jibu kuhusu hilo. Tafadhali ${contact}. Unaweza pia kutumia ${site}/contact — ofisi itakusaidia moja kwa moja.`
    );
  }
  return t(
    lang,
    `I’d rather not guess on that one. Please use ${site}/contact to reach the school office — they’ll help you directly.`,
    `Sitaki kukisia jibu kuhusu hilo. Tafadhali tumia ${site}/contact kufikia ofisi ya shule — watakusaidia moja kwa moja.`
  );
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * @param {string} userMessage
 * @param {string} [knowledgeBase]
 * @returns {string}
 */
function buildChatFallbackReply(userMessage, knowledgeBase = '') {
  const message = String(userMessage || '').trim();
  const lang = detectLanguage(message);
  const text = message.toLowerCase();

  if (!message) return buildGreetingReply(lang);

  const instant = buildInstantChatReply(message);
  if (instant) return instant;

  const { isTodayDateQuestion, buildTodayDateReply } = require('./chatCurrentDate');
  if (isTodayDateQuestion(message)) {
    return buildTodayDateReply(message);
  }

  if (/kufungua shule|school open|opening date|reporting date|tarehe ya kufungua|wanafunzi watafungua|when does school (open|start)|shule inafungua lini/i.test(text)) {
    return buildOpeningReply(lang, knowledgeBase);
  }

  if (/ada|malipo|fee|fees|tuition|tzs|pesa|gharama|cost|price|bei|kiasi|shilingi|pay|payment|school fee/i.test(text)) {
    return buildFeesReply(message, lang, knowledgeBase);
  }

  if (/url|tovuti|website|link|web site|anwani ya tovuti/i.test(text)) {
    return buildWebsiteReply(lang);
  }

  if (/pre.?form|preform|pre form one/i.test(text)) {
    return buildPreFormReply(lang, knowledgeBase);
  }

  if (/matokeo|result|results|necta|ripoti|report card|student report|exam/i.test(text)) {
    return buildResultsReply(lang, knowledgeBase);
  }

  if (/udahili|admission|admissions|apply|application|nafasi|darasa la saba|standard seven|join form|kujiunga|mahitaji|requirements|deadline|tarehe za maombi/i.test(text)) {
    return buildAdmissionsReply(lang, knowledgeBase);
  }

  if (/simu|namba|phone|whatsapp|barua pepe|email|wasiliana|mawasiliano|contact|address|anwani|location|located|wapi|mlipo|office hours|saa za ofisi|ramani|map|oldonyosambu|arusha/i.test(text)) {
    return buildContactReply(lang, knowledgeBase);
  }

  if (/walimu|teacher|teachers|staff|wafanyakazi|mwalimu|headmaster|rector|mkuu/i.test(text)) {
    return buildStaffReply(lang, knowledgeBase);
  }

  if (/kuhusu|about|seminari|seminary|history|historia|shule yenu|school profile/i.test(text)) {
    return buildAboutReply(lang, knowledgeBase);
  }

  // A short, polite "where do I go?" answer is more useful than a dead end.
  return buildUnknownReply(lang, knowledgeBase);
}

module.exports = {
  getPublicSiteUrl,
  buildChatFallbackReply,
  buildInstantChatReply,
  extractContactsFromKnowledge,
  detectLanguage,
  prefersSwahili,
};
