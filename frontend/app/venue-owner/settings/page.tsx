"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { User, Building2, Bell, Lock, Camera } from "lucide-react";
import { useVenueOwnerData } from "../context/VenueOwnerContext";
import { ToastProvider, useToast } from "../components/ui";

const profileSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(6, "Phone too short"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const businessSchema = z.object({
    businessName: z.string().min(2, "Business name too short"),
    payoutAccount: z.string().optional(),
});

type BusinessFormValues = z.infer<typeof businessSchema>;

const passwordSchema = z.object({
    currentPassword: z.string().min(6, "Required"),
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

type PasswordFormValues = z.infer<typeof passwordSchema>;

type Tab = "profile" | "business" | "notifications" | "security";
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profile", icon: <User size={16} /> },
    { id: "business", label: "Business", icon: <Building2 size={16} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={16} /> },
    { id: "security", label: "Security", icon: <Lock size={16} /> },
];

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
            {children}
            {error && <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>}
        </div>
    );
}

function inputCls(extra = "") {
    return `w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all ${extra}`;
}

function SaveButton({ loading }: { loading: boolean }) {
    return (
        <button type="submit" disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center gap-2 disabled:opacity-75">
            {loading ? (
                <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving…</>
            ) : "Save Changes"}
        </button>
    );
}

function ProfileSection() {
    const { profile, updateProfile } = useVenueOwnerData();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: { name: profile.name, email: profile.email, phone: profile.phone },
    });

    const onSubmit = async (data: ProfileFormValues) => {
        setSaving(true);
        await new Promise(r => setTimeout(r, 1200));
        updateProfile(data);
        setSaving(false);
        toast("Profile updated successfully.");
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="flex items-center gap-5 pb-5 border-b border-slate-100">
                <div className="relative">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`} alt="Avatar" className="w-20 h-20 rounded-full bg-slate-100 border-4 border-white shadow" />
                    <button type="button" className="absolute bottom-0 right-0 w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow hover:bg-emerald-700 transition-colors">
                        <Camera size={13} />
                    </button>
                </div>
                <div>
                    <p className="font-bold text-slate-900">{profile.name}</p>
                    <p className="text-sm text-slate-500">{profile.email}</p>
                </div>
            </div>
            <FormField label="Full Name" error={errors.name?.message}>
                <input {...register("name")} className={inputCls()} />
            </FormField>
            <FormField label="Email Address" error={errors.email?.message}>
                <input {...register("email")} type="email" className={inputCls()} />
            </FormField>
            <FormField label="Phone Number" error={errors.phone?.message}>
                <input {...register("phone")} className={inputCls()} />
            </FormField>
            <div className="flex justify-end pt-2">
                <SaveButton loading={saving} />
            </div>
        </form>
    );
}

function BusinessSection() {
    const { profile, updateProfile } = useVenueOwnerData();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm<BusinessFormValues>({
        resolver: zodResolver(businessSchema),
        defaultValues: { businessName: profile.businessName, payoutAccount: "" },
    });

    const onSubmit = async (data: BusinessFormValues) => {
        setSaving(true);
        await new Promise(r => setTimeout(r, 1200));
        updateProfile({ businessName: data.businessName });
        setSaving(false);
        toast("Business info updated.");
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <FormField label="Business Name" error={errors.businessName?.message}>
                <input {...register("businessName")} className={inputCls()} />
            </FormField>
            <FormField label="Payout Account (placeholder)">
                <input {...register("payoutAccount")} placeholder="e.g. Bank account / ABA number" className={inputCls()} />
            </FormField>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 font-medium">
                Real payout integration will be configured in a future release.
            </div>
            <div className="flex justify-end pt-2">
                <SaveButton loading={saving} />
            </div>
        </form>
    );
}

function Toggle({ label, description, defaultChecked }: { label: string; description: string; defaultChecked?: boolean }) {
    const [checked, setChecked] = useState(defaultChecked ?? false);
    return (
        <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
            <div>
                <p className="font-semibold text-slate-900 text-sm">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            </div>
            <button type="button" onClick={() => setChecked(c => !c)} role="switch" aria-checked={checked}
                className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-emerald-500" : "bg-slate-200"}`}>
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
            </button>
        </div>
    );
}

function NotificationsSection() {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const save = async () => {
        setSaving(true);
        await new Promise(r => setTimeout(r, 800));
        setSaving(false);
        toast("Notifications updated.");
    };
    return (
        <div>
            <Toggle label="New Booking" description="Get notified when a player books one of your courts." defaultChecked />
            <Toggle label="Booking Cancelled" description="Get notified when a player cancels a booking." defaultChecked />
            <Toggle label="New Review" description="Get notified when a player leaves a review." defaultChecked />
            <Toggle label="Messages" description="Get notified for new chat messages." defaultChecked />
            <Toggle label="Weekly Summary" description="Receive a weekly report of your venue activity." />
            <div className="flex justify-end pt-4">
                <button onClick={save} disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center gap-2 disabled:opacity-75">
                    {saving ? "Saving…" : "Save Preferences"}
                </button>
            </div>
        </div>
    );
}

function SecuritySection() {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const { register, handleSubmit, formState: { errors }, reset } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

    const onSubmit = async (data: PasswordFormValues) => {
        setSaving(true);
        await new Promise(r => setTimeout(r, 1200));
        setSaving(false);
        reset();
        toast("Password changed successfully.");
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <FormField label="Current Password" error={errors.currentPassword?.message}>
                <input {...register("currentPassword")} type="password" placeholder="••••••••" className={inputCls()} />
            </FormField>
            <FormField label="New Password" error={errors.newPassword?.message}>
                <input {...register("newPassword")} type="password" placeholder="At least 8 characters" className={inputCls()} />
            </FormField>
            <FormField label="Confirm New Password" error={errors.confirmPassword?.message}>
                <input {...register("confirmPassword")} type="password" placeholder="••••••••" className={inputCls()} />
            </FormField>
            <div className="flex justify-end pt-2">
                <SaveButton loading={saving} />
            </div>
        </form>
    );
}

function SettingsContent() {
    const [activeTab, setActiveTab] = useState<Tab>("profile");

    const sections: Record<Tab, React.ReactNode> = {
        profile: <ProfileSection />,
        business: <BusinessSection />,
        notifications: <NotificationsSection />,
        security: <SecuritySection />,
    };

    return (
        <div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-6">Settings</h1>
            <div className="flex flex-col sm:flex-row gap-6">
                {/* Tab Nav */}
                <nav className="sm:w-48 flex-shrink-0">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {TABS.map((tab) => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold transition-colors border-b border-slate-50 last:border-0 ${activeTab === tab.id ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"}`}>
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Content */}
                <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                        {sections[activeTab]}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

export default function SettingsPage() {
    return <ToastProvider><SettingsContent /></ToastProvider>;
}
