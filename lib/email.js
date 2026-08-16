import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTicketConfirmation(email, name, matchDate, qrToken) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'PSS Sleman <noreply@pss-sleman.id>',
      to: [email],
      subject: '🎫 Konfirmasi Tiket PSS Sleman',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 3px solid #dc2626; padding-bottom: 20px; }
            .header h1 { color: #dc2626; margin: 0; }
            .content { padding: 20px 0; }
            .qr-box { background: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .qr-box code { background: #e5e7eb; padding: 10px 20px; border-radius: 5px; font-size: 14px; display: inline-block; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            .btn { background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚽ PSS Sleman</h1>
              <p style="color: #6b7280;">Konfirmasi Pembelian Tiket</p>
            </div>
            <div class="content">
              <h2>Halo, ${name}! 👋</h2>
              <p>Terima kasih telah membeli tiket pertandingan PSS Sleman.</p>
              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #22c55e;">
                <p><strong>📅 Tanggal Match:</strong> ${matchDate}</p>
                <p><strong>🎟️ Status:</strong> <span style="color: #22c55e;">RESERVED</span></p>
              </div>
              <div class="qr-box">
                <p><strong>🔑 Token QR Tiket:</strong></p>
                <code>${qrToken}</code>
                <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">
                  * Token ini digunakan untuk validasi di pintu masuk stadion.
                </p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://pss-entitlement-app.vercel.app'}/tickets" class="btn">
                  Lihat Tiket Saya
                </a>
              </div>
              <p style="font-size: 14px; color: #4b5563;">
                Simpan token QR ini dengan baik. Jangan bagikan ke orang lain.
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2026 PSS Sleman. All rights reserved.</p>
              <p>Powered by PSS Smart Ticketing System</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Email error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

export async function sendMatchReminder(email, name, matchDate) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'PSS Sleman <noreply@pss-sleman.id>',
      to: [email],
      subject: '⚽ Pengingat Match PSS Sleman!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fef2f2; border-radius: 10px; border: 2px solid #dc2626;">
          <h1 style="color: #dc2626; text-align: center;">⚽ PSS Sleman</h1>
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h2>Halo, ${name}! 🏟️</h2>
            <p><strong>Besok adalah hari pertandingan!</strong></p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong>📅 Tanggal:</strong> ${matchDate}</p>
              <p><strong>📍 Lokasi:</strong> Stadion Maguwoharjo</p>
              <p><strong>⏰ Kick-off:</strong> 19:30 WIB</p>
            </div>
            <p style="text-align: center; color: #6b7280; font-size: 14px;">
              Jangan lupa bawa tiket QR code-mu! <br>
              Sampai bertemu di stadion! 👋
            </p>
          </div>
          <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px;">
            &copy; 2026 PSS Sleman
          </p>
        </div>
      `
    });

    if (error) {
      console.error('Email reminder error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Email reminder error:', error);
    return { success: false, error };
  }
}
