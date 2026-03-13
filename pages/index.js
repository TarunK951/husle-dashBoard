import { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function IndexPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/homepage/hero");
    }, [router]);

    return (
        <>
            <Head><title>Hustle Admin</title></Head>
            <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
                <div className="inline-block w-8 h-8 border-2 border-[#1d1d1f] border-t-transparent rounded-full animate-spin" />
            </div>
        </>
    );
}
