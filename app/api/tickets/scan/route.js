import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { qrToken } = await request.json();

    if (!qrToken) {
      return NextResponse.json(
        { error: 'QR token required' },
        { status: 400 }
      );
    }

    // Cari tiket berdasarkan qr_token
    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .select('*, profiles(full_name)')
      .eq('qr_token', qrToken)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!ticket) {
      return NextResponse.json(
        { error: 'Tiket tidak ditemukan' },
        { status: 404 }
      );
    }

    if (ticket.status === 'ISSUED') {
      return NextResponse.json(
        { error: 'Tiket sudah digunakan (ISSUED)' },
        { status: 400 }
      );
    }

    // Update status menjadi ISSUED
    const { error: updateError } = await supabaseAdmin
      .from('tickets')
      .update({ status: 'ISSUED' })
      .eq('id', ticket.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket: ticket,
      message: 'Tiket berhasil divalidasi!',
      user: ticket.profiles?.full_name || 'Unknown'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
