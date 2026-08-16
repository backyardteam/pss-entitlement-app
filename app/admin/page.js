'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [rules, setRules] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [message, setMessage] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTickets: 0,
    tierDistribution: { A: 0, B: 0, C: 0, D: 0 },
    ticketsByMatch: []
  });

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
        await fetchAllData();
        setLoading(false);

      } catch (err) {
        console.error('Error:', err);
        setLoading(false);
      }
    };
    checkAdmin();
  }, []);

  const fetchAllData = async () => {
    // Ambil semua user
    const { data: userData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(userData || []);

    // Ambil rules
    const { data: ruleData } = await supabase
      .from('entitlement_rules')
      .select('*')
      .order('purchase_day', { ascending: true });
    setRules(ruleData || []);

    // Ambil semua tiket untuk statistik
    const { data: ticketData } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });
    setTickets(ticketData || []);

    // Hitung statistik
    const tierDist = { A: 0, B: 0, C: 0, D: 0 };
    userData?.forEach(u => {
      if (tierDist[u.tier] !== undefined) tierDist[u.tier]++;
    });

    // Hitung tiket per match (group by match_date)
    const matchMap = {};
    ticketData?.forEach(t => {
      if (!matchMap[t.match_date]) matchMap[t.match_date] = 0;
      matchMap[t.match_date]++;
    });
    const ticketsByMatch = Object.entries(matchMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10); // 10 match terakhir

    setStats({
      totalUsers: userData?.length || 0,
      totalTickets: ticketData?.length || 0,
      tierDistribution: tierDist,
      ticketsByMatch
    });
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
      await fetchAllData();
    }
  };

  const toggleCommunityVerification = async (userId, currentStatus, currentTier) => {
    setMessage('');
    const newStatus = !currentStatus;
    // Jika diverifikasi, naikkan ke Tier B (kecuali sudah A)
    const newTier = newStatus ? (currentTier === 'A' ? 'A' : 'B') : currentTier;
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        is_community_verified: newStatus,
        community_name: newStatus ? 'BCS Verified' : 'None',
        tier: newTier
      })
      .eq('id', userId);
      
    if (error) {
      setMessage(`❌ Gagal: ${error.message}`);
    } else {
      setMessage(`✅ Komunitas ${newStatus ? 'diverifikasi' : 'dicabut'}! Tier berubah ke ${newTier}`);
      await fetchAllData();
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
      await fetchAllData();
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

  // Data untuk pie chart tier distribution
  const pieData = Object.entries(stats.tierDistribution).map(([name, value]) => ({
    name,
    value
  })).filter(d => d.value > 0);

  const COLORS = ['#FCD34D', '#60A5FA', '#34D399', '#9CA3AF'];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
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

        {/* STATISTIK CEPAT */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded-xl text-center border border-gray-700">
            <p className="text-gray-400 text-sm">Total User</p>
            <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl text-center border border-gray-700">
            <p className="text-gray-400 text-sm">Total Tiket</p>
            <p className="text-3xl font-bold text-white">{stats.totalTickets}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl text-center border border-gray-700">
            <p className="text-gray-400 text-sm">Tier A</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.tierDistribution.A}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl text-center border border-gray-700">
            <p className="text-gray-400 text-sm">Tier B</p>
            <p className="text-3xl font-bold text-blue-400">{stats.tierDistribution.B}</p>
          </div>
        </div>

        {/* GRAFIK */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Pie Chart: Tier Distribution */}
          <div className="bg-gray-800 p-6 rounded-2xl">
            <h3 className="text-lg font-bold mb-4">📊 Distribusi Tier</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center">Belum ada data user</p>
            )}
          </div>

          {/* Bar Chart: Tiket per Match */}
          <div className="bg-gray-800 p-6 rounded-2xl">
            <h3 className="text-lg font-bold mb-4">📈 Tiket per Match</h3>
            {stats.ticketsByMatch.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.ticketsByMatch}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
                  <Bar dataKey="count" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center">Belum ada data tiket</p>
            )}
          </div>
        </div>

        {/* USER MANAGEMENT + VERIFIKASI KOMUNITAS */}
        <div className="bg-gray-800 p-6 rounded-2xl">
          <h2 className="text-xl font-bold mb-4">👥 Manajemen User ({users.length})</h2>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700 sticky top-0">
                <tr>
                  <th className="p-2 text-left">Nama</th>
                  <th className="p-2 text-left">Tier</th>
                  <th className="p-2 text-left">Komunitas</th>
                  <th className="p-2 text-left">Admin</th>
                  <th className="p-2 text-left">Aksi Tier</th>
                  <th className="p-2 text-left">Verif Komunitas</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="p-2">{user.full_name || 'N/A'}</td>
                    <td className="p-2 font-bold text-yellow-300">{user.tier}</td>
                    <td className="p-2">
                      {user.is_community_verified ? (
                        <span className="text-green-400">✅ {user.community_name}</span>
                      ) : (
                        <span className="text-gray-400">❌</span>
                      )}
                    </td>
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
                    <td className="p-2">
                      <button
                        onClick={() => toggleCommunityVerification(
                          user.id,
                          user.is_community_verified,
                          user.tier
                        )}
                        className={`px-2 py-1 rounded text-xs transition ${
                          user.is_community_verified
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {user.is_community_verified ? 'Cabut' : 'Verifikasi'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ATURAN PURCHASE WINDOW */}
        <div className="mt-6 bg-gray-800 p-6 rounded-2xl">
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
    </div>
  );
}
