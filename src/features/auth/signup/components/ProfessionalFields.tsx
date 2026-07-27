import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AvailabilityGrid,
  type AvailabilityMap,
} from "@/shared/components/AvailabilityGrid";
import { ChipToggle, toggleInArray } from "./ChipToggle";
import { PhotoPicker } from "./PhotoPicker";
import { PROFESSIONAL_REGIONS, type ProfessionalFieldsState } from "../types";
import {
  useCategoriesQuery,
  useCategorySpecialtiesQuery,
} from "../queries";

type TopProps = {
  value: ProfessionalFieldsState;
  onChange: (patch: Partial<ProfessionalFieldsState>) => void;
};

export function ProfessionalFieldsTop({ value, onChange }: TopProps) {
  const categories = useCategoriesQuery();
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="cpf">CPF</Label>
        <Input id="cpf" value={value.cpf} onChange={(e) => onChange({ cpf: e.target.value })} placeholder="00000000000" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pix">Chave PIX para Recebimentos</Label>
        <Input
          id="pix"
          value={value.pixKey}
          onChange={(e) => onChange({ pixKey: e.target.value })}
          placeholder="CPF, telefone, e-mail ou chave aleatória"
          required
        />
        <p className="text-xs text-muted-foreground">Usada para receber pagamentos dos clientes</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category">Categoria Profissional</Label>
        <select
          id="category"
          value={value.category}
          onChange={(e) => onChange({ category: e.target.value, specialties: [] })}
          required
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="">Selecione uma categoria</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>
    </>
  );
}

type BottomProps = {
  value: ProfessionalFieldsState;
  onChange: (patch: Partial<ProfessionalFieldsState>) => void;
  photoFile: File | null;
  photoPreview: string | null;
  onPhotoChange: (file: File | null, preview: string | null) => void;
  availability: AvailabilityMap;
  onAvailabilityChange: (next: AvailabilityMap) => void;
};

export function ProfessionalFieldsBottom({
  value,
  onChange,
  photoFile: _photoFile,
  photoPreview,
  onPhotoChange,
  availability,
  onAvailabilityChange,
}: BottomProps) {
  const categories = useCategoriesQuery();
  const selectedCat = categories.data?.find((c) => c.name === value.category);
  const specialties = useCategorySpecialtiesQuery(selectedCat?.id);

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="exp">Experiência</Label>
        <Input id="exp" value={value.experience} onChange={(e) => onChange({ experience: e.target.value })} placeholder="Anos de experiência" />
      </div>

      {selectedCat && (
        <div className="space-y-2">
          <Label>Especialidades</Label>
          {specialties.data && specialties.data.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {specialties.data.map((s) => (
                <ChipToggle
                  key={s.name}
                  active={value.specialties.includes(s.name)}
                  onClick={() => onChange({ specialties: toggleInArray(value.specialties, s.name) })}
                >
                  {s.name}
                </ChipToggle>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Nenhuma especialidade cadastrada para esta categoria.</p>
          )}
        </div>
      )}
      {!selectedCat && (
        <div className="space-y-2">
          <Label>Especialidades</Label>
          <p className="text-xs text-muted-foreground italic">Selecione uma categoria profissional primeiro</p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Regiões Atendidas</Label>
        <p className="text-xs text-muted-foreground">Selecione as regiões da cidade onde você trabalha</p>
        <div className="flex flex-wrap gap-2">
          {PROFESSIONAL_REGIONS.map((r) => (
            <ChipToggle
              key={r}
              active={value.regions.includes(r)}
              onClick={() => onChange({ regions: toggleInArray(value.regions, r) })}
            >
              <MapPin className="w-3 h-3" />
              {r}
            </ChipToggle>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Disponibilidade Semanal</Label>
        <p className="text-xs text-muted-foreground">Selecione os dias e horários que você trabalha</p>
        <AvailabilityGrid value={availability} onChange={onAvailabilityChange} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bio">Sobre você (opcional)</Label>
        <Textarea id="bio" value={value.bio} onChange={(e) => onChange({ bio: e.target.value })} rows={3} placeholder="Conte um pouco sobre sua experiência e diferenciais..." />
      </div>

      <div className="space-y-2">
        <Label>Foto de Perfil <span className="text-destructive">*</span></Label>
        <PhotoPicker file={_photoFile} preview={photoPreview} onChange={onPhotoChange} />
        <p className="text-xs text-muted-foreground">JPEG, PNG, WebP ou GIF (máx. 5MB)</p>
      </div>
    </>
  );
}

// Backwards-compat: some callers may still import `ProfessionalFields`.
export function ProfessionalFields(props: BottomProps) {
  return (
    <>
      <ProfessionalFieldsTop value={props.value} onChange={props.onChange} />
      <ProfessionalFieldsBottom {...props} />
    </>
  );
}