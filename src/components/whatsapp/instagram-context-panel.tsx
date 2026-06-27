import { cn } from "@/lib/utils";
import type { MetaConversationListRow } from "@/lib/meta/view-types";
import { WhatsappAvatar } from "@/components/whatsapp/whatsapp-avatar";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white px-3.5 py-3 shadow-sm">
      <div className="text-[11px] uppercase tracking-[0.08em] text-slate-400">{label}</div>
      <div className="mt-1 text-[13px] text-slate-900 break-words">{value || "—"}</div>
    </div>
  );
}

export function InstagramContextPanel({
  conversation,
  className,
}: {
  conversation: MetaConversationListRow | null;
  className?: string;
}) {
  const name = conversation?.sender_name || "Usuario de Instagram";
  return (
    <aside
      className={cn("min-h-0 border-l border-black/10 bg-[#f0f2f5] overflow-y-auto p-4", className)}
    >
      <div className="space-y-3">
        <div className="rounded-2xl border border-black/5 bg-white px-4 py-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-[0.08em]">
            Contexto
          </div>
          <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.03em] text-slate-900">
            Instagram
          </h3>
          <p className="mt-1 text-sm text-slate-500">Vista de solo lectura por ahora.</p>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-black/5 bg-white px-3.5 py-3 shadow-sm flex items-center gap-3">
            <div className="shrink-0">
              <WhatsappAvatar
                name={name}
                imageUrl={conversation?.sender_profile_pic || null}
                size={44}
              />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.08em] text-slate-400">
                Remitente
              </div>
              <div className="mt-0.5 text-[13px] text-slate-900 truncate">{name}</div>
            </div>
          </div>

          <Field label="Canal" value="Instagram" />
          <Field label="Estado" value={conversation?.status || null} />
          <Field label="Último mensaje" value={conversation?.last_message_text || null} />
          <Field label="Usuario externo" value={conversation?.external_user_id || null} />
          <Field label="Prospecto vinculado" value={conversation?.linked_lead_id || null} />
          <Field label="Cliente vinculado" value={conversation?.linked_client_id || null} />
          <Field label="Oportunidad vinculada" value={conversation?.linked_deal_id || null} />
          <Field label="Asignado a" value={conversation?.assigned_to || null} />
        </div>
      </div>
    </aside>
  );
}
