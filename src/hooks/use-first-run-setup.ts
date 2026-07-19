import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type PreferredTitle = "mr" | "ms" | "mx" | "none";
export type PreferredLanguage = "system" | "en" | "es";

export type FirstRunSetupForm = {
  full_name: string;
  avatar_url: string;
  phone: string;
  department: string;
  preferred_title: PreferredTitle;
  birth_date: string;
  language: PreferredLanguage;
};

type FirstRunPreferences = {
  language: PreferredLanguage;
  onboarding_completed: boolean;
  onboarding_dismissed: boolean;
  preferred_title: PreferredTitle;
  birth_date: string | null;
};

const DEFAULT_FORM: FirstRunSetupForm = {
  full_name: "",
  avatar_url: "",
  phone: "",
  department: "",
  preferred_title: "none",
  birth_date: "",
  language: "system",
};

function normalizeTitle(value: unknown): PreferredTitle {
  return value === "mr" || value === "ms" || value === "mx" ? value : "none";
}

function normalizeLanguage(value: unknown): PreferredLanguage {
  return value === "en" || value === "es" ? value : "system";
}

export function useFirstRunSetup() {
  const { profile, user, refreshProfile } = useAuth();
  const db = supabase as any;
  const [preferences, setPreferences] = useState<FirstRunPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultForm = useMemo<FirstRunSetupForm>(
    () => ({
      full_name: profile?.full_name || user?.user_metadata?.full_name || "",
      avatar_url: profile?.avatar_url || "",
      phone: profile?.phone || "",
      department: profile?.department || "",
      preferred_title: preferences?.preferred_title || DEFAULT_FORM.preferred_title,
      birth_date: preferences?.birth_date || "",
      language: preferences?.language || DEFAULT_FORM.language,
    }),
    [preferences, profile, user],
  );

  const loadPreferences = useCallback(async () => {
    if (!profile?.id) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: preferencesError } = await db
      .from("profile_preferences")
      .select("language,onboarding_completed,onboarding_dismissed,preferred_title,birth_date")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (preferencesError) {
      setError(preferencesError.message || "No se pudo cargar la configuración inicial.");
      setPreferences(null);
      setLoading(false);
      return;
    }

    setPreferences(
      data
        ? {
            language: normalizeLanguage(data.language),
            onboarding_completed: Boolean(data.onboarding_completed),
            onboarding_dismissed: Boolean(data.onboarding_dismissed),
            preferred_title: normalizeTitle(data.preferred_title),
            birth_date: data.birth_date || null,
          }
        : {
            language: "system",
            onboarding_completed: false,
            onboarding_dismissed: false,
            preferred_title: "none",
            birth_date: null,
          },
    );
    setLoading(false);
  }, [db, profile?.id]);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  const shouldShowSetup =
    Boolean(profile?.id) &&
    !loading &&
    !error &&
    !preferences?.onboarding_completed &&
    !preferences?.onboarding_dismissed;

  const uploadProfileAvatar = async (file: File) => {
    if (!profile?.id) {
      throw new Error("No se encontró el perfil para subir la imagen.");
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${profile.id}/${Date.now()}-${crypto.randomUUID()}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-avatars")
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("profile-avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveSetup = async (form: FirstRunSetupForm, avatarFile?: File | null) => {
    if (!profile?.id) {
      toast.error("No se encontró un perfil para este usuario.");
      return false;
    }

    setSaving(true);
    let avatarUrl = form.avatar_url.trim() || null;

    if (avatarFile) {
      try {
        avatarUrl = await uploadProfileAvatar(avatarFile);
      } catch (avatarError: any) {
        setSaving(false);
        toast.error(avatarError?.message || "No se pudo subir la foto de perfil.");
        return false;
      }
    }

    const profilePayload = {
      full_name: form.full_name.trim() || null,
      avatar_url: avatarUrl,
      phone: form.phone.trim() || null,
      department: form.department.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await db
      .from("profiles")
      .update(profilePayload)
      .eq("id", profile.id);

    if (profileError) {
      setSaving(false);
      toast.error(profileError.message || "No se pudo guardar el perfil.");
      return false;
    }

    const { error: preferencesError } = await db.from("profile_preferences").upsert(
      {
        profile_id: profile.id,
        language: form.language,
        preferred_title: form.preferred_title,
        birth_date: form.birth_date || null,
        onboarding_completed: true,
        onboarding_dismissed: false,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" },
    );

    setSaving(false);
    if (preferencesError) {
      toast.error(preferencesError.message || "No se pudo guardar la configuración inicial.");
      return false;
    }

    await refreshProfile();
    await loadPreferences();
    return true;
  };

  const dismissSetup = async () => {
    if (!profile?.id) return false;
    setSaving(true);
    const { error: preferencesError } = await db.from("profile_preferences").upsert(
      {
        profile_id: profile.id,
        onboarding_dismissed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" },
    );
    setSaving(false);
    if (preferencesError) {
      toast.error(preferencesError.message || "No se pudo omitir la configuración inicial.");
      return false;
    }
    await loadPreferences();
    return true;
  };

  return {
    defaultForm,
    error,
    loading,
    preferences,
    saving,
    shouldShowSetup,
    dismissSetup,
    reload: loadPreferences,
    saveSetup,
  };
}
