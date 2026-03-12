import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
    LayoutDashboard,
    Package,
    Tag,
    ShoppingCart,
    Image,
    MessageCircle,
    Ticket,
    Users,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Home,
    LayoutGrid,
    Heading,
    Zap,
    Palette,
    Video,
    Quote,
    BookOpen,
    FileText,
} from "lucide-react";

const HOMEPAGE_ITEMS = [
    { href: "/homepage/hero", icon: Home, label: "Hero" },
    { href: "/homepage/essentials", icon: LayoutGrid, label: "The Essentials" },
    { href: "/homepage/section-titles", icon: Heading, label: "Section titles" },
    { href: "/homepage/offers", icon: Zap, label: "Offers" },
    { href: "/homepage/design-inspiration", icon: Palette, label: "Design Inspiration" },
    { href: "/homepage/real-stories", icon: Video, label: "Real stories" },
    { href: "/homepage/testimonials", icon: Quote, label: "Testimonials" },
    { href: "/homepage/journal", icon: BookOpen, label: "Journal" },
    { href: "/faqs", icon: MessageCircle, label: "Common questions (FAQ)" },
];

const PAGES_ITEMS = [
    { href: "/pages/about", icon: FileText, label: "About" },
];

const MAIN_NAV_ITEMS = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/products", icon: Package, label: "Products" },
    { href: "/categories", icon: Tag, label: "Categories" },
    { href: "/orders", icon: ShoppingCart, label: "Orders" },
    { href: "/banners", icon: Image, label: "Banners" },
    { href: "/offers", icon: Ticket, label: "Offers" },
    { href: "/users", icon: Users, label: "Users" },
];

export default function Layout({ children }) {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [user, setUser] = useState(null);
    const [dateLabel, setDateLabel] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("hustle_admin_token");
        const userData = localStorage.getItem("hustle_admin_user");
        if (!token) {
            router.replace("/login");
            return;
        }
        if (userData) setUser(JSON.parse(userData));
    }, [router]);

    useEffect(() => {
        setDateLabel(
            new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            })
        );
    }, []);

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
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0">
                        <span className="text-[#1d1d1f] font-black text-sm">HL</span>
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
                    {HOMEPAGE_ITEMS.map(({ href, icon: Icon, label }) => {
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
                    {PAGES_ITEMS.map(({ href, icon: Icon, label }) => {
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
                        <p className="mx-3 mt-4 mb-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">Manage</p>
                    )}
                    {MAIN_NAV_ITEMS.map(({ href, icon: Icon, label }) => {
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
                    {sidebarOpen && user && (
                        <div className="mb-3 px-2">
                            <p className="text-sm font-medium truncate">{user.username || user.email}</p>
                            <p className="text-xs text-white/40 truncate">{user.email}</p>
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
                            {[...HOMEPAGE_ITEMS, ...PAGES_ITEMS, ...MAIN_NAV_ITEMS].find((n) => n.href === router.pathname)?.label || "Dashboard"}
                        </h1>
                        <p className="text-xs text-[#6e6e73]">
                            {dateLabel}
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <a
                            href="https://hustlelifestyle.netlify.app"
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1d1d1f] text-white hover:bg-black transition-colors"
                        >
                            View Site →
                        </a>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
        </div>
    );
}
