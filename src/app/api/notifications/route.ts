import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ADMINS = ['arinjaysaha2010@gmail.com', 'aashitag811@gmail.com'];

// GET /api/notifications — returns all notifications + read IDs for the current user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let readIds: string[] = [];
  if (user) {
    const { data: reads } = await supabase
      .from('notification_reads')
      .select('notification_id')
      .eq('user_id', user.id);
    readIds = (reads ?? []).map((r: any) => r.notification_id);
  }

  return NextResponse.json({ notifications: notifications ?? [], readIds });
}

// POST /api/notifications — admin only, post a new notification
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single();

  const email = (profile as any)?.email ?? user.email ?? '';
  if (!ADMINS.includes(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { title, body, type } = await req.json();
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
  }

  const db = supabase as any;
  const { data, error } = await db
    .from('notifications')
    .insert({ title: title.trim(), body: body.trim(), type: type ?? 'update', created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/notifications?id=xxx — admin only
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single();

  const email = (profile as any)?.email ?? user.email ?? '';
  if (!ADMINS.includes(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
