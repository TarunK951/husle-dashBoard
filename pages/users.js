import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getUsers, getUser, getUserAnalytics } from "@/lib/api";
import { Search, X, TrendingUp, ShoppingCart, Package } from "lucide-react";
import Head from "next/head";

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);
    const [userDetail, setUserDetail] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        getUsers().then((d) => setUsers(d.data || d || [])).catch(console.error).finally(() => setLoading(false));
    }, []);

    const openUser = async (user) => {
        setSelected(user);
        setUserDetail(null);
        setAnalytics(null);
        setDetailLoading(true);
        try {
            const [detail, ana] = await Promise.all([getUser(user.id), getUserAnalytics(user.id)]);
            setUserDetail(detail);
            setAnalytics(ana);
        } catch (e) { console.error(e); }
        finally { setDetailLoading(false); }
    };

    const filtered = users.filter(
        (u) =>
            !search ||
            u.username?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase())
    );

    const formatCurrency = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);

    return (
        <>
            <Head><title>Users — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-5 fade-in">
                    <div className="relative w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e73]" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search users..."
                            className="pl-9 pr-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] transition-all w-full"
                        />
                    </div>

                    <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
                        ) : filtered.length === 0 ? (
                            <div className="py-16 text-center text-[#6e6e73] text-sm">No users found</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-black/5 bg-[#f5f5f7]/50">
                                            {["#", "USERNAME", "EMAIL", "ROLE", "JOINED", ""].map((h) => (
                                                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#6e6e73]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((u, i) => (
                                            <tr key={u.id} className="border-b border-black/5 hover:bg-[#f5f5f7]/40 transition-colors">
                                                <td className="px-5 py-3 text-[#6e6e73] text-xs">{i + 1}</td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-[#1d1d1f] flex items-center justify-center flex-shrink-0">
                                                            <span className="text-white text-xs font-bold">{(u.username || u.email || "?")[0].toUpperCase()}</span>
                                                        </div>
                                                        <span className="font-medium text-[#1d1d1f]">{u.username || "—"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-[#6e6e73]">{u.email}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-[#f5f5f7] text-[#6e6e73]"}`}>
                                                        {u.role || "user"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-xs text-[#6e6e73]">
                                                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "—"}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <button onClick={() => openUser(u)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#f5f5f7] hover:bg-black/10 transition-colors">
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* User detail panel */}
                {selected && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-end p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
                        <div className="bg-white w-full sm:w-96 h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl shadow-2xl fade-in overflow-y-auto flex flex-col">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 sticky top-0 bg-white z-10 sm:rounded-t-2xl">
                                <h2 className="font-bold text-[#1d1d1f]">User Details</h2>
                                <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-black/5"><X size={18} /></button>
                            </div>

                            {detailLoading ? (
                                <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
                            ) : (
                                <div className="p-6 space-y-5 flex-1">
                                    {/* Profile */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-[#1d1d1f] flex items-center justify-center">
                                            <span className="text-white text-xl font-bold">{(selected.username || selected.email || "?")[0].toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#1d1d1f]">{selected.username || "—"}</p>
                                            <p className="text-sm text-[#6e6e73]">{selected.email}</p>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${selected.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-[#f5f5f7] text-[#6e6e73]"}`}>
                                                {selected.role || "user"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Analytics */}
                                    {analytics && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-[#f5f5f7] rounded-xl p-3">
                                                <div className="flex items-center gap-1.5 text-[#6e6e73] mb-1">
                                                    <TrendingUp size={14} />
                                                    <span className="text-xs font-medium">Total Spent</span>
                                                </div>
                                                <p className="font-bold text-[#1d1d1f]">{formatCurrency(analytics.totalSpent)}</p>
                                            </div>
                                            <div className="bg-[#f5f5f7] rounded-xl p-3">
                                                <div className="flex items-center gap-1.5 text-[#6e6e73] mb-1">
                                                    <ShoppingCart size={14} />
                                                    <span className="text-xs font-medium">Orders</span>
                                                </div>
                                                <p className="font-bold text-[#1d1d1f]">{analytics.ordersCount || 0}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Orders */}
                                    {userDetail?.orders?.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-[#6e6e73] uppercase mb-2">Recent Orders</p>
                                            <div className="space-y-2">
                                                {userDetail.orders.slice(0, 5).map((o) => (
                                                    <div key={o.id} className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-3 py-2.5">
                                                        <div>
                                                            <p className="text-xs font-mono text-[#6e6e73]">#{o.id}</p>
                                                            <p className="text-sm font-medium text-[#1d1d1f]">{formatCurrency(o.totalAmount || 0)}</p>
                                                        </div>
                                                        <span className="text-xs font-medium text-[#6e6e73] capitalize">{o.status}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Cart items */}
                                    {userDetail?.cart?.items?.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-[#6e6e73] uppercase mb-2">Items in Cart</p>
                                            <div className="space-y-2">
                                                {userDetail.cart.items.slice(0, 5).map((item, i) => (
                                                    <div key={i} className="flex items-center gap-3 bg-[#f5f5f7] rounded-xl px-3 py-2.5">
                                                        {item.product?.images?.[0] && (
                                                            <img src={item.product.images[0]} className="w-8 h-8 rounded-lg object-cover" />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-[#1d1d1f] truncate">{item.product?.name}</p>
                                                            <p className="text-xs text-[#6e6e73]">Qty: {item.quantity}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Layout>
        </>
    );
}
