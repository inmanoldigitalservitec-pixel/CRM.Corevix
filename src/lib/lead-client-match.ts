export type LeadContact = {
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

export type ClientContact = LeadContact & { id: string };

export type ClientContactMatch = {
  client: ClientContact;
  reasons: Array<"email" | "phone" | "whatsapp">;
};

export function normalizeContactEmail(email?: string | null) {
  return email?.trim().toLocaleLowerCase() || "";
}

export function normalizeContactPhone(phone?: string | null) {
  return phone?.replace(/\D/g, "") || "";
}

function contactPhonesMatch(first: string, second: string) {
  if (first === second) return true;
  const firstNational = first.length === 11 && first.startsWith("1") ? first.slice(1) : first;
  const secondNational = second.length === 11 && second.startsWith("1") ? second.slice(1) : second;
  return firstNational === secondNational;
}

export function findLeadClientMatches<T extends ClientContact>(
  lead: LeadContact,
  clients: T[],
): Array<{ client: T; reasons: ClientContactMatch["reasons"] }> {
  const leadEmail = normalizeContactEmail(lead.email);
  const leadPhones = new Set(
    [lead.phone, lead.whatsapp].map(normalizeContactPhone).filter(Boolean),
  );

  return clients.flatMap((client) => {
    const reasons: ClientContactMatch["reasons"] = [];
    if (leadEmail && normalizeContactEmail(client.email) === leadEmail) {
      reasons.push("email");
    }

    const clientPhone = normalizeContactPhone(client.phone);
    const clientWhatsapp = normalizeContactPhone(client.whatsapp);
    if (clientPhone && [...leadPhones].some((phone) => contactPhonesMatch(phone, clientPhone))) {
      reasons.push("phone");
    }
    if (
      clientWhatsapp &&
      [...leadPhones].some((phone) => contactPhonesMatch(phone, clientWhatsapp))
    ) {
      reasons.push("whatsapp");
    }

    return reasons.length ? [{ client, reasons }] : [];
  });
}
