
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yubfgiermqfsysbyqemx.supabase.co';
const supabaseKey = 'sb_publishable_CxQ-7cF6Zkrkgi30ENUZ2A_Mpx1zg8f';

export const supabase = createClient(supabaseUrl, supabaseKey);
