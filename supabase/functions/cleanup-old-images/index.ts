import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // SECURITY: Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Require admin role
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin', {
      _user_id: user.id
    });

    if (adminError || !isAdmin) {
      console.error('Admin check failed:', adminError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin cleanup triggered by user: ${user.id}`);

    // Find jobs older than 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: oldJobs, error: selectError } = await supabase
      .from('processing_jobs')
      .select('id, final_url, project_id')
      .lt('created_at', fourteenDaysAgo.toISOString());

    if (selectError) {
      throw selectError;
    }

    console.log(`Found ${oldJobs?.length || 0} jobs older than 14 days`);

    if (!oldJobs || oldJobs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, deleted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete storage files
    const filesToDelete: string[] = [];
    for (const job of oldJobs) {
      if (job.final_url) {
        // Extract filename from URL
        const urlParts = job.final_url.split('/');
        const filename = urlParts[urlParts.length - 1];
        if (filename) {
          filesToDelete.push(filename);
        }
      }
    }

    if (filesToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('processed-cars')
        .remove(filesToDelete);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      } else {
        console.log(`Deleted ${filesToDelete.length} files from storage`);
      }
    }

    // Delete jobs from database
    const jobIds = oldJobs.map(j => j.id);
    const { error: deleteJobsError } = await supabase
      .from('processing_jobs')
      .delete()
      .in('id', jobIds);

    if (deleteJobsError) {
      throw deleteJobsError;
    }

    // Find and delete empty projects (projects with no remaining jobs)
    const projectIds = [...new Set(oldJobs.filter(j => j.project_id).map(j => j.project_id))];
    
    for (const projectId of projectIds) {
      const { data: remainingJobs } = await supabase
        .from('processing_jobs')
        .select('id')
        .eq('project_id', projectId)
        .limit(1);

      if (!remainingJobs || remainingJobs.length === 0) {
        await supabase.from('projects').delete().eq('id', projectId);
        console.log(`Deleted empty project: ${projectId}`);
      }
    }

    console.log(`✅ Cleanup complete: ${oldJobs.length} jobs deleted`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: oldJobs.length,
        filesRemoved: filesToDelete.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
