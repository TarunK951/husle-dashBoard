import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { getStats } from "@/lib/api";
import {
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
} from "lucide-react";
import Head from "next/head";

const statusColors = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const statusIcons = {
  pending: Clock,
  processing: TrendingUp,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
};

function StatCard({ label, value, icon: Icon, sub, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}
        >
          <Icon size={20} />
        </div>
        <span className="text-xs text-[#6e6e73] font-medium">{sub}</span>
      </div>
      <p className="text-2xl font-bold text-[#1d1d1f] tracking-tight">{value}</p>
      <p className="text-sm text-[#6e6e73] mt-0.5">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then((data) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);

  if (loading) {
    return (
      <Layout>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </Layout>
    );
  }

  const s = stats || {};
  const insights = s.insights || {};
  const recentOrders = s.recentOrders || [];

  return (
    <>
      <Head>
        <title>Dashboard — Hustle Admin</title>
      </Head>
      <Layout>
        <div className="space-y-6 fade-in">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Orders"
              value={s.totalOrders ?? "—"}
              icon={ShoppingCart}
              sub="All time"
              color="bg-blue-100 text-blue-600"
            />
            <StatCard
              label="Total Revenue"
              value={formatCurrency(s.totalRevenue)}
              icon={TrendingUp}
              sub="All time"
              color="bg-green-100 text-green-600"
            />
            <StatCard
              label="Total Users"
              value={s.totalUsers ?? "—"}
              icon={Users}
              sub="Registered"
              color="bg-purple-100 text-purple-600"
            />
            <StatCard
              label="Total Products"
              value={s.totalProducts ?? "—"}
              icon={Package}
              sub="Listed"
              color="bg-orange-100 text-orange-600"
            />
          </div>

          {/* Insights row */}
          {(insights.pendingOrders !== undefined ||
            insights.shippedOrders !== undefined) && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Pending", value: insights.pendingOrders, color: "bg-amber-100 text-amber-700" },
                  { label: "Processing", value: insights.processingOrders, color: "bg-blue-100 text-blue-700" },
                  { label: "Shipped", value: insights.shippedOrders, color: "bg-purple-100 text-purple-700" },
                  { label: "Delivered", value: insights.deliveredOrders, color: "bg-green-100 text-green-700" },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="bg-white rounded-2xl p-4 border border-black/5 flex items-center gap-3"
                  >
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${color}`}>
                      {label}
                    </span>
                    <span className="font-bold text-xl text-[#1d1d1f]">{value ?? 0}</span>
                  </div>
                ))}
              </div>
            )}

          {/* Recent Orders */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
              <h2 className="font-bold text-[#1d1d1f]">Recent Orders</h2>
              <a
                href="/orders"
                className="text-xs font-medium text-[#6e6e73] hover:text-[#1d1d1f] flex items-center gap-1 transition-colors"
              >
                View all <ArrowUpRight size={13} />
              </a>
            </div>
            {recentOrders.length === 0 ? (
              <div className="py-12 text-center text-[#6e6e73] text-sm">
                No recent orders
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5 bg-[#f5f5f7]/50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#6e6e73]">ORDER</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#6e6e73]">CUSTOMER</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#6e6e73]">AMOUNT</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#6e6e73]">STATUS</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#6e6e73]">DATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => {
                      const StatusIcon = statusIcons[order.status] || Clock;
                      return (
                        <tr
                          key={order.id}
                          className="border-b border-black/5 hover:bg-[#f5f5f7]/50 transition-colors"
                        >
                          <td className="px-6 py-3.5 font-mono text-xs text-[#6e6e73]">
                            #{order.id}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-[#1d1d1f]">
                            {order.user?.username || order.user?.email || "—"}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-[#1d1d1f]">
                            {formatCurrency(order.totalAmount || 0)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[order.status] || "bg-gray-100 text-gray-600"
                                }`}
                            >
                              <StatusIcon size={12} />
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-[#6e6e73] text-xs">
                            {new Date(order.createdAt).toLocaleDateString("en-IN")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
