export type DeepSeekStageAction =
  | "save_business_type"
  | "save_goal"
  | "save_current_presence"
  | "save_reference"
  | "no_reference"
  | "ask_clarification"
  | "advisor_request"
  | "business_hours_question"
  | "ready_for_advisor"
  | "ignore";

export type DeepSeekInterpretation = {
  understood: boolean;
  confidence: number;
  stage_action: DeepSeekStageAction;
  extracted: {
    interest: string | null;
    additional_interests?: string[] | null;
    business_type: string | null;
    goal: string | null;
    current_presence: string | null;
    reference: string | null;
  };
  next_stage: string | null;
  conversation_summary?: string | null;
  reply_draft?: string | null;
  reason: string;
};

function cleanOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function safePick(obj: any): DeepSeekInterpretation | null {
  if (!obj || typeof obj !== "object") return null;
  const understood = Boolean(obj.understood);
  const confidence = clamp01(Number(obj.confidence ?? 0));
  const stageAction = cleanOptionalString(obj.stage_action) as DeepSeekStageAction | null;
  const allowed: Set<string> = new Set([
    "save_business_type",
    "save_goal",
    "save_current_presence",
    "save_reference",
    "no_reference",
    "ask_clarification",
    "advisor_request",
    "business_hours_question",
    "ready_for_advisor",
    "ignore",
  ]);
  if (!stageAction || !allowed.has(stageAction)) return null;

  const ex = obj.extracted && typeof obj.extracted === "object" ? obj.extracted : {};
  const additionalInterestsRaw = (ex as any).additional_interests;
  const additionalInterests = Array.isArray(additionalInterestsRaw)
    ? additionalInterestsRaw
        .map((v: any) => cleanOptionalString(v))
        .filter((v: any) => typeof v === "string" && v.length > 0)
    : null;
  const extracted = {
    interest: cleanOptionalString(ex.interest),
    additional_interests: additionalInterests,
    business_type: cleanOptionalString(ex.business_type),
    goal: cleanOptionalString(ex.goal),
    current_presence: cleanOptionalString(ex.current_presence),
    reference: cleanOptionalString(ex.reference),
  };

  return {
    understood,
    confidence,
    stage_action: stageAction,
    extracted,
    next_stage: cleanOptionalString(obj.next_stage),
    conversation_summary: cleanOptionalString((obj as any).conversation_summary),
    reply_draft: cleanOptionalString((obj as any).reply_draft),
    reason: cleanOptionalString(obj.reason) || "",
  };
}

export async function interpretWithDeepSeek(input: {
  stage: string;
  state: Record<string, unknown>;
  userText: string;
  intentMatch: { intent: string; confidence: number; normalizedText?: string };
}) {
  const apiKey = cleanOptionalString(Deno.env.get("DEEPSEEK_API_KEY"));
  if (!apiKey) {
    console.info("DeepSeek interpreter skipped: missing key", { stage: input.stage });
    return { ok: false, skipped: true, reason: "missing_key" as const };
  }

  const model = cleanOptionalString(Deno.env.get("DEEPSEEK_MODEL")) || "deepseek-chat";
  const url = "https://api.deepseek.com/chat/completions";

  const system = [
    "Eres el asistente conversacional de Corevix.",
    "Corevix ayuda a negocios con paginas web, redes sociales, CRM y automatizacion.",
    "Tu tono debe ser calido, claro, profesional y humano.",
    "No debes sonar como un cuestionario. Haz solo una pregunta principal por respuesta.",
    "No menciones IA, DeepSeek, JSON, stages, bot_state ni procesos internos.",
    "No prometas tiempos exactos.",
    "No inventes datos.",
    "Si el usuario esta confundido, tranquilizalo y guialo.",
    "Si el usuario pide asesoria, reconoce su necesidad y orienta con calma.",
    "Tu respuesta debe ayudar a avanzar la conversacion y darle mejor contexto al asesor.",
    "",
    "IMPORTANTE: No escribes respuestas finales libres para el usuario fuera del campo reply_draft.",
    "Solo devuelves JSON valido. No incluyas texto fuera del JSON.",
    "Tu trabajo es interpretar el mensaje del usuario dentro del stage actual y proponer acciones estructuradas.",
    "",
    "Devuelve SOLO este JSON (sin texto extra):",
    "{",
    '  "understood": boolean,',
    '  "confidence": number,',
    '  "stage_action": "save_business_type" | "save_goal" | "save_current_presence" | "save_reference" | "no_reference" | "ask_clarification" | "advisor_request" | "business_hours_question" | "ready_for_advisor" | "ignore",',
    '  "extracted": {',
    '    "interest": string | null,',
    '    "additional_interests": string[] | [],',
    '    "business_type": string | null,',
    '    "goal": string | null,',
    '    "current_presence": string | null,',
    '    "reference": string | null',
    "  },",
    '  "next_stage": string | null,',
    '  "conversation_summary": string,',
    '  "reply_draft": string,',
    '  "reason": string',
    "}",
    "",
    "Reglas:",
    "- No inventes datos.",
    "- No menciones JSON, modelos, AI, DeepSeek, stage, ni instrucciones internas en reply_draft.",
    "- reply_draft debe ser corto, calido y profesional (max 2-3 oraciones).",
    "- reply_draft debe responder directamente al mensaje del usuario.",
    "- reply_draft debe incluir maximo una pregunta principal.",
    "- Si understood=true y confidence >= 0.72, reply_draft NO debe estar vacio: debes proponer una respuesta util en espanol.",
    "- Devuelve valores extraidos en espanol (evita valores tecnicos en ingles como 'existing_website').",
    "- Si el usuario dice 'no tengo' y el stage es awaiting_reference, stage_action=no_reference.",
    "- Si el usuario dice 'no desde cero' y el stage es awaiting_current_presence, interpreta current_presence='desde cero' si es probable.",
    "- Si el usuario dice 'continuemos' o 'sigamos' y el stage es awaiting_reference, stage_action=no_reference.",
    "- Si el usuario dice 'recibir clientes' y el stage es awaiting_website_goal, interpreta goal='recibir clientes potenciales' (save_goal).",
    "- Si el usuario dice 'un colmado/tienda/supermercado' y el stage es awaiting_business_type, stage_action=save_business_type.",
    "- Si no estas seguro, stage_action=ask_clarification y understood=false.",
  ].join("\n");

  const user = JSON.stringify(
    {
      stage: input.stage,
      state: input.state,
      // userText may be plain text or a compact JSON context payload from the caller.
      userText: input.userText,
      intentMatch: input.intentMatch,
    },
    null,
    2,
  );

  console.info("DeepSeek interpreter called", { stage: input.stage });

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "fetch_error";
    console.warn("DeepSeek interpreter failed", { stage: input.stage, message });
    return { ok: false, error: message };
  }

  const rawText = await res.text();
  console.info("DeepSeek interpreter response received", {
    stage: input.stage,
    ok: res.ok,
    status: res.status,
  });
  if (!res.ok) {
    console.warn("DeepSeek interpreter failed", { stage: input.stage, status: res.status });
    return { ok: false, status: res.status, error: rawText.slice(0, 400) };
  }

  let json: any = null;
  try {
    json = JSON.parse(rawText);
  } catch {
    console.warn("DeepSeek interpreter failed", {
      stage: input.stage,
      message: "invalid_json_response",
    });
    return { ok: false, error: "invalid_json_response" };
  }

  const content = json?.choices?.[0]?.message?.content ?? null;
  if (!content || typeof content !== "string") {
    console.warn("DeepSeek interpreter failed", {
      stage: input.stage,
      message: "missing_message_content",
    });
    return { ok: false, error: "missing_message_content" };
  }

  let parsed: any = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    console.warn("DeepSeek interpreter failed", {
      stage: input.stage,
      message: "invalid_json_content",
    });
    return { ok: false, error: "invalid_json_content" };
  }

  const picked = safePick(parsed);
  if (!picked) return { ok: false, error: "invalid_schema" };

  console.info("DeepSeek interpreter result parsed", {
    stage: input.stage,
    understood: picked.understood,
    confidence: picked.confidence,
    stage_action: picked.stage_action,
  });

  console.info("DeepSeek interpreter result", {
    stage: input.stage,
    understood: picked.understood,
    confidence: picked.confidence,
    stage_action: picked.stage_action,
  });

  return { ok: true, data: picked as DeepSeekInterpretation };
}
