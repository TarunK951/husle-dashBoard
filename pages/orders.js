import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getOrders, updateOrderStatus, shipOrder } from "@/lib/api";
import { Clock, CheckCircle, Truck, XCircle, TrendingUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import Head from "next/head";

const STATUSES = ["all", "pending", "processing", "shipped", "delivered", "cancelled"];

const statusColors = {
    pending: "bg-amber-100 text-amber-700",
    processing: "bg-blue-100 text-blue-700",
    shipped: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};

const INPUT = "px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] text-sm focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] transition-all";

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [updatingId, setUpdatingId] = useState(null);
    const [shippingId, setShippingId] = useState(null);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 15 };
            if (status !== "all") params.status = status;
            const data = await getOrders(params);
            setOrders(data.orders || data.data || []);
            if (data.totalPages) setTotalPages(data.totalPages);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchOrders(); }, [status, page]);

    const handleStatusChange = async (orderId, newStatus) => {
        setUpdatingId(orderId);
        try {
            await updateOrderStatus(orderId, newStatus);
            fetchOrders();
        } catch (e) { alert(e.message); }
        finally { setUpdatingId(null); }
    };

    const handleShip = async (orderId) => {
        if (!confirm("Send this to Shiprocket?")) return;
        setShippingId(orderId);
        try {
            await shipOrder(orderId);
            alert("Order shipped via Shiprocket!");
            fetchOrders();
        } catch (e) { alert(e.message); }
        finally { setShippingId(null); }
    };

    const formatCurrency = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);

    return (
        <>
            <Head><title>Orders — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-5 fade-in">
                    {/* Status filter tabs */}
                    <div className="flex flex-wrap gap-2">
                        {STATUSES.map((s) => (
                            <button
                                key={s}
                                onClick={() => { setStatus(s); setPage(1); }}
                                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${status === s
                                    ? "bg-[#1d1d1f] text-white"
                                    : "bg-white border border-black/10 text-[#6e6e73] hover:border-black/30"
                                    }`}
                            >
                                {s === "all" ? "All Orders" : s}
                            </button>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-6 space-y-3">
                                {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="py-16 text-center text-[#6e6e73] text-sm">No orders found</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-black/5 bg-[#f5f5f7]/50">
                                            {["ORDER ID", "CUSTOMER", "ITEMS", "AMOUNT", "STATUS", "DATE", "ACTIONS"].map((h) => (
                                                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6e6e73] whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map((order) => (
                                            <tr key={order.id} className="border-b border-black/5 hover:bg-[#f5f5f7]/40 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs text-[#6e6e73]">#{order.id}</td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-[#1d1d1f]">{order.user?.username || order.user?.email || "—"}</p>
                                                    <p className="text-xs text-[#6e6e73]">{order.user?.email || ""}</p>
                                                </td>
                                                <td className="px-4 py-3 text-[#6e6e73]">{order.items?.length ?? order.orderItems?.length ?? "—"}</td>
                                                <td className="px-4 py-3 font-semibold text-[#1d1d1f]">{formatCurrency(order.totalAmount)}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[order.status] || "bg-gray-100 text-gray-600"}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-[#6e6e73] whitespace-nowrap">
                                                    {new Date(order.createdAt).toLocaleDateString("en-IN")}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            disabled={updatingId === order.id}
                                                            value={order.status}
                                                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                            className="text-xs px-2.5 py-1.5 rounded-lg border border-black/10 bg-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] disabled:opacity-50"
                                                        >
                                                            {["pending", "processing", "shipped", "delivered", "cancelled"].map((s) => (
                                                                <option key={s} value={s}>{s}</option>
                                                            ))}
                                                        </select>
                                                        {order.status === "processing" && (
                                                            <button
                                                                onClick={() => handleShip(order.id)}
                                                                disabled={shippingId === order.id}
                                                                className="text-xs px-2.5 py-1.5 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium transition-colors disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                                                            >
                                                                <Truck size={12} />
                                                                {shippingId === order.id ? "..." : "Ship"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3">
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                                className="p-2 rounded-xl border border-black/10 hover:bg-[#1d1d1f] hover:text-white disabled:opacity-40 transition-all">
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm text-[#6e6e73]">Page {page} of {totalPages}</span>
                            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="p-2 rounded-xl border border-black/10 hover:bg-[#1d1d1f] hover:text-white disabled:opacity-40 transition-all">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </Layout>
        </>
    );
}
