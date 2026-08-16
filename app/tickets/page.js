'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchTickets = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tickets:', error);
      }
      setTickets(data || []);
      setLoading(false);
    };
    fetchTickets();
  }, []);

  const toggleQR = (ticketId) => {
    setShowQR(showQR === ticketId ? null : ticketId);
  };

  if (loading) return <div className="p-10 text-center text-gray-500">⏳ Memuat tiket...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-red-700">🎫 Tiket Saya ({tickets.length})</h1>
          <button onClick={() => router.push('/dashboard')} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">⬅️ Kembali</button>
        </div>

        {tickets.length === 0 ? (
          <div className="bg-white p-10 text-center rounded-2xl shadow">
            <p className="text-gray-500 text-lg">Belum ada tiket. Yuk beli di Dashboard!</p>
            <button onClick={() => router.push('/dashboard')} className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">Beli Tiket</button>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500">ID Tiket</p>
                    <p className="font-mono text-xs text-gray-600">{ticket.id.substring(0, 12)}...</p>
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
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition"
                  >
                    {showQR === ticket.id ? 'Sembunyikan QR' : 'Tampilkan QR'}
                  </button>
                </div>
                {showQR === ticket.id && ticket.qr_token && (
                  <div className="mt-4 flex justify-center border-t pt-4">
                    <QRCodeCanvas value={ticket.qr_token} size={180} bgColor="#ffffff" fgColor="#000000" level="H" />
                    <div className="ml-4 text-sm text-gray-500 flex flex-col justify-center">
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
