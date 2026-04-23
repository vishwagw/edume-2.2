// ════════════════════════════════════════════════════════
//  Edume Learning — generate-certificate Edge Function
//
//  Called by the client when a student finishes a course.
//  Also triggered automatically by a Supabase DB webhook
//  when lesson_progress marks all lessons complete.
//
//  POST /functions/v1/generate-certificate
//  Body: { user_id, course_id }
//  Returns: { certificate_id, issued_at, already_existed }
// ════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // CORS pre-flight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // ── Auth: require valid JWT ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return error(401, 'Unauthorized');

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller
    const { data: { user }, error: authErr } = await sb.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) return error(401, 'Invalid token');

    // ── Parse body ──
    const body = await req.json();
    const { user_id, course_id } = body;

    if (!user_id || !course_id) return error(400, 'user_id and course_id are required');

    // Only the authenticated user can request their own cert (or admin)
    const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single();
    if (user.id !== user_id && profile?.role !== 'admin') {
      return error(403, 'Forbidden — can only issue certificate for yourself');
    }

    // ── Check enrollment ──
    const { data: enrollment } = await sb
      .from('enrollments')
      .select('id')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .maybeSingle();

    if (!enrollment) return error(403, 'Student is not enrolled in this course');

    // ── Check course completion ──
    // Get total lessons in course
    const { data: lessons } = await sb
      .from('course_lessons')
      .select('id, course_modules!inner(course_id)')
      .eq('course_modules.course_id', course_id);

    const totalLessons = lessons?.length ?? 0;

    // Get completed lessons by this student
    const lessonIds = (lessons || []).map((l) => l.id);
    const { data: progress } = await sb
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', user_id)
      .in('lesson_id', lessonIds)
      .eq('completed', true);

    const completedLessons = progress?.length ?? 0;

    // Require ≥80% completion (or admin override)
    const completionPct = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    const { data: adminOverride } = await sb.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = adminOverride?.role === 'admin';

    if (completionPct < 80 && !isAdmin) {
      return error(400, `Course not complete. Progress: ${Math.round(completionPct)}% (need 80%)`);
    }

    // ── Idempotency: check if cert already exists ──
    const { data: existing } = await sb
      .from('certificates')
      .select('id, issued_at')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .maybeSingle();

    if (existing) {
      return ok({
        certificate_id: existing.id,
        issued_at: existing.issued_at,
        already_existed: true,
        completion_pct: Math.round(completionPct),
      });
    }

    // ── Issue certificate ──
    const { data: cert, error: insertErr } = await sb
      .from('certificates')
      .insert({
        user_id,
        course_id,
        issued_by: isAdmin ? 'admin' : 'system',
        completion_pct: Math.round(completionPct),
      })
      .select()
      .single();

    if (insertErr) return error(500, 'Failed to issue certificate: ' + insertErr.message);

    // ── Send notification ──
    const { data: course } = await sb.from('courses').select('title').eq('id', course_id).single();
    await sb.from('notifications').insert({
      user_id,
      title: '🎓 Certificate Earned!',
      message: `Congratulations! Your certificate for "${course?.title}" is ready to download.`,
      type: 'certificate',
      link: `/certificate.html?id=${cert.id}`,
    });

    // ── Update enrollment with completion flag ──
    await sb.from('enrollments').update({
      completed: true,
      completed_at: new Date().toISOString(),
      certificate_id: cert.id,
    }).eq('user_id', user_id).eq('course_id', course_id);

    return ok({
      certificate_id: cert.id,
      issued_at: cert.issued_at,
      already_existed: false,
      completion_pct: Math.round(completionPct),
    });

  } catch (e) {
    console.error('generate-certificate error:', e);
    return error(500, 'Internal server error');
  }
});

function ok(data: object) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}

function error(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
