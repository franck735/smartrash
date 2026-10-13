import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function makeUserAdmin(email: string) {
  try {
    console.log(`Assigning admin role to ${email}...`);

    // Call the function to make user admin
    const { data, error } = await supabase.rpc('make_user_admin', {
      _email: email,
    });

    if (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }

    if (data && data.length > 0) {
      const result = data[0];
      if (result.success) {
        console.log('✅ Success:', result.message);
      } else {
        console.log('❌ Failed:', result.message);
      }
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

// Run the function
makeUserAdmin('marcelinkyambo@gmail.com');
