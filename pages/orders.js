import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { getOrders } from "@/lib/api";
import { ChevronLeft, ChevronRight, Package, CreditCard, Banknote, ArrowRight } from "lucide-react";
import Head from "next/head";

const STATUS_STYLES = {
    pending:    "bg-amber-50 text-amber-700 border-amber-200",
    paid:       "bg-sky-50 text-sky-700 border-sky-200",
    processing: "bg-blue-50 text-blue-700 border-blue-200",
    shipped:    "bg-purple-50 text-purple-700 border-purple-200",
    delivered:  "bg-green-50 text-green-700 border-green-200",
    cancelled:  "bg-red-50 text-red-700 border-red-200",
};

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency", currency: "INR", maximumFractionDigits: 0,
    }).format(amount || 0);
}

export default function OrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");

    const fetchOrders = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getOrders({ page, limit: 15, status: statusFilter || undefined });
            setOrders(data.orders || data.data || []);
            setTotal(data.total || 0);
            if (data.totalPages) setTotalPages(data.totalPages);
        } catch (e) {
            setError(e?.message || "Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrders(); }, [page, statusFilter]);

    return (
        <>
            <Head><title>Orders — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-5 fade-in">
                    {/* Header */}
                    <div className="flex flex-wrap gap-3 items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-[#1d1d1f]">Orders</h1>
                            {!loading && <p className="text-sm text-[#6e6e73] mt-0.5">{total} total orders</p>}
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="px-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]"
                        >
                            <option value="">All statuses</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
                            <p className="text-sm text-red-700">{error}</p>
                            <button onClick={fetchOrders} className="text-sm font-medium text-red-700 hover:underline">Retry</button>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-6 space-y-3">
                                {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="py-20 text-center">
                                <Package size={36} className="mx-auto text-[#c7c7cc] mb-3" />
                                <p className="text-[#6e6e73] text-sm font-medium">No orders found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-black/5 bg-[#f5f5f7]/60">
                                            {["Order", "Customer", "Items", "Payment", "Amount", "Order Status", "Payment Status", "Date", ""].map((h) => (
                                                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-[#6e6e73] whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map((order) => (
                                            <tr
                                                key={order.id}
                                                onClick={() => router.push(`/orders/${order.id}`)}
                                                className="border-b border-black/5 hover:bg-[#f5f5f7]/60 transition-colors cursor-pointer"
                                            >
                                                <td className="px-5 py-4">
                                                    <span className="font-mono font-bold text-[#1d1d1f] text-xs">#{order.id}</span>
                                                    {order.awbCode && (
                                                        <p className="text-[10px] text-[#86868b] font-mono mt-0.5">{order.awbCode}</p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <p className="font-medium text-[#1d1d1f]">{order.user?.username || "—"}</p>
                                                    {order.shippingAddress?.fullName && (
                                                        <p className="text-xs text-[#86868b]">{order.shippingAddress.fullName}</p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-[#6e6e73]">
                                                    {Array.isArray(order.items) ? order.items.length : "—"}
                                                </td>
                                                <td className="px-5 py-4">
                                                    {order.paymentId ? (
                                                        <span className="inline-flex items-center gap-1 text-xs text-[#6e6e73]">
                                                            <CreditCard size={11} /> Online
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                                            <Banknote size={11} /> COD
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 font-semibold text-[#1d1d1f] whitespace-nowrap">
                                                    {formatCurrency(order.totalAmount)}
                                                </td>
                                                {/* Order fulfilment status */}
                                                <td className="px-5 py-4">
                                                    {(() => {
                                                        const s = order.status === "paid" ? "processing" : order.status;
                                                        return (
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${STATUS_STYLES[s] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                                                                {s}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                {/* Payment status */}
                                                <td className="px-5 py-4">
                                                    {(() => {
                                                        const isCOD = !order.paymentId;
                                                        if (order.refundStatus === "processed") return <span className="text-xs font-semibold text-orange-600">Refunded</span>;
                                                        if (isCOD) return order.status === "delivered"
                                                            ? <span className="text-xs font-semibold text-green-600">COD Collected</span>
                                                            : <span className="text-xs font-semibold text-amber-600">COD Pending</span>;
                                                        return <span className="text-xs font-semibold text-green-600">Paid Online</span>;
                                                    })()}
                                                </td>
                                                <td className="px-5 py-4 text-[#86868b] text-xs whitespace-nowrap">
                                                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <ArrowRight size={14} className="text-[#c7c7cc]" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-xl border border-black/10 hover:bg-[#1d1d1f] hover:text-white disabled:opacity-30 transition-all"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm text-[#6e6e73]">Page <span className="font-semibold text-[#1d1d1f]">{page}</span> of {totalPages}</span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded-xl border border-black/10 hover:bg-[#1d1d1f] hover:text-white disabled:opacity-30 transition-all"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </Layout>
        </>
    );
}
