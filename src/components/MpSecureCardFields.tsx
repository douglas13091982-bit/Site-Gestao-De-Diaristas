import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, opts?: Record<string, unknown>) => MpInstance;
  }
}

type MpField = {
  mount: (id: string) => MpField;
  unmount: () => void;
  on: (event: string, cb: (data: { bin?: string }) => void) => void;
};
type MpInstance = {
  fields: {
    create: (type: string, opts?: Record<string, unknown>) => MpField;
    createCardToken: (opts: {
      cardholderName: string;
      identificationType: string;
      identificationNumber: string;
    }) => Promise<{ id?: string; first_six_digits?: string }>;
  };
  getPaymentMethods: (opts: { bin: string }) => Promise<{ results?: Array<{ id: string }> }>;
};

async function ensureSdk(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.MercadoPago) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://sdk.mercadopago.com/js/v2"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("SDK do Mercado Pago falhou")));
      if (window.MercadoPago) resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://sdk.mercadopago.com/js/v2";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("SDK do Mercado Pago falhou"));
    document.head.appendChild(s);
  });
}

export type MpTokenizeResult = {
  token: string;
  paymentMethodId: string | null;
};

export interface MpSecureCardFieldsHandle {
  tokenize: (input: {
    cardholderName: string;
    identificationType: string;
    identificationNumber: string;
  }) => Promise<MpTokenizeResult>;
  ready: boolean;
}

interface Props {
  publicKey: string;
  /** ids únicos evitam colisão caso o componente monte em rotas diferentes. */
  idPrefix?: string;
}

/**
 * Formulário de cartão baseado em Secure Fields do Mercado Pago:
 * cada campo sensível (PAN, validade, CVV) é um iframe hospedado pela MP,
 * então o número do cartão jamais entra no DOM/JS do site — atende PCI SAQ-A.
 */
export const MpSecureCardFields = forwardRef<MpSecureCardFieldsHandle, Props>(
  function MpSecureCardFields({ publicKey, idPrefix = "mp" }, ref) {
    const mpRef = useRef<MpInstance | null>(null);
    const fieldsRef = useRef<{ card?: MpField; exp?: MpField; cvv?: MpField }>({});
    const [ready, setReady] = useState(false);
    const pmIdRef = useRef<string | null>(null);

    const ids = {
      card: `${idPrefix}-cardNumber`,
      exp: `${idPrefix}-expirationDate`,
      cvv: `${idPrefix}-securityCode`,
    };

    useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          await ensureSdk();
          if (cancelled || !window.MercadoPago) return;
          const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
          mpRef.current = mp;
          const style = { fontSize: "16px", color: "#111827" } as Record<string, string>;
          const card = mp.fields
            .create("cardNumber", { placeholder: "0000 0000 0000 0000", style })
            .mount(ids.card);
          const exp = mp.fields
            .create("expirationDate", { placeholder: "MM/AA", style })
            .mount(ids.exp);
          const cvv = mp.fields
            .create("securityCode", { placeholder: "CVV", style })
            .mount(ids.cvv);
          fieldsRef.current = { card, exp, cvv };
          card.on("binChange", async (d) => {
            const bin = (d?.bin ?? "").replace(/\D/g, "");
            if (bin.length < 6) { pmIdRef.current = null; return; }
            try {
              const res = await mp.getPaymentMethods({ bin });
              pmIdRef.current = res?.results?.[0]?.id ?? null;
            } catch {
              pmIdRef.current = null;
            }
          });
          setReady(true);
        } catch (e) {
          console.error("[mp-fields] init error", e);
        }
      })();
      return () => {
        cancelled = true;
        try { fieldsRef.current.card?.unmount(); } catch { /* noop */ }
        try { fieldsRef.current.exp?.unmount(); } catch { /* noop */ }
        try { fieldsRef.current.cvv?.unmount(); } catch { /* noop */ }
        fieldsRef.current = {};
        setReady(false);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicKey]);

    useImperativeHandle(ref, () => ({
      ready,
      tokenize: async ({ cardholderName, identificationType, identificationNumber }) => {
        const mp = mpRef.current;
        if (!mp) throw new Error("Formulário do cartão ainda carregando. Aguarde.");
        const res = await mp.fields.createCardToken({
          cardholderName,
          identificationType,
          identificationNumber,
        });
        const token = res?.id;
        if (!token) throw new Error("Não foi possível validar o cartão.");
        return { token, paymentMethodId: pmIdRef.current };
      },
    }), [ready]);

    const boxClass =
      "mt-1 h-11 rounded-md border border-input bg-background px-3 [&>iframe]:h-full [&>iframe]:w-full";
    return (
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Número do cartão</label>
          <div id={ids.card} className={boxClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Validade</label>
            <div id={ids.exp} className={boxClass} />
          </div>
          <div>
            <label className="text-sm font-medium">CVV</label>
            <div id={ids.cvv} className={boxClass} />
          </div>
        </div>
        {!ready && (
          <p className="text-xs text-muted-foreground">
            Carregando formulário seguro do Mercado Pago…
          </p>
        )}
      </div>
    );
  },
);