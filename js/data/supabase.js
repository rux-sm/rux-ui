import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Exported so pages calling the Worker's own routes (not Supabase's) build
// their URL from the same origin rather than hardcoding a second copy.
export const SUPABASE_URL = "https://white-boat-9932.rux-smercado.workers.dev";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbm1xaGF5emhyYmx0eHp6aGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1OTU5NzcsImV4cCI6MjA5NjE3MTk3N30.i5q2SdSZLyOVEGZFFDTtVFqIMVEDz6jLO9ejJfy8Y94";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
