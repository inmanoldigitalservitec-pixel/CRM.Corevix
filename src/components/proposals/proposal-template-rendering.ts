import { formatCurrencyAmount } from "@/lib/currency";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeTemplateHtml(html: string) {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, iframe, object, embed").forEach((node) => node.remove());
  doc.body.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = String(attr.value || "")
        .trim()
        .toLowerCase();
      if (name.startsWith("on") || value.startsWith("javascript:")) {
        node.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML;
}

function formatMoney(amount: unknown, currency: unknown) {
  return formatCurrencyAmount(Number(amount || 0), String(currency || "USD"));
}

function getClientValue(proposal: any, key: string) {
  const client = proposal?.client && typeof proposal.client === "object" ? proposal.client : {};
  return client?.[key] ?? "";
}

function renderItemsTable(items: any[], currency: string) {
  if (!Array.isArray(items) || !items.length) {
    return `<p style="color:#64748b;">No hay ítems agregados todavía.</p>`;
  }

  const rows = items
    .map((item, index) => {
      const name = escapeHtml(item?.item_name || item?.name || item?.description || "Servicio");
      const description = escapeHtml(item?.description || "");
      const quantity = escapeHtml(item?.quantity || 1);
      const rate = escapeHtml(formatMoney(item?.rate ?? item?.converted_rate ?? 0, currency));
      const tax = Number(item?.tax_rate || 0);
      const amount = escapeHtml(formatMoney(item?.amount || 0, currency));

      return `
        <tr>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;color:#64748b;">${index + 1}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;">
            <div style="font-weight:700;color:#0f172a;">${name}</div>
            ${description ? `<div style="margin-top:4px;color:#64748b;font-size:12px;line-height:1.45;">${description}</div>` : ""}
          </td>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${quantity}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${rate}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${tax ? `${tax}%` : "0%"}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;">${amount}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:13px;">
      <thead>
        <tr style="background:#f8fafc;color:#475569;">
          <th style="padding:10px;text-align:left;width:42px;">#</th>
          <th style="padding:10px;text-align:left;">Ítem</th>
          <th style="padding:10px;text-align:right;">Cant.</th>
          <th style="padding:10px;text-align:right;">Tarifa</th>
          <th style="padding:10px;text-align:right;">Imp.</th>
          <th style="padding:10px;text-align:right;">Importe</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildMergeFields(proposal: any, items: any[]) {
  const data =
    proposal?.proposal_data && typeof proposal.proposal_data === "object"
      ? proposal.proposal_data
      : {};
  const currency = String(proposal?.currency || "USD");
  const clientName =
    proposal?.recipient_name ||
    getClientValue(proposal, "company_name") ||
    getClientValue(proposal, "contact_person") ||
    data?.companyName ||
    data?.clientName ||
    "Cliente";

  return {
    proposal_number: proposal?.number || "PROP",
    proposal_title: proposal?.title || "Propuesta comercial",
    proposal_status: proposal?.status || "Borrador",
    proposal_date: proposal?.proposal_date || proposal?.created_at || "",
    valid_until: proposal?.valid_until || "",
    proposal_description: proposal?.description || data?.serviceDescription || "",
    proposal_content:
      data?.customContent ||
      data?.introductionText ||
      data?.objectiveText ||
      proposal?.notes ||
      proposal?.description ||
      "",
    proposal_items: renderItemsTable(items, currency),
    proposal_subtotal: formatMoney(proposal?.subtotal ?? proposal?.amount ?? 0, currency),
    proposal_tax_total: formatMoney(proposal?.tax_total ?? 0, currency),
    proposal_total: formatMoney(proposal?.total ?? proposal?.amount ?? 0, currency),
    client_name: clientName,
    client_email: proposal?.recipient_email || getClientValue(proposal, "email"),
    client_phone: proposal?.recipient_phone || getClientValue(proposal, "phone"),
    client_address: proposal?.recipient_address || "",
    company_name: "Corevix Agency",
    company_email: "corevix.rd@gmail.com",
  } as Record<string, string>;
}

export function renderProposalTemplateHtml(proposal: any, items: any[]) {
  const fields = buildMergeFields(proposal, items);
  let html = String(proposal?.content || "");

  Object.entries(fields).forEach(([key, value]) => {
    const replacement = key === "proposal_items" ? value : escapeHtml(value);
    html = html.replace(new RegExp(`\\{${key}\\}`, "g"), replacement);
  });

  return sanitizeTemplateHtml(html);
}
