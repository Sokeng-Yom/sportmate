"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Building2, UserCircle2, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Must contain at least one uppercase letter")
        .regex(/[0-9]/, "Must contain at least one number"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedRole, setSelectedRole] = useState<"PLAYER" | "VENUE_OWNER" | null>(null);

    const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmitStep1 = (data: RegisterFormValues) => {
        // In a real app, you'd store this or call API. Here we just go to step 2.
        setStep(2);
    };

    const handleRoleSelect = (role: "PLAYER" | "VENUE_OWNER") => {
        setSelectedRole(role);
    };

    const finalizeRegistration = () => {
        if (!selectedRole) return;

        // Simulate setting mock session/cookie
        localStorage.setItem("mock_session_role", selectedRole);

        if (selectedRole === "PLAYER") {
            router.push("/player/onboarding");
        } else {
            router.push("/venue/register");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-6 relative overflow-hidden">

            {/* Background decoration */}
            <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-brand/10 rounded-full blur-3xl" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-3xl" />

            <Link href="/" className="absolute top-8 left-8 font-extrabold text-xl text-slate-800 dark:text-white">
                SportMate
            </Link>

            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-brand/5 border border-gray-100 dark:border-slate-800 p-8 md:p-12 relative z-10 overflow-hidden">

                {/* Progress header */}
                <div className="flex gap-4 mb-10">
                    <div className="flex-1 h-1.5 rounded-full bg-brand" />
                    <div className={`flex-1 h-1.5 rounded-full transition-colors ${step === 2 ? 'bg-brand' : 'bg-gray-200 dark:bg-slate-800'}`} />
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="mb-8">
                                <h1 className="text-3xl font-extrabold mb-2 text-slate-900 dark:text-white">Create an account</h1>
                                <p className="text-slate-500">Join the ultimate sports network.</p>
                            </div>

                            <form onSubmit={handleSubmit(onSubmitStep1)} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                                    <input
                                        {...register("name")}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                                        placeholder="John Doe"
                                    />
                                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
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
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                                    <input
                                        {...register("password")}
                                        type="password"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                                        placeholder="••••••••"
                                    />
                                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}

                                    {/* Basic password hint for UI sake */}
                                    {!errors.password && (
                                        <p className="text-slate-400 text-xs mt-2 flex items-center gap-1">
                                            <CheckCircle2 size={12} /> Needs 8+ chars, 1 uppercase, 1 number
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="w-full mt-6 bg-brand hover:bg-brand-dark text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand/20 transition-all flex items-center justify-center gap-2"
                                >
                                    Continue <ArrowRight size={18} />
                                </button>

                                <p className="text-center text-sm text-slate-500 mt-6">
                                    Already have an account? <Link href="/login" className="text-brand font-semibold hover:underline">Log in</Link>
                                </p>
                            </form>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="mb-8">
                                <h1 className="text-3xl font-extrabold mb-2 text-slate-900 dark:text-white">How will you use SportMate?</h1>
                                <p className="text-slate-500">Choose your account type.</p>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                {/* Player Card */}
                                <button
                                    onClick={() => handleRoleSelect("PLAYER")}
                                    className={`flex flex-col text-left p-6 rounded-2xl border-2 transition-all ${selectedRole === "PLAYER"
                                            ? "border-brand bg-brand/5 shadow-brand/10 shadow-lg"
                                            : "border-gray-100 hover:border-gray-300 dark:border-slate-800 dark:hover:border-slate-600 bg-white dark:bg-slate-900"
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${selectedRole === "PLAYER" ? "bg-brand text-white" : "bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
                                        <UserCircle2 size={24} />
                                    </div>
                                    <h3 className="font-bold text-lg mb-2">Player</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">Find partners, join matches, chat, and book courts.</p>
                                </button>

                                {/* Venue Owner Card */}
                                <button
                                    onClick={() => handleRoleSelect("VENUE_OWNER")}
                                    className={`flex flex-col text-left p-6 rounded-2xl border-2 transition-all ${selectedRole === "VENUE_OWNER"
                                            ? "border-brand bg-brand/5 shadow-brand/10 shadow-lg"
                                            : "border-gray-100 hover:border-gray-300 dark:border-slate-800 dark:hover:border-slate-600 bg-white dark:bg-slate-900"
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${selectedRole === "VENUE_OWNER" ? "bg-brand text-white" : "bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
                                        <Building2 size={24} />
                                    </div>
                                    <h3 className="font-bold text-lg mb-2">Venue Owner</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">List your venue, manage courts, and view bookings.</p>
                                </button>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <button
                                    onClick={() => setStep(1)}
                                    className="px-6 py-3.5 rounded-xl font-bold bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={finalizeRegistration}
                                    disabled={!selectedRole}
                                    className="flex-1 bg-brand hover:bg-brand-dark disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand/20 transition-all flex items-center justify-center gap-2"
                                >
                                    Complete Registration <CheckCircle2 size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
