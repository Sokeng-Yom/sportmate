import Link from "next/link";
import { Activity } from "lucide-react";

export default function Navbar() {
    return (
        <header className="px-6 py-4 flex justify-between items-center fixed top-0 w-full bg-white/70 dark:bg-slate-950/70 backdrop-blur-lg z-50 border-b border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
                <div className="bg-brand text-white p-2 rounded-xl shadow-lg shadow-brand/20">
                    <Activity size={24} />
                </div>
                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">SportMate</span>
            </div>
            <nav className="flex items-center gap-4">
                <Link href="/" className="text-sm font-semibold hover:text-brand transition">Home</Link>
                <Link href="/#features" className="text-sm font-semibold hover:text-brand transition">Features</Link>
                <Link href="/#how-it-works" className="text-sm font-semibold hover:text-brand transition">Community</Link>
                <Link href="/#about" className="text-sm font-semibold hover:text-brand transition">About</Link>
                <Link href="/login" className="text-sm font-semibold hover:text-brand transition">Log in</Link>
            </nav>
        </header>
    );
}
