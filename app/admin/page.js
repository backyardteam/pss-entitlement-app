'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const [rules, setRules] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const fetchRules = async () => {
      const { data } = await supabase
        .from('entitlement_rules')
        .select('*')
        .order('purchase_day', { ascending: true });
      setRules(data || []);
    };
    fetchRules();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-yellow-400">🛠️ Admin Entitlement</h1>
          <button onClick={handleLogout} className="bg-red-600 px-4 py-2 rounded">Logout</button>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-2xl">
          <h2 className="text-xl mb-4">⚙️ Aturan Purchase Window (Simulasi)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-700">
                <tr><th className="p-3">Tier</th><th>Hari Ke-</th><th>Kuota</th><th>Status</th></tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-b border-gray-700">
                    <td className="p-3 font-bold text-yellow-300">Tier {r.tier}</td>
                    <td>{r.purchase_day}</td>
                    <td>{r.quota}</td>
                    <td>{r.is_active ? '✅ Aktif' : '❌ Nonaktif'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded">
            <p className="text-sm">💡 <strong>Tips:</strong> Untuk mengubah aturan (misal Tier A jadi hari 1), buka Supabase Dashboard → Table Editor → entitlement_rules, edit langsung di sana.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
