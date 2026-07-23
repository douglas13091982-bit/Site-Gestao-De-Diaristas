import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, type CompressOptions } from "@/lib/image-utils";
import { toMessage } from "@/shared/lib/result";

export type UploadOptions = {
  bucket: string;
  /** Prefixo dentro do bucket (ex.: userId). Sem barra final. */
  path: string;
  compress?: CompressOptions;
  /** Se true, gera URL assinada; caso contrário, retorna URL pública. */
  signed?: boolean;
  /** Segundos de validade da URL assinada. */
  signedTtlSeconds?: number;
};

/**
 * Faz compressão em WebP e upload no Supabase Storage.
 * Retorna a URL exibível (pública ou assinada) e o path armazenado.
 */
export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, opts: UploadOptions) => {
      setUploading(true);
      setError(null);
      try {
        const compressed = await compressImage(file, opts.compress);
        const ext = compressed.name.split(".").pop() || "webp";
        const key = `${opts.path.replace(/\/$/, "")}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(opts.bucket)
          .upload(key, compressed, { upsert: true, contentType: compressed.type });
        if (upErr) throw upErr;

        let url: string;
        if (opts.signed) {
          const { data, error: sErr } = await supabase.storage
            .from(opts.bucket)
            .createSignedUrl(key, opts.signedTtlSeconds ?? 60 * 60 * 24 * 365);
          if (sErr || !data) throw sErr ?? new Error("Falha ao gerar URL");
          url = data.signedUrl;
        } else {
          url = supabase.storage.from(opts.bucket).getPublicUrl(key).data.publicUrl;
        }
        return { url, path: key };
      } catch (e) {
        const msg = toMessage(e, "Falha no upload");
        setError(msg);
        throw new Error(msg);
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  return { upload, uploading, error };
}