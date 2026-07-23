import { Camera, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

type Props = {
  file: File | null;
  preview: string | null;
  onChange: (file: File | null, preview: string | null) => void;
};

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPT_RE = /^image\/(jpeg|png|webp|gif)$/;

export function PhotoPicker({ preview, onChange }: Props) {
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (f.size > MAX_SIZE) {
      toast.error("A foto deve ter no máximo 5MB.");
      return;
    }
    if (!ACCEPT_RE.test(f.type)) {
      toast.error("Envie JPEG, PNG, WebP ou GIF.");
      return;
    }
    onChange(f, URL.createObjectURL(f));
  }

  if (preview) {
    return (
      <div className="flex items-center gap-3">
        <img src={preview} alt="Prévia" className="w-24 h-24 rounded-full object-cover border" />
        <button
          type="button"
          onClick={() => onChange(null, null)}
          className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-destructive"
        >
          <X className="w-4 h-4" /> Remover
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <label className="cursor-pointer border-2 border-dashed border-input rounded-lg p-4 flex flex-col items-center justify-center text-sm text-muted-foreground hover:bg-secondary transition">
        <ImagePlus className="w-6 h-6 mb-1" />
        Escolher da galeria
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
      <label className="cursor-pointer border-2 border-dashed border-primary/40 bg-primary/5 rounded-lg p-4 flex flex-col items-center justify-center text-sm text-primary hover:bg-primary/10 transition">
        <Camera className="w-6 h-6 mb-1" />
        Tirar foto agora
        <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleFile} />
      </label>
    </div>
  );
}