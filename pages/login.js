import { useState } from "react";
import { useRouter } from "next/router";
import { login } from "@/lib/api";
import { Eye, EyeOff, ShoppingBag } from "lucide-react";
import Head from "next/head";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const data = await login(email, password);
            if (data.user?.role !== "admin") {
                setError("Access denied. Admin accounts only.");
                setLoading(false);
                return;
            }
            const token = data.token ?? data.accessToken ?? data.access_token;
            if (!token || (typeof token !== "string" && typeof token !== "number")) {
                setError("Login response missing token.");
                setLoading(false);
                return;
            }
            localStorage.setItem("hustle_admin_token", String(token));
            localStorage.setItem("hustle_admin_user", JSON.stringify(data.user));
            router.replace("/");
        } catch (err) {
            setError(err.message || "Invalid credentials");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head>
                <title>Admin Login — Hustle Lifestyle</title>
            </Head>
            <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
                <div className="w-full max-w-md fade-in">
                    {/* Card */}
                    <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-8 border border-black/5">
                        {/* Logo */}
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-16 h-16 rounded-2xl bg-[#1d1d1f] flex items-center justify-center mb-4 shadow-lg">
                                <ShoppingBag size={28} className="text-white" />
                            </div>
                            <h1 className="font-bold text-2xl text-[#1d1d1f] tracking-tight">
                                Hustle Admin
                            </h1>
                            <p className="text-sm text-[#6e6e73] mt-1">
                                Management portal for hustlelifestyle.netlify.app
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="admin@example.com"
                                    className="w-full px-4 py-3 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] transition-all text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPass ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 pr-11 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] transition-all text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
                                    >
                                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#1d1d1f] text-white py-3 rounded-xl font-semibold text-sm hover:bg-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                                        </svg>
                                        Signing in...
                                    </span>
                                ) : (
                                    "Sign in"
                                )}
                            </button>
                        </form>
                    </div>

                    <p className="text-center text-xs text-[#6e6e73] mt-6">
                        Admin access only · Hustle Lifestyle © {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </>
    );
}
