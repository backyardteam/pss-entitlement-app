import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Buat Supabase client dengan Service Role Key (server-side)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { userId, matchDate } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Generate QR token unik
    const qrToken = `${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const matchDateStr = matchDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Insert tiket pakai supabaseAdmin (bypass RLS)
    const { data, error } = await supabaseAdmin
      .from('tickets')
      .insert([{
        user_id: userId,
        match_date: matchDateStr,
        status: 'RESERVED',
        qr_token: qrToken
      }])
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket: data,
      message: 'Tiket berhasil dipesan!'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
