import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Square, Upload, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const BUCKET = "admin-booking-alerts";
const SETTING = "admin_booking_alarm_mp3";
const QUERY_KEY = ["admin-booking-alarm"];
const MAX_BYTES = 5 * 1024 * 1024;

type AlarmControls = {
  configured: boolean;
  loading: boolean;
  loadError: boolean;
  uploading: boolean;
  ringing: boolean;
  testing: boolean;
  upload: (file: File) => void;
  test: () => void;
  stop: () => void;
};

const AlarmContext = createContext<AlarmControls | null>(null);

export function AdminBookingAlarmProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ringingRef = useRef(false);
  const attempt = useRef(0);
  const [ringing, setRinging] = useState(false);
  const [testing, setTesting] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const sound = useQuery({
    queryKey: QUERY_KEY,
    refetchInterval: 45 * 60 * 1000,
    queryFn: async () => {
      const { data: setting, error } = await supabase.from("app_settings")
        .select("setting_value").eq("setting_key", SETTING).maybeSingle();
      if (error) throw new Error("Não foi possível carregar o toque.");
      const path = setting?.setting_value;
      if (!path) return null;
      const { data, error: storageError } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
      if (storageError || !data?.signedUrl) throw new Error("Não foi possível abrir o MP3.");
      return { path, url: data.signedUrl };
    },
  });

  const save = useMutation({
    mutationFn: async (file: File) => {
      if (!/\.mp3$/i.test(file.name) || file.size < 3 || file.size > MAX_BYTES) {
        throw new Error("Selecione um MP3 de até 5 MB.");
      }
      const bytes = new Uint8Array(await file.slice(0, 3).arrayBuffer());
      const hasId3 = bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51;
      const hasFrame = bytes[0] === 255 && (bytes[1] & 224) === 224;
      if (!hasId3 && !hasFrame) throw new Error("O arquivo selecionado não parece ser um MP3.");

      const path = `${crypto.randomUUID()}.mp3`;
      const storage = supabase.storage.from(BUCKET);
      const { error: uploadError } = await storage.upload(path, file, { contentType: "audio/mpeg" });
      if (uploadError) throw new Error("Não foi possível enviar o MP3.");

      const { error: settingsError } = await supabase.from("app_settings").upsert({
        setting_key: SETTING,
        setting_value: path,
        is_public: false,
      }, { onConflict: "setting_key" });
      if (settingsError) {
        await storage.remove([path]);
        throw new Error("Não foi possível salvar o toque de agendamentos.");
      }
      const previous = sound.data?.path;
      if (previous && /^[a-f0-9-]+\.mp3$/i.test(previous)) {
        await storage.remove([previous]);
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Toque salvo. Use Testar som para ouvir.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const stop = useCallback(() => {
    attempt.current += 1;
    ringingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setRinging(false);
    setTesting(false);
    setBlocked(false);
  }, []);

  const play = useCallback(async (loop: boolean) => {
    const url = sound.data?.url;
    if (!url) return;
    const currentAttempt = ++attempt.current;
    const audio = audioRef.current ?? (audioRef.current = new Audio());
    if (audio.src !== url) audio.src = url;
    audio.loop = loop;
    audio.currentTime = 0;
    audio.onended = () => {
      if (attempt.current === currentAttempt) setTesting(false);
    };

    if (loop) {
      ringingRef.current = true;
      setRinging(true);
      setTesting(false);
    } else {
      setTesting(true);
    }
    setBlocked(false);

    try {
      await audio.play();
    } catch (error) {
      if (attempt.current !== currentAttempt) return;
      if (loop) setBlocked(true);
      else {
        setTesting(false);
        toast.error(error instanceof DOMException && error.name === "NotAllowedError"
          ? "O navegador bloqueou o som. Toque em Testar som novamente."
          : "Não foi possível reproduzir o MP3.");
      }
    }
  }, [sound.data?.url]);

  useEffect(() => {
    const channel = supabase.channel("admin-booking-alarm")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, () => {
        void qc.invalidateQueries({ queryKey: ["admin-bookings"] });
        if (!ringingRef.current) void play(true);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [play, qc]);

  useEffect(() => () => {
    attempt.current += 1;
    audioRef.current?.pause();
  }, []);

  return (
    <AlarmContext.Provider value={{
      configured: Boolean(sound.data),
      loading: sound.isLoading,
      loadError: sound.isError,
      uploading: save.isPending,
      ringing,
      testing,
      upload: (file) => save.mutate(file),
      test: () => void play(false),
      stop,
    }}>
      {ringing && (
        <div className="sticky top-[65px] z-20 flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 md:top-0" role="status">
          <span className="inline-flex items-center gap-2 font-semibold">
            <BellRing className="size-4" aria-hidden="true" />
            {blocked ? "Novo agendamento · toque não reproduzido" : "Novo agendamento"}
          </span>
          <div className="flex flex-wrap gap-2">
            {blocked && <Button size="sm" type="button" onClick={() => void play(true)}><Volume2 className="size-4" /> Tocar aviso</Button>}
            <Button variant="outline" size="sm" type="button" onClick={stop}>
              <Square className="size-4" aria-hidden="true" /> Parar toque
            </Button>
          </div>
        </div>
      )}
      {children}
    </AlarmContext.Provider>
  );
}

export function AdminBookingSoundSettings() {
  const alarm = useContext(AlarmContext);
  const input = useRef<HTMLInputElement>(null);
  if (!alarm) return null;

  return (
    <section aria-label="Toque de novos agendamentos" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold">Toque de novos agendamentos</h2>
        <p className="text-xs text-muted-foreground">
          {alarm.loading ? "Carregando toque…" : alarm.loadError ? "Não foi possível carregar o toque." : alarm.configured ? "MP3 configurado. Teste o som para ativar a reprodução neste navegador." : "Envie um MP3 de até 5 MB para configurar o aviso."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input ref={input} aria-label="Arquivo de toque MP3" type="file" accept=".mp3,audio/mpeg" className="hidden" onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) alarm.upload(file);
        }} />
        <Button variant="outline" type="button" disabled={alarm.uploading || alarm.ringing} onClick={() => input.current?.click()}>
          <Upload className="size-4" aria-hidden="true" />
          {alarm.uploading ? "Enviando…" : alarm.configured ? "Trocar MP3" : "Enviar MP3"}
        </Button>
        {alarm.configured && (
          <Button variant="outline" type="button" disabled={alarm.ringing || alarm.uploading} onClick={alarm.testing ? alarm.stop : alarm.test}>
            <Volume2 className="size-4" aria-hidden="true" /> {alarm.testing ? "Parar teste" : "Testar som"}
          </Button>
        )}
      </div>
    </section>
  );
}
