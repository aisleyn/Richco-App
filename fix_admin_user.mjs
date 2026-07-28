import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rsomamqswbezhcaprbol.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzb21hbXFzd2JlemhjYXByYm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyOTY4NjksImV4cCI6MjA5Mjg3Mjg2OX0.w6kwFhcRBJ38CpP7LUIDzL1bZWJBRuEae-6XMXeS2nU';

// Get service role key from environment or file
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.log('Service role key not found in environment. Will try with anon key (limited access).');
  console.log('Need service role key to modify crew_members table.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const adminEmail = 'nolanaisley@gmail.com';

(async () => {
  try {
    // Check if user exists in crew_members
    console.log(`Checking if ${adminEmail} exists in crew_members...`);
    const { data: existing, error: checkError } = await supabase
      .from('crew_members')
      .select('*')
      .eq('email', adminEmail);
    
    if (checkError) {
      console.error('Error checking crew_members:', checkError);
      process.exit(1);
    }
    
    if (existing && existing.length > 0) {
      console.log('User already exists:', existing[0]);
      
      if (!existing[0].is_admin) {
        console.log('Updating is_admin to true...');
        const { data: updated, error: updateError } = await supabase
          .from('crew_members')
          .update({ is_admin: true })
          .eq('email', adminEmail)
          .select();
        
        if (updateError) {
          console.error('Error updating user:', updateError);
          process.exit(1);
        }
        
        console.log('✅ Updated user to admin:', updated[0]);
      } else {
        console.log('✅ User already has is_admin=true');
      }
    } else {
      console.log('User does not exist. Creating...');
      const { data: created, error: createError } = await supabase
        .from('crew_members')
        .insert({
          email: adminEmail,
          first_name: 'Nolan',
          last_name: 'Aisley',
          is_admin: true,
          role: 'admin'
        })
        .select();
      
      if (createError) {
        console.error('Error creating user:', createError);
        process.exit(1);
      }
      
      console.log('✅ Created admin user:', created[0]);
    }
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
})();
