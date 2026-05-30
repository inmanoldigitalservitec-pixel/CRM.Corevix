type BotSendResponse = {
  ok?: boolean;
  success?: boolean;
  message?: unknown;
  error?: unknown;
  [key: string]: unknown;
};

function getBotBaseUrl() {
  const base = String(import.meta.env.VITE_WHATSAPP_BOT_API_URL ?? "").trim();
  if (!base) throw new Error("Falta configurar VITE_WHATSAPP_BOT_API_URL");
  return base.replace(/\/+$/, "");
}

async function readErrorPayload(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      return (await res.json()) as unknown;
    }
    return await res.text();
  } catch {
    return null;
  }
}

export async function sendWhatsappMessage(conversationId: string, content: string) {
  const trimmed = String(content ?? "").trim();
  if (!trimmed) throw new Error("El mensaje no puede estar vacío");
  const baseUrl = getBotBaseUrl();

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/crm/whatsapp/send-message`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId, content: trimmed }),
    });
  } catch (err: any) {
    throw new Error(`No se pudo conectar con el BOT. ${err?.message ?? ""}`.trim());
  }

  if (!res.ok) {
    const payload = await readErrorPayload(res);
    if (payload && typeof payload === "object" && "message" in (payload as any)) {
      throw new Error(String((payload as any).message));
    }
    if (typeof payload === "string" && payload.trim()) {
      throw new Error(payload.trim());
    }
    throw new Error(`Error del BOT (${res.status}) al enviar mensaje`);
  }

  try {
    const json = (await res.json()) as BotSendResponse;
    if (typeof json === "object" && json) {
      if ("ok" in json && json.ok !== true) {
        throw new Error("El BOT respondió ok=false");
      }
      if ("success" in json && json.success !== true) {
        throw new Error("El BOT respondió success=false");
      }
    }
    return json;
  } catch {
    return { ok: true } as BotSendResponse;
  }
}
