import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImageUpload, type UploadOptions } from "@/shared/hooks/use-image-upload";
import { toast } from "sonner";

type Props = {
  currentUrl?: string | null;
  options: UploadOptions;
  onUploaded: (url: string, path: string) => void;
  label?: string;
  shape?: "circle" | "square";
};

/** Botão + preview para foto de perfil / capa. Comprime em WebP antes do upload. */
export function PhotoUploader({
  currentUrl,
  options,
  onUploaded,
  label = "Alterar foto",
  shape = "circle",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const { upload, uploading } = useImageUpload();

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url, path } = await upload(file, options);
      setPreview(url);
      onUploaded(url, path);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      e.target.value = "";
    }
  }

  const shapeCls = shape === "circle" ? "rounded-full" : "rounded-xl";

  return (
    <div className="flex items-center gap-4">
      <div
        className={
          "h-20 w-20 overflow-hidden bg-muted flex items-center justify-center " +
          shapeCls
        }
      >
        {preview ? (
          <img src={preview} alt="Foto" className="h-full w-full object-cover" />
        ) : (
          <Camera className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Enviando…
            </>
          ) : (
            label
          )}
        </Button>
        <p className="mt-1 text-xs text-muted-foreground">
          A imagem é otimizada e convertida para WebP.
        </p>
      </div>
    </div>
  );
}