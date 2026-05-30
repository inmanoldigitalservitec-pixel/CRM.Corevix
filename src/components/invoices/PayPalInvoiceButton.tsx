import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    paypal?: any;
  }
}

type PayPalInvoiceButtonProps = {
  publicToken?: string | null;
  disabled?: boolean;
  onPaid?: () => void;
};

function getFunctionsBaseUrl() {
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  return `${supabaseUrl}/functions/v1`;
}

function loadPayPalSdk(clientId: string, currency = "USD") {
  return new Promise<void>((resolve, reject) => {
    if (window.paypal) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>("script[data-paypal-sdk='true']");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar PayPal.")));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture`;
    script.async = true;
    script.dataset.paypalSdk = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar PayPal."));
    document.body.appendChild(script);
  });
}

export function PayPalInvoiceButton({ publicToken, disabled, onPaid }: PayPalInvoiceButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const clientId = String(import.meta.env.VITE_PAYPAL_CLIENT_ID || "").trim();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!publicToken || disabled || !containerRef.current) return;

      if (!clientId) {
        setError("Falta VITE_PAYPAL_CLIENT_ID.");
        return;
      }

      if (renderedRef.current) return;
      renderedRef.current = true;

      try {
        await loadPayPalSdk(clientId, "USD");

        if (cancelled || !containerRef.current || !window.paypal) return;

        window.paypal
          .Buttons({
            style: {
              layout: "vertical",
              color: "gold",
              shape: "rect",
              label: "paypal",
              height: 45,
            },

            createOrder: async () => {
              const res = await fetch(`${getFunctionsBaseUrl()}/paypal-create-order`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ publicToken }),
              });

              const json = await res.json();

              if (!res.ok) {
                throw new Error(json?.error || "No se pudo crear la orden PayPal.");
              }

              return json.id;
            },

            onApprove: async (data: any) => {
              const res = await fetch(`${getFunctionsBaseUrl()}/paypal-capture-order`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  publicToken,
                  orderID: data.orderID,
                }),
              });

              const json = await res.json();

              if (!res.ok) {
                throw new Error(json?.error || "No se pudo capturar el pago.");
              }

              onPaid?.();
            },

            onError: (err: any) => {
              console.error("PayPal error:", err);
              setError("No se pudo procesar el pago con PayPal.");
            },
          })
          .render(containerRef.current);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "No se pudo cargar PayPal.");
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [clientId, disabled, onPaid, publicToken]);

  if (!clientId) {
    return (
      <button
        type="button"
        onClick={() => window.alert("PayPal todavía no está conectado. Falta VITE_PAYPAL_CLIENT_ID.")}
        className="inline-flex h-12 min-w-[170px] items-center justify-center rounded-[14px] bg-[#ffc439] px-5 shadow-[0_14px_28px_rgba(255,196,57,0.30)]"
      >
        <img
          src="https://www.paypalobjects.com/paypal-ui/logos/svg/paypal-color.svg"
          alt="Pagar con PayPal"
          className="h-6 w-auto object-contain"
        />
      </button>
    );
  }

  return (
    <div className="min-w-[170px]">
      <div ref={containerRef} />
      {error ? <div className="mt-2 text-[11px] font-semibold text-red-600">{error}</div> : null}
    </div>
  );
}
