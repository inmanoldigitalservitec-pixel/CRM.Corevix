export type AgentActionRiskLevel = "read" | "low_write" | "medium_write" | "sensitive";

type AnyRecord = Record<string, any>;

export type AgentResolveIntentRequest = {
	case_key?: string | null;
	case_type?: string | null;
	case_title?: string | null;
	case_summary?: string | null;
	user_instruction?: string | null;
	selected_action?: AnyRecord | null;
	suggested_actions?: AnyRecord[];
	source_records?: AnyRecord[];
	context_refs?: AnyRecord | null;
	values?: Record<string, string>;
	plan?: AnyRecord | null;
};

export type AgentResolvedFieldQuestion = {
	field: string;
	label: string;
	question: string;
	input_type: "text" | "date" | "textarea";
	required: boolean;
};

export type AgentResolvedActionIntent = {
	schema_version: "agent_action_intent_v1";
	status: "needs_fields" | "ready";
	execution_ready: boolean;
	case_key: string;
	case_title: string;
	agent_message: string;
	intent: {
		action_id?: string | null;
		type: string;
		label: string;
		reason?: string | null;
		module?: string | null;
		tool_hint?: string | null;
		risk_level: AgentActionRiskLevel;
		requires_confirmation: boolean;
		required_fields: string[];
		target?: AnyRecord | null;
		payload: AnyRecord;
		user_instruction?: string | null;
	};
	values: Record<string, string>;
	missing_fields: string[];
	field_questions: AgentResolvedFieldQuestion[];
	confirmation_summary: {
		title: string;
		message: string;
		lines: string[];
	};
};

const ALLOWED_RISK_LEVELS = new Set(["read", "low_write", "medium_write", "sensitive"]);

function cleanText(value: unknown, fallback = "") {
	const text = String(value ?? "").trim();
	return text || fallback;
}

function normalizeRiskLevel(value: unknown): AgentActionRiskLevel {
	const text = cleanText(value, "medium_write");
	return ALLOWED_RISK_LEVELS.has(text) ? (text as AgentActionRiskLevel) : "medium_write";
}

function normalizeRequiredFieldName(field: string, action?: AnyRecord) {
	const raw = cleanText(field);
	const normalized = raw.toLowerCase().trim();
	const actionText = [
		action?.type,
		action?.label,
		action?.tool_hint,
		action?.reason,
	].map((item) => cleanText(item).toLowerCase()).join(" ");

	if (!raw) return "";

	if (
		normalized === "contact phone" ||
		normalized === "contact_phone" ||
		normalized.includes("telefono") ||
		normalized.includes("teléfono") ||
		normalized.includes("phone")
	) {
		return "contact_phone";
	}

	if (
		normalized === "time slot" ||
		normalized === "time_slot" ||
		normalized.includes("horario") ||
		normalized.includes("hora")
	) {
		return "time_slot";
	}

	if (
		normalized.includes("fecha") ||
		normalized.includes("due date") ||
		normalized.includes("delivery date")
	) {
		if (
			actionText.includes("cerrar") ||
			actionText.includes("resuelta") ||
			actionText.includes("resolved") ||
			actionText.includes("complete_task")
		) {
			return "closure_confirmation";
		}

		return "new_due_date";
	}

	if (
		normalized.includes("confirmación de cierre") ||
		normalized.includes("confirmacion de cierre") ||
		normalized.includes("confirm close") ||
		normalized.includes("closure")
	) {
		return "closure_confirmation";
	}

	return raw.replace(/\s+/g, "_").toLowerCase();
}

function humanToolLabel(toolHint: unknown, action?: AnyRecord) {
	const tool = cleanText(toolHint).toLowerCase();
	const actionText = [
		action?.type,
		action?.label,
		action?.reason,
	].map((item) => cleanText(item).toLowerCase()).join(" ");

	if (tool === "complete_task") return "Completar tarea";
	if (tool === "reschedule_task") return "Reprogramar tarea";
	if (tool === "get_record_by_id") return "Consultar registro";
	if (tool === "get_task_by_id") return "Consultar tarea";
	if (tool === "create_task") return "Crear tarea";
	if (tool === "draft_email") return "Preparar correo";
	if (tool === "prepare_followup_message") return "Preparar seguimiento";
	if (tool === "prepare_collection_followup") return "Preparar seguimiento de cobro";

	if (actionText.includes("revisar") && actionText.includes("tarea")) return "Consultar tarea";
	if (actionText.includes("estado") && actionText.includes("tarea")) return "Consultar tarea";
	if (actionText.includes("cerrar") || actionText.includes("resuelta")) return "Completar tarea";
	if (actionText.includes("mover") || actionText.includes("reprogram")) return "Reprogramar tarea";
	if (actionText.includes("factura") || actionText.includes("cobro")) return "Preparar seguimiento de cobro";

	return "Herramienta de Autopilot";
}

function humanFieldLabel(field: string) {
	const normalized = field.toLowerCase();

	const labels: Record<string, string> = {
		client_id: "cliente",
		lead_id: "prospecto",
		task_id: "tarea",
		project_id: "proyecto",
		invoice_id: "factura",
		proposal_id: "propuesta",
		assignee_id: "responsable",
		owner_id: "responsable",
		responsible_id: "responsable",
		new_due_date: "nueva fecha",
		due_at: "fecha",
		dueat: "fecha",
		message: "mensaje",
		body: "mensaje",
		amount: "monto",
		reason: "razón",
	};

	return labels[normalized] || field.replace(/_/g, " ");
}

function questionForField(field: string, actionLabel: string): AgentResolvedFieldQuestion {
	const normalized = field.toLowerCase();
	const label = humanFieldLabel(field);

	if (normalized === "new_due_date" || normalized === "due_at" || normalized === "dueat") {
		return {
			field,
			label,
			question: `¿Para qué fecha quieres mover "${actionLabel}"?`,
			input_type: "date",
			required: true,
		};
	}

	if (normalized === "closure_confirmation" || normalized === "close_confirmation") {
		return {
			field,
			label,
			question: `¿Confirmas que quieres cerrar "${actionLabel}" como resuelta?`,
			input_type: "text",
			required: true,
		};
	}

	if (normalized === "message" || normalized === "body") {
		return {
			field,
			label,
			question: "¿Qué mensaje quieres que prepare Autopilot?",
			input_type: "textarea",
			required: true,
		};
	}

	if (normalized === "reason") {
		return {
			field,
			label,
			question: "¿Qué razón o nota quieres dejar para esta acción?",
			input_type: "textarea",
			required: true,
		};
	}

	if (normalized.endsWith("_id")) {
		return {
			field,
			label,
			question: `Necesito confirmar el ${label} para continuar.`,
			input_type: "text",
			required: true,
		};
	}

	return {
		field,
		label,
		question: `Falta ${label}. ¿Qué valor debo usar?`,
		input_type: "text",
		required: true,
	};
}

function payloadValue(action: AnyRecord, field: string) {
	const value = action?.payload?.[field];
	if (value === null || value === undefined) return "";
	return String(value).trim();
}

function targetValue(action: AnyRecord, field: string) {
	const normalized = field.toLowerCase();
	const target = action?.target || {};
	const targetType = cleanText(target.type).toLowerCase();
	const targetId = cleanText(target.id);

	if (!targetId) return "";

	if (normalized === "target_id") return targetId;
	if (normalized === "client_id" && targetType === "client") return targetId;
	if (normalized === "lead_id" && targetType === "lead") return targetId;
	if (normalized === "task_id" && targetType === "task") return targetId;
	if (normalized === "project_id" && targetType === "project") return targetId;
	if (normalized === "invoice_id" && targetType === "invoice") return targetId;
	if (normalized === "proposal_id" && targetType === "proposal") return targetId;

	return "";
}

function sourceRecordValue(sourceRecords: AnyRecord[], field: string) {
	const normalized = field.toLowerCase();

	const wantedType =
		normalized === "client_id"
			? "client"
			: normalized === "lead_id"
				? "lead"
				: normalized === "task_id"
					? "task"
					: normalized === "project_id"
						? "project"
						: normalized === "invoice_id"
							? "invoice"
							: normalized === "proposal_id"
								? "proposal"
								: "";

	if (!wantedType) return "";

	const found = sourceRecords.find((record) => {
		const type = cleanText(record?.type).toLowerCase();
		const moduleName = cleanText(record?.module).toLowerCase();

		return type === wantedType || moduleName === wantedType || moduleName === `${wantedType}s`;
	});

	return cleanText(found?.id);
}


function formatDateKey(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function nextWeekday(targetDay: number) {
	const today = new Date();
	const currentDay = today.getDay();
	let diff = targetDay - currentDay;

	if (diff <= 0) diff += 7;

	return formatDateKey(addDays(today, diff));
}

function normalizeInstructionText(value: string) {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/ñ/g, "n")
		.trim();
}

function inferDateFromInstruction(userInstruction: string) {
	const originalText = cleanText(userInstruction);
	const text = normalizeInstructionText(originalText);

	const explicitDate = originalText.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
	if (explicitDate?.[1]) return explicitDate[1];

	if (/\bpasado\s+manana\b/.test(text)) {
		return formatDateKey(addDays(new Date(), 2));
	}

	if (/\bmanana\b/.test(text)) {
		return formatDateKey(addDays(new Date(), 1));
	}

	if (/\bhoy\b/.test(text)) {
		return formatDateKey(new Date());
	}

	const weekdays: Array<[RegExp, number]> = [
		[/\b(proximo\s+domingo|el\s+domingo|domingo)\b/, 0],
		[/\b(proximo\s+lunes|el\s+lunes|lunes)\b/, 1],
		[/\b(proximo\s+martes|el\s+martes|martes)\b/, 2],
		[/\b(proximo\s+miercoles|el\s+miercoles|miercoles)\b/, 3],
		[/\b(proximo\s+jueves|el\s+jueves|jueves)\b/, 4],
		[/\b(proximo\s+viernes|el\s+viernes|viernes)\b/, 5],
		[/\b(proximo\s+sabado|el\s+sabado|sabado)\b/, 6],
	];

	for (const [pattern, day] of weekdays) {
		if (pattern.test(text)) return nextWeekday(day);
	}

	return "";
}

function inferPhoneFromInstruction(userInstruction: string) {
	const match = userInstruction.match(/(?:\+?1\s*)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/);
	return match?.[0]?.trim() || "";
}

function inferTimeFromInstruction(userInstruction: string) {
	const text = normalizeInstructionText(userInstruction);

	const exactTime = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
	if (exactTime?.[0]) return exactTime[0];

	const meridian = text.match(/\b(1[0-2]|0?\d)(?::([0-5]\d))?\s*(am|pm|a\.m\.|p\.m\.|a\s*m|p\s*m)\b/);
	if (meridian?.[0]) return meridian[0].replace(/\s+/g, " ").trim();

	if (text.includes("en la manana") || text.includes("por la manana")) return "mañana";
	if (text.includes("en la tarde") || text.includes("por la tarde")) return "tarde";
	if (text.includes("en la noche") || text.includes("por la noche")) return "noche";

	return "";
}

function inferValueFromInstruction(field: string, userInstruction: string) {
	const normalized = field.toLowerCase();

	if (
		normalized === "new_due_date" ||
		normalized === "due_at" ||
		normalized === "dueat" ||
		normalized === "date"
	) {
		return inferDateFromInstruction(userInstruction);
	}

	if (
		normalized === "contact_phone" ||
		normalized === "contactphone" ||
		normalized === "phone" ||
		normalized === "telephone"
	) {
		return inferPhoneFromInstruction(userInstruction);
	}

	if (
		normalized === "time_slot" ||
		normalized === "timeslot" ||
		normalized === "appointment_time" ||
		normalized === "time"
	) {
		return inferTimeFromInstruction(userInstruction);
	}

	return "";
}

function inferRequiredFields(action: AnyRecord, userInstruction: string) {
	const existing = Array.isArray(action?.required_fields)
		? action.required_fields
				.map((field: unknown) => normalizeRequiredFieldName(cleanText(field), action))
				.filter(Boolean)
		: [];

	const type = cleanText(action?.type).toLowerCase();
	const tool = cleanText(action?.tool_hint).toLowerCase();
	const text = userInstruction.toLowerCase();

	const fields = new Set(existing);

	if ((type === "move_due_date" || tool === "reschedule_task" || text.includes("mover") || text.includes("reprogram")) && !action?.payload?.new_due_date) {
		fields.add("new_due_date");
	}

	if ((type === "draft_email" || type === "send_reminder" || tool.includes("message")) && !action?.payload?.message) {
		fields.add("message");
	}

	return Array.from(fields);
}

function selectAction(input: AgentResolveIntentRequest) {
	const userInstruction = cleanText(input.user_instruction);
	const selectedAction = input.selected_action || null;

	if (selectedAction) {
		return selectedAction;
	}

	const actions = Array.isArray(input.suggested_actions) ? input.suggested_actions : [];
	if (actions.length > 0) {
		return actions[0];
	}

	if (userInstruction) {
		return {
			action_id: "custom_instruction",
			type: "custom_instruction",
			label: userInstruction,
			reason: `Instrucción escrita por el usuario: ${userInstruction}`,
			requires_confirmation: true,
			risk_level: "medium_write",
			required_fields: [],
			tool_hint: "custom_instruction",
			payload: {
				user_instruction: userInstruction,
			},
		};
	}

	return null;
}

function inferToolHint(action: AnyRecord) {
	const type = cleanText(action?.type).toLowerCase();
	const existingTool = cleanText(action?.tool_hint).toLowerCase();
	const label = cleanText(action?.label).toLowerCase();
	const reason = cleanText(action?.reason).toLowerCase();
	const actionText = `${type} ${label} ${reason}`;

	if (existingTool && existingTool !== "custom_instruction") return existingTool;

	if (type === "mark_resolved" || actionText.includes("marcar como resuelta") || actionText.includes("cerrar")) {
		return "complete_task";
	}

	if (type === "move_due_date" || actionText.includes("mover fecha") || actionText.includes("reprogram")) {
		return "reschedule_task";
	}

	if (
		type === "review_record" ||
		actionText.includes("revisar estado") ||
		actionText.includes("revisar tarea") ||
		actionText.includes("consultar tarea")
	) {
		return "get_task_by_id";
	}

	if (type === "create_task" || actionText.includes("crear tarea")) return "create_task";
	if (type === "draft_email") return "draft_email";
	if (type === "send_reminder") return "prepare_followup_message";
	if (actionText.includes("factura") || actionText.includes("cobro")) return "prepare_collection_followup";

	return "get_record_by_id";
}

export function resolveAgentActionIntent(input: AgentResolveIntentRequest): AgentResolvedActionIntent {
	const selectedAction = selectAction(input);
	const userInstruction = cleanText(input.user_instruction);
	const plan = input.plan || {};
	const sourceRecords = Array.isArray(input.source_records)
		? input.source_records
		: Array.isArray(plan.source_records)
			? plan.source_records
			: [];

	const caseKey = cleanText(input.case_key || plan.case_key, "unknown_case");
	const caseTitle = cleanText(input.case_title || plan.title || plan.plan_title, "Caso detectado");

	if (!selectedAction) {
		return {
			schema_version: "agent_action_intent_v1",
			status: "needs_fields",
			execution_ready: false,
			case_key: caseKey,
			case_title: caseTitle,
			agent_message: "Necesito que selecciones una acción o escribas qué quieres que haga Autopilot.",
			intent: {
				type: "unknown",
				label: "Sin acción",
				risk_level: "read",
				requires_confirmation: true,
				required_fields: [],
				tool_hint: null,
				payload: {},
			},
			values: input.values || {},
			missing_fields: ["user_instruction"],
			field_questions: [
				{
					field: "user_instruction",
					label: "instrucción",
					question: "¿Qué quieres que haga Autopilot con este caso?",
					input_type: "textarea",
					required: true,
				},
			],
			confirmation_summary: {
				title: "Falta intención",
				message: "Autopilot necesita una instrucción antes de continuar.",
				lines: ["No hay acción seleccionada."],
			},
		};
	}

	const actionLabel = cleanText(
		userInstruction || selectedAction.label || selectedAction.type,
		"Acción de Autopilot",
	);

	const requiredFields = inferRequiredFields(selectedAction, userInstruction);
	const values = {
		...(input.values || {}),
	};

	for (const field of requiredFields) {
		if (values[field]) continue;

		const value =
			payloadValue(selectedAction, field) ||
			targetValue(selectedAction, field) ||
			sourceRecordValue(sourceRecords, field) ||
			inferValueFromInstruction(field, userInstruction);

		if (value) {
			values[field] = value;
		}
	}

	const missingFields = requiredFields.filter((field) => !cleanText(values[field]));
	const fieldQuestions = missingFields.map((field) => questionForField(field, actionLabel));

	const toolHint = inferToolHint(selectedAction);
	const riskLevel = normalizeRiskLevel(selectedAction.risk_level);

	const payload = {
		...(selectedAction.payload || {}),
		...values,
		...(userInstruction ? { user_instruction: userInstruction } : {}),
	};

	const lines = [
		`Caso: ${caseTitle}`,
		`Acción: ${actionLabel}`,
		`Herramienta candidata: ${humanToolLabel(toolHint, selectedAction)}`,
		`Riesgo: ${riskLevel}`,
		...requiredFields.map((field) => `${humanFieldLabel(field)}: ${values[field] || "pendiente"}`),
	];

	const ready = missingFields.length === 0;

	return {
		schema_version: "agent_action_intent_v1",
		status: ready ? "ready" : "needs_fields",
		execution_ready: ready,
		case_key: caseKey,
		case_title: caseTitle,
		agent_message: ready
			? "Tengo la información necesaria. Revisa y confirma la intención antes de continuar."
			: fieldQuestions[0]?.question || "Necesito un dato adicional para continuar.",
		intent: {
			action_id: selectedAction.action_id || selectedAction.id || null,
			type: cleanText(selectedAction.type, "custom_instruction"),
			label: actionLabel,
			reason: userInstruction
				? `Instrucción escrita por el usuario: ${userInstruction}`
				: selectedAction.reason || null,
			module: selectedAction.module || plan.case_type || null,
			tool_hint: toolHint,
			risk_level: riskLevel,
			requires_confirmation: selectedAction.requires_confirmation !== false,
			required_fields: requiredFields,
			target: selectedAction.target || null,
			payload,
			user_instruction: userInstruction || null,
		},
		values,
		missing_fields: missingFields,
		field_questions: fieldQuestions,
		confirmation_summary: {
			title: ready ? "Intención lista para confirmar" : "Faltan datos",
			message: ready
				? `Autopilot propone continuar con: ${actionLabel}. Herramienta: ${humanToolLabel(toolHint, selectedAction)}.`
				: "Autopilot necesita completar campos antes de confirmar.",
			lines,
		},
	};
}
