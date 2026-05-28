/**
 * Rule-based fallback replies when Mistral is unavailable or times out.
 * Uses only public site URL and contact hints from the knowledge base.
 */

function getPublicSiteUrl() {
  const raw =
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_SITE_URL ||
    'https://www.arushacatholicseminary.co.tz';
  return String(raw).trim().replace(/\/$/, '');
}

function extractContactsFromKnowledge(knowledgeBase = '') {
  const kb = String(knowledgeBase);
  const pick = (re) => {
    const m = kb.match(re);
    return m ? m[1].trim() : '';
  };
  return {
    phone: pick(/contact phone:\s*([+\d\s()-]+)/i),
    whatsapp: pick(/contact whatsapp:\s*([+\d\s()-]+)/i),
    email: pick(/contact email:\s*(\S+@\S+)/i),
    admissionsEmail: pick(/admissions email:\s*(\S+@\S+)/i),
  };
}

function contactLines(contacts) {
  const lines = [];
  if (contacts.phone) lines.push(`Simu: ${contacts.phone}`);
  if (contacts.whatsapp && contacts.whatsapp !== contacts.phone) {
    lines.push(`WhatsApp: ${contacts.whatsapp}`);
  }
  if (contacts.admissionsEmail) lines.push(`Barua pepe (udahili): ${contacts.admissionsEmail}`);
  else if (contacts.email) lines.push(`Barua pepe: ${contacts.email}`);
  return lines.join('\n');
}

/**
 * @param {string} userMessage
 * @param {string} [knowledgeBase]
 * @returns {string}
 */
function buildChatFallbackReply(userMessage, knowledgeBase = '') {
  const msg = String(userMessage || '').toLowerCase();
  const siteUrl = getPublicSiteUrl();
  const contacts = extractContactsFromKnowledge(knowledgeBase);
  const contactBlock = contactLines(contacts);

  if (/url|tovuti|website|link|anwani ya tovuti|nipe url/.test(msg)) {
    return `Tovuti rasmi ya Seminari ya Kikatoliki Arusha:\n${siteUrl}\n\nMawasiliano: ${siteUrl}/contact\nUdahili: ${siteUrl}/admissions`;
  }

  if (/pre.?form|preform|pre form one/.test(msg)) {
    let reply =
      `Kuhusu Pre-Form One, angalia ukurasa wa udahili (${siteUrl}/admissions) na matangazo (${siteUrl}/announcements) kwa tarehe na maelekezo ya sasa.`;
    if (contactBlock) reply += `\n\n${contactBlock}`;
    else reply += `\n\nWasiliana na ofisi: ${siteUrl}/contact`;
    return reply;
  }

  if (/darasa la saba|form one|kidato cha kwanza|nafasi|udahili|anahitimu|kuomba/.test(msg)) {
    let reply =
      `Kwa wanafunzi wanaohitimu darasa la saba: angalia mahitaji na mchakato wa udahili kwenye ${siteUrl}/admissions. Omba mtandaoni kupitia ${siteUrl}/admissions/apply. Tarehe na nafasi zinategemea matangazo ya shule — angalia pia ${siteUrl}/announcements.`;
    if (contactBlock) reply += `\n\n${contactBlock}`;
    else reply += `\n\nMaswali zaidi: ${siteUrl}/contact`;
    return reply;
  }

  if (/simu|namba|mkuu|rector|wasiliana|contact|barua pepe|email/.test(msg)) {
    if (contactBlock) {
      return `${contactBlock}\n\nMaelezo zaidi: ${siteUrl}/contact`;
    }
    return `Maelezo ya mawasiliano yapo kwenye ${siteUrl}/contact (simu, barua pepe, saa za ofisi).`;
  }

  let reply =
    'Samahani, msaidizi hauwezi kujibu sasa hivi. Tafadhali jaribu tena baada ya dakika moja.';
  reply += `\n\nTembelea ${siteUrl}/contact kwa msaada wa ofisi.`;
  if (contactBlock) reply += `\n${contactBlock}`;
  return reply;
}

module.exports = {
  getPublicSiteUrl,
  buildChatFallbackReply,
  extractContactsFromKnowledge,
};
