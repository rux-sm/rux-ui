import { supabase } from "./supabase.js";

// A refused read is null, as a missing setting is, unless `strict` asks for
// the error, which a save that merges over the stored value needs.
export async function getSetting(key, { strict = false } = {}) {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    if (strict) throw error;
    console.warn("getSetting error:", error);
    return null;
  }
  return data?.value ?? null;
}

export async function setSetting(key, value) {
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw error;
}
