"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight, UserCircle2, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    role: z.enum(["PLAYER", "VENUE_OWNER"], {
        required_error: "Please select an account type",
    }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [selectedRole, setSelectedRole] = useState<"PLAYER" | "VENUE_OWNER">("PLAYER");

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            role: "PLAYER",
        }
    });

    const handleRoleChange = (role: "PLAYER" | "VENUE_OWNER") => {
        setSelectedRole(role);
        setValue("role", role);
    };

    const onSubmit = (data: LoginFormValues) => {
        // Mock login logic
        localStorage.setItem("mock_session_role", data.role);

        if (data.role === "VENUE_OWNER") {
            router.push("/venue/dashboard");
        } else {
            router.push("/player/dashboard");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-6 relative overflow-hidden">

            <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-brand/10 rounded-full blur-3xl" />

            <Link href="/" className="absolute top-8 left-8 font-extrabold text-xl text-slate-800 dark:text-white">
                SportMate
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-brand/5 border border-gray-100 dark:border-slate-800 p-8 md:p-10 relative z-10"
            >
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold mb-2 text-slate-900 dark:text-white">Welcome back</h1>
                    <p className="text-slate-500">Log in to SportMate to continue.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    {/* Role Selection */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">I am logging in as</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleRoleChange("PLAYER")}
                                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${selectedRole === "PLAYER"
                                        ? "border-brand bg-brand/5 text-brand shadow-brand/10 shadow-sm"
                                        : "border-gray-100 bg-gray-50 dark:bg-slate-800 dark:border-slate-700 text-slate-500 hover:border-gray-300"
                                    }`}
                            >
                                <UserCircle2 size={18} />
                                <span className="font-semibold text-sm">Player</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleRoleChange("VENUE_OWNER")}
                                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${selectedRole === "VENUE_OWNER"
                                        ? "border-brand bg-brand/5 text-brand shadow-brand/10 shadow-sm"
                                        : "border-gray-100 bg-gray-50 dark:bg-slate-800 dark:border-slate-700 text-slate-500 hover:border-gray-300"
                                    }`}
                            >
                                <Building2 size={18} />
                                <span className="font-semibold text-sm">Venue Owner</span>
                            </button>
                        </div>
                        {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                        <input
                            {...register("email")}
                            type="email"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                            placeholder="john@example.com"
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                    </div>

                    <div>
                        <div className="flex justify-between mb-1.5">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Password</label>
                            <a href="#" className="text-xs font-semibold text-brand hover:underline">Forgot?</a>
                        </div>
                        <input
                            {...register("password")}
                            type="password"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                            placeholder="••••••••"
                        />
                        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
                    </div>

                    <button
                        type="submit"
                        className="w-full mt-6 bg-brand hover:bg-brand-dark text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        Log In <ArrowRight size={18} />
                    </button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-6 md:mt-8">
                    Don't have an account? <Link href="/register" className="text-brand font-semibold hover:underline">Get Started</Link>
                </p>
            </motion.div>
        </div>
    );
}
