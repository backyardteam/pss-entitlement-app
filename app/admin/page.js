'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [rules, setRules] = useState([]);
  const [message, setMessage] = useState('');
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push('/'); return; }

        let { data: prof, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          const { data: newProf, error: insertError } = await supabase
            .from('profiles')
            .insert([{
              id: session.user.id,
              full_name: session.user.user_metadata?.full_name || 'Supporter',
              tier: 'D',
              loyalty_score: 0,
              is_admin: false
            }])
            .select()
            .single();

          if (insertError) {
            console.error('Error creating profile:', insertError);
            setLoading(false);
            return;
          }
          prof = newProf;
        }

        setProfileData(prof);

        if (!prof?.is_admin) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setIsAdmin(true);
        await fetchData();
        setLoading(false);

      } catch (err) {
        console.error('Error:', err);
        setLoading(false);
      }
    };
    checkAdmin();
  }, []);

  const fetchData = async () => {
    const { data: userData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(userData || []);

    const { data: ruleData } = await supabase
      .from('entitlement_rules')
      .select('*')
      .order('purchase_day', { ascending: true });
    setRules(ruleData || []);
  };

  const updateUserTier = async (userId, newTier) => {
    setMessage('');
    const { error } = await supabase
      .from('profiles')
      .update({ tier: newTier })
      .eq('id', userId);
    if (error) {
      setMessage(`❌ Gagal: ${error.message}`);
    } else {
      setMessage(`✅ Tier berhasil diupdate!`);
      await fetchData();
    }
  };

  const updateRule = async (ruleId, field, value) => {
    setMessage('');
    const { error } = await supabase
      .from('entitlement_rules')
      .update({ [field]: value })
      .eq('id', ruleId);
    if (error) {
      setMessage(`❌ Gagal: ${error.message}`);
    } else {
      setMessage(`✅ Rule berhasil diupdate!`);
      await fetchData();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
        <p>Memeriksa akses...</p>
      </div>
    </div>
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-500">⛔ Akses Ditolak</h1>
          <p className="mt-4 text-gray-400">Hanya admin yang dapat mengakses halaman ini.</p>
          <button onClick={() => router.push('/dashboard')} className="mt-6 bg-blue-600 px-6 py-2 rounded">Kembali</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-yellow-400">👑 Admin Panel</h1>
          <div>
            <button onClick={() => router.push('/dashboard')} className="bg-blue-600 px-4 py-2 rounded mr-2">Dashboard</button>
            <button onClick={() => router.push('/scan')} className="bg-purple-600 px-4 py-2 rounded mr-2">📷 Scan</button>
            <button onClick={handleLogout} className="bg-red-600 px-4 py-2 rounded">Logout</button>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 ${message.includes('✅') ? 'bg-green-900/50 border border-green-500' : 'bg-red-900/50 border border-red-500'}`}>
            {message}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-800 p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-4">👥 Manajemen User ({users.length})</h2>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Nama</th>
                    <th className="p-2 text-left">Tier</th>
                    <th className="p-2 text-left">Admin</th>
                    <th className="p-2 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="p-2">{user.full_name || 'N/A'}</td>
                      <td className="p-2 font-bold text-yellow-300">{user.tier}</td>
                      <td className="p-2">{user.is_admin ? '✅' : ''}</td>
                      <td className="p-2">
                        <select
                          defaultValue={user.tier}
                          onChange={(e) => updateUserTier(user.id, e.target.value)}
                          className="bg-gray-700 text-white text-sm p-1 rounded border border-gray-600"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-4">⚙️ Aturan Purchase Window</h2>
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="bg-gray-700 p-4 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-yellow-300 text-lg">Tier {rule.tier}</span>
                    <span className={`text-sm ${rule.is_active ? 'text-green-400' : 'text-red-400'}`}>
                      {rule.is_active ? '✅ Aktif' : '❌ Nonaktif'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="text-xs text-gray-400">Hari Ke-</label>
                      <input
                        type="number"
                        defaultValue={rule.purchase_day}
                        min="1"
                        max="7"
                        className="w-full bg-gray-600 text-white p-2 rounded border border-gray-500"
                        onChange={(e) => updateRule(rule.id, 'purchase_day', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Kuota Tiket</label>
                      <input
                        type="number"
                        defaultValue={rule.quota}
                        min="1"
                        max="10"
                        className="w-full bg-gray-600 text-white p-2 rounded border border-gray-500"
                        onChange={(e) => updateRule(rule.id, 'quota', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded text-sm">
                💡 Perubahan akan langsung berlaku tanpa perlu restart.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-gray-800 p-4 rounded-xl text-center">
            <p className="text-gray-400 text-sm">Total User</p>
            <p className="text-3xl font-bold text-white">{users.length}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl text-center">
            <p className="text-gray-400 text-sm">Tier A</p>
            <p className="text-3xl font-bold text-yellow-400">{users.filter(u => u.tier === 'A').length}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl text-center">
            <p className="text-gray-400 text-sm">Tier B</p>
            <p className="text-3xl font-bold text-blue-400">{users.filter(u => u.tier === 'B').length}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl text-center">
            <p className="text-gray-400 text-sm">Tier D</p>
            <p className="text-3xl font-bold text-gray-400">{users.filter(u => u.tier === 'D').length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
