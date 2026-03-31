import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { normalizePermLevel } from "@/lib/permissions";
import {
    Package,
    MessageCircle,
    LogOut,
    Menu,
    X,
    ChevronRight,
    LayoutGrid,
    Zap,
    Video,
    Quote,
    BookOpen,
    FileText,
    HelpCircle,
    PanelTop,
    Search,
    ShoppingCart,
    FolderTree,
    Star,
    Image as ImageIcon,
    Settings,
    Warehouse,
    Users,
} from "lucide-react";

/** Staff dashboard: sidebar link if section is read or write (not none). */
function staffCanSeeHref(href, perms) {
    if (!perms || typeof perms !== "object") return false;
    if (href.startsWith("/homepage")) return normalizePermLevel(perms.homepage) !== "none";
    if (href.startsWith("/pages")) return normalizePermLevel(perms.pages) !== "none";
    if (href === "/navigation") return normalizePermLevel(perms.navigation) !== "none";
    if (href === "/search-config") return normalizePermLevel(perms.searchConfig) !== "none";
    if (href === "/products" || href === "/inventory") return normalizePermLevel(perms.products) !== "none";
    if (href === "/categories") return normalizePermLevel(perms.categories) !== "none";
    if (href === "/orders") return normalizePermLevel(perms.orders) !== "none";
    if (href === "/reviews") return normalizePermLevel(perms.reviews) !== "none";
    if (href === "/settings") return normalizePermLevel(perms.settings) !== "none";
    if (href === "/team") return false;
    return false;
}

function filterNavItems(items, user) {
    if (!user || user.role === "admin") return items;
    if (user.role !== "staff") return items;
    const perms = user.dashboardPermissions || {};
    return items.filter((it) => staffCanSeeHref(it.href, perms));
}

const HOMEPAGE_ITEMS = [
    { href: "/homepage/hero", icon: ImageIcon, label: "Hero" },
    { href: "/homepage/essentials", icon: LayoutGrid, label: "The Essentials" },
    { href: "/homepage/offers", icon: Zap, label: "Offers" },
    { href: "/homepage/real-stories", icon: Video, label: "Real stories" },
    { href: "/homepage/testimonials", icon: Quote, label: "Testimonials" },
    { href: "/homepage/journal", icon: BookOpen, label: "Journal / Blog" },
    { href: "/faqs", icon: MessageCircle, label: "Common questions (FAQ)" },
];

const PAGES_ITEMS = [
    { href: "/pages/about", icon: FileText, label: "About" },
    { href: "/pages/support", icon: HelpCircle, label: "Support" },
];

const SITEWIDE_ITEMS = [
    { href: "/navigation", icon: PanelTop, label: "Navigation (Navbar)" },
    { href: "/search-config", icon: Search, label: "Search config" },
    { href: "/products", icon: Package, label: "Products" },
    { href: "/inventory", icon: Warehouse, label: "Inventory" },
    { href: "/categories", icon: FolderTree, label: "Categories" },
    { href: "/orders", icon: ShoppingCart, label: "Orders" },
    { href: "/reviews", icon: Star, label: "Product reviews" },
    { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Layout({ children }) {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    // NOTE: These values come from client-only sources (localStorage + locale date).
    // To avoid hydration mismatch, we render stable wrappers and suppress warnings.
    let user = null;
    let dateLabel = "";
    if (typeof window !== "undefined") {
        try {
            const userData = localStorage.getItem("hustle_admin_user");
            user = userData ? JSON.parse(userData) : null;
        } catch {
            user = null;
        }
        try {
            dateLabel = new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        } catch {
            dateLabel = "";
        }
    }

    const homepageNav = useMemo(() => filterNavItems(HOMEPAGE_ITEMS, user), [user]);
    const pagesNav = useMemo(() => filterNavItems(PAGES_ITEMS, user), [user]);
    const siteWideNav = useMemo(() => {
        const base = [...SITEWIDE_ITEMS];
        if (user?.role === "admin") {
            base.splice(base.length - 1, 0, { href: "/team", icon: Users, label: "Team & access" });
        }
        return filterNavItems(base, user);
    }, [user]);
    const allNavItems = useMemo(
        () => [...HOMEPAGE_ITEMS, ...PAGES_ITEMS, ...(user?.role === "admin" ? [{ href: "/team", icon: Users, label: "Team & access" }] : []), ...SITEWIDE_ITEMS],
        [user],
    );

    useEffect(() => {
        const token = localStorage.getItem("hustle_admin_token");
        if (!token) {
            router.replace("/login");
            return;
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("hustle_admin_token");
        localStorage.removeItem("hustle_admin_user");
        router.replace("/login");
    };

    return (
        <div className="flex h-screen bg-[#f5f5f7] overflow-hidden">
            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-20 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:relative z-30 flex flex-col h-full bg-[#1d1d1f] text-white transition-all duration-300 ease-in-out ${sidebarOpen ? "w-64" : "w-0 lg:w-20"
                    } overflow-hidden`}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
                        <Image
                            src="/logo/huslelife%20logo.png"
                            alt="Husle"
                            width={28}
                            height={28}
                            className="object-contain w-full h-full"
                            priority
                        />
                    </div>
                    {sidebarOpen && (
                        <div className="min-w-0">
                            <p className="font-bold text-sm leading-tight truncate">HUSLE Admin</p>
                            <p className="text-xs text-white/50 truncate">Management Portal</p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 overflow-y-auto">
                    {sidebarOpen && (
                        <p className="mx-3 mb-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">Homepage</p>
                    )}
                    {homepageNav.map(({ href, icon: Icon, label }) => {
                        const active = router.pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl mb-1 transition-all duration-200 ${active
                                        ? "bg-white text-[#1d1d1f] font-semibold"
                                        : "text-white/70 hover:bg-white/10 hover:text-white"
                                    }`}
                            >
                                <Icon size={18} className="shrink-0" />
                                {sidebarOpen && <span className="text-sm truncate">{label}</span>}
                                {active && sidebarOpen && (
                                    <ChevronRight size={14} className="ml-auto opacity-50" />
                                )}
                            </Link>
                        );
                    })}
                    {sidebarOpen && (
                        <p className="mx-3 mt-4 mb-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">Pages</p>
                    )}
                    {pagesNav.map(({ href, icon: Icon, label }) => {
                        const active = router.pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl mb-1 transition-all duration-200 ${active
                                        ? "bg-white text-[#1d1d1f] font-semibold"
                                        : "text-white/70 hover:bg-white/10 hover:text-white"
                                    }`}
                            >
                                <Icon size={18} className="shrink-0" />
                                {sidebarOpen && <span className="text-sm truncate">{label}</span>}
                                {active && sidebarOpen && (
                                    <ChevronRight size={14} className="ml-auto opacity-50" />
                                )}
                            </Link>
                        );
                    })}
                    {sidebarOpen && (
                        <p className="mx-3 mt-4 mb-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">Site-wide</p>
                    )}
                    {siteWideNav.map(({ href, icon: Icon, label }) => {
                        const active = router.pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl mb-1 transition-all duration-200 ${active
                                        ? "bg-white text-[#1d1d1f] font-semibold"
                                        : "text-white/70 hover:bg-white/10 hover:text-white"
                                    }`}
                            >
                                <Icon size={18} className="shrink-0" />
                                {sidebarOpen && <span className="text-sm truncate">{label}</span>}
                                {active && sidebarOpen && (
                                    <ChevronRight size={14} className="ml-auto opacity-50" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User + Logout */}
                <div className="p-4 border-t border-white/10">
                    {sidebarOpen && (
                        <div className="mb-3 px-2">
                            <p className="text-sm font-medium truncate" suppressHydrationWarning>
                                {user ? (user.username || user.email || "") : ""}
                            </p>
                            <p className="text-xs text-white/40 truncate" suppressHydrationWarning>
                                {user ? (user.email || "") : ""}
                            </p>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200 text-sm"
                    >
                        <LogOut size={18} className="shrink-0" />
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Topbar */}
                <header className="flex items-center gap-4 px-6 py-4 bg-white/70 backdrop-blur-xl border-b border-black/5 sticky top-0 z-10">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 rounded-xl hover:bg-black/5 transition-colors"
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <div>
                        <h1 className="font-bold text-[#1d1d1f] text-base leading-tight">
                            {allNavItems.find((n) => n.href === router.pathname)?.label || "Dashboard"}
                        </h1>
                        <p className="text-xs text-[#6e6e73]" suppressHydrationWarning>
                            {dateLabel}
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <a
                            href="https://husle-dash-board.vercel.app/"
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1d1d1f] text-white hover:bg-black transition-colors"
                        >
                            Visit site →
                        </a>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
        </div>
    );
}
