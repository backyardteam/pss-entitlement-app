'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';

// Loading Spinner
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-700 mx-auto mb-4"></div>
      <p className="text-gray-600">Memuat tiket...</p>
    </div>
  </div>
);

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showQR, setShowQR] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setError(null);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push('/'); return; }

        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        setTickets(data || []);
      } catch (err) {
        console.error('Error fetching tickets:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const toggleQR = (ticketId) => {
    setShowQR(showQR === ticketId ? null : ticketId);
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-red-50 rounded-2xl">
          <h2 className="text-2xl font-bold text-red-700 mb-2">😅 Error</h2>
          <p className="text-gray-600">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg">Coba Lagi</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-red-700">🎫 Tiket Saya ({tickets.length})</h1>
          <button onClick={() => router.push('/dashboard')} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">
            ⬅️ Kembali
          </button>
        </div>

        {tickets.length === 0 ? (
          <div className="bg-white p-10 text-center rounded-2xl shadow">
            <p className="text-gray-500 text-lg">Belum ada tiket. Yuk beli di Dashboard!</p>
            <button onClick={() => router.push('/dashboard')} className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition">
              Beli Tiket
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="bg-white p-4 md:p-6 rounded-2xl shadow hover:shadow-lg transition">
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500">ID Tiket</p>
                    <p className="font-mono text-xs text-gray-600 break-all">{ticket.id}</p>
                    <p className="mt-2 font-bold">📅 Match: {ticket.match_date}</p>
                    <p className="text-sm">Status: 
                      <span className={`font-bold ml-1 ${
                        ticket.status === 'PAID' ? 'text-green-600' : 
                        ticket.status === 'ISSUED' ? 'text-blue-600' : 
                        'text-yellow-600'
                      }`}>
                        {ticket.status}
                      </span>
                    </p>
                    {ticket.qr_token && (
                      <p className="text-xs text-gray-400 font-mono mt-1 break-all">
                        Token: {ticket.qr_token}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleQR(ticket.id)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm transition flex-shrink-0"
                  >
                    {showQR === ticket.id ? 'Sembunyikan QR' : 'Tampilkan QR'}
                  </button>
                </div>
                {showQR === ticket.id && ticket.qr_token && (
                  <div className="mt-4 flex flex-wrap justify-center items-center gap-4 border-t pt-4">
                    <QRCodeCanvas value={ticket.qr_token} size={180} bgColor="#ffffff" fgColor="#000000" level="H" />
                    <div className="text-sm text-gray-500">
                      <p>Scan QR ini untuk validasi</p>
                      <p className="text-xs text-gray-400">atau copy token di atas</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
