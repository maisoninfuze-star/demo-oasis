/* ===========================================================
   GoHighLevel bridge — one place that talks to the CRM.

   Every form on the site (quote, visit, newsletter, account, order)
   goes through OasisCRM.send(). It normalizes to the field names GHL
   maps onto a contact record (first_name / last_name / email / phone /
   full_name), so the workflow doesn't need custom mapping per form,
   and stamps the shared attribution fields.

   The inbound webhook URL is public by design — it ships in the page.
   Keep required-field and spam rules on the GHL side.
   =========================================================== */
(() => {
  const CFG = window.OASIS_CONFIG || {};

  /* "Marie-Claire Tremblay" -> first "Marie-Claire", last "Tremblay" */
  function splitName(full) {
    const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { first_name: '', last_name: '' };
    if (parts.length === 1) return { first_name: parts[0], last_name: '' };
    return { first_name: parts.slice(0, -1).join(' '), last_name: parts[parts.length - 1] };
  }

  /* Everything GHL needs to create/update the contact, plus attribution. */
  function normalize(data) {
    const out = { ...data };
    const full = data.full_name || data.name || '';
    if (full && (!data.first_name || !data.last_name)) Object.assign(out, splitName(full));
    if (full) out.full_name = full;
    if (out.email) out.email = String(out.email).trim().toLowerCase();
    out.language = out.language || (document.body.dataset.lang === 'fr' ? 'fr' : 'en');
    out.source = out.source || 'galerieoasis.ca';
    out.page = out.page || location.href;
    out.submitted_at = new Date().toISOString();
    try {
      const p = new URLSearchParams(location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => {
        const v = p.get(k); if (v) out[k] = v;
      });
    } catch (e) { /* URL parsing is best-effort */ }
    return out;
  }

  /* Resolves true only when the CRM actually accepted the record, so
     callers can fall back to mailto instead of silently losing a lead.
     opts.hook picks a different GHL workflow (e.g. 'account'); unknown or
     unset hooks fall back to the main lead webhook. */
  async function send(data, opts) {
    const HOOKS = { account: CFG.accountWebhook };
    const url = (opts && HOOKS[opts.hook]) || CFG.leadWebhook;
    if (!url) return false;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalize(data))
      });
      return r.ok;
    } catch (err) {
      return false;
    }
  }

  window.OasisCRM = { send, normalize, splitName };
})();
