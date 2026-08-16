import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendTicketConfirmation } from '@/lib/email';

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

    // Dapatkan data user
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('User fetch error:', userError);
    }

    const qrToken = `${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const matchDateStr = matchDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

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

    // Kirim email konfirmasi
    if (userProfile?.email) {
      const emailResult = await sendTicketConfirmation(
        userProfile.email,
        userProfile.full_name || 'Supporter',
        matchDateStr,
        qrToken
      );
      if (!emailResult.success) {
        console.error('Email send error:', emailResult.error);
        // Email gagal tetap lanjut, user tetap dapat tiket
      }
    }

    return NextResponse.json({
      success: true,
      ticket: data,
      message: 'Tiket berhasil dipesan! Email konfirmasi telah dikirim.'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
