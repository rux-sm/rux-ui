import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://udnmqhayzhrbltxzzhjw.supabase.co";
const SUPABASE_KEY = "sb_publishable_w3h8Mtwam0ULemVKGKyBfw_DTbTaJIS";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
