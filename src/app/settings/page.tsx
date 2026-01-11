"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Nav } from "@/components/nav";
import { SubscriptionTier, SUBSCRIPTION_TIERS } from "@/lib/stripe/tiers";

interface UserSettings {
  default_currency: "USD" | "AUD";
  cost_basis_method: "FIFO" | "LIFO" | "HIFO";
  tax_jurisdiction: "US" | "AU" | "OTHER";
  timezone: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  default_currency: "USD",
  cost_basis_method: "FIFO",
  tax_jurisdiction: "US",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("free");
  const [hasPaidExportFee, setHasPaidExportFee] = useState(false);
  const [showExportPaywall, setShowExportPaywall] = useState(false);
  const [processingExportFee, setProcessingExportFee] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [apiKeys, setApiKeys] = useState<Array<{
    id: string;
    name: string;
    key_prefix: string;
    last_used_at: string | null;
    created_at: string;
  }>>([]);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [creatingApiKey, setCreatingApiKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setEmail(user.email || null);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("settings, subscription_tier, has_paid_export_fee")
        .eq("id", user.id)
        .single();

      if (profile?.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...profile.settings });
      }
      if (profile?.subscription_tier) {
        setSubscriptionTier(profile.subscription_tier as SubscriptionTier);

        // Load API keys for Advisor tier users
        if (profile.subscription_tier === "advisor") {
          fetch("/api/v1/keys")
            .then(res => res.json())
            .then(data => {
              if (data.data) {
                setApiKeys(data.data);
              }
            })
            .catch(console.error);
        }
      }
      if (profile?.has_paid_export_fee) {
        setHasPaidExportFee(true);
      }

      setLoading(false);
    };

    loadSettings();
  }, [supabase]);

  // Handle export_paid query param (after Stripe checkout)
  useEffect(() => {
    const exportPaid = searchParams.get("export_paid");
    if (exportPaid === "true") {
      // Confirm payment in database
      fetch("/api/stripe/export-fee", { method: "PATCH" })
        .then(() => {
          setHasPaidExportFee(true);
          setMessage({ type: "success", text: "Export fee paid! You can now download your data." });
          // Clean URL
          router.replace("/settings");
        })
        .catch(() => {
          setMessage({ type: "error", text: "Failed to confirm payment. Please contact support." });
        });
    }
    const exportCanceled = searchParams.get("export_canceled");
    if (exportCanceled === "true") {
      setMessage({ type: "error", text: "Export fee payment was canceled." });
      router.replace("/settings");
    }
  }, [searchParams, router]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage({ type: "error", text: "Not authenticated" });
        return;
      }

      const { error } = await supabase
        .from("user_profiles")
        .upsert({
          id: user.id,
          settings,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        if (error.code === "42P01") {
          localStorage.setItem("sct_settings", JSON.stringify(settings));
          setMessage({ type: "success", text: "Settings saved locally" });
        } else {
          throw error;
        }
      } else {
        setMessage({ type: "success", text: "Settings saved" });
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    // Check if free tier user needs to pay export fee
    if (subscriptionTier === "free" && !hasPaidExportFee) {
      setShowExportPaywall(true);
      return;
    }

    setExporting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/export");
      if (!response.ok) {
        const data = await response.json();
        if (data.code === "EXPORT_FEE_REQUIRED") {
          setShowExportPaywall(true);
          return;
        }
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `self-custody-tax-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage({ type: "success", text: "Data exported successfully" });
    } catch (err) {
      console.error("Export error:", err);
      setMessage({ type: "error", text: "Failed to export data" });
    } finally {
      setExporting(false);
    }
  };

  const handlePayExportFee = async () => {
    setProcessingExportFee(true);
    try {
      const response = await fetch("/api/stripe/export-fee", {
        method: "POST",
      });
      const { url, error } = await response.json();

      if (error) {
        setMessage({ type: "error", text: error });
        return;
      }

      window.location.href = url;
    } catch (err) {
      console.error("Export fee checkout error:", err);
      setMessage({ type: "error", text: "Failed to start checkout" });
    } finally {
      setProcessingExportFee(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newApiKeyName.trim()) {
      setMessage({ type: "error", text: "Please enter a name for the API key" });
      return;
    }

    setCreatingApiKey(true);
    try {
      const response = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newApiKeyName.trim() }),
      });
      const data = await response.json();

      if (data.error) {
        setMessage({ type: "error", text: data.error });
        return;
      }

      // Show the key to the user (only shown once)
      setNewlyCreatedKey(data.data.key);
      setApiKeys(prev => [{
        id: data.data.id,
        name: newApiKeyName.trim(),
        key_prefix: data.data.key.slice(0, 8),
        last_used_at: null,
        created_at: new Date().toISOString(),
      }, ...prev]);
      setNewApiKeyName("");
    } catch (err) {
      console.error("API key creation error:", err);
      setMessage({ type: "error", text: "Failed to create API key" });
    } finally {
      setCreatingApiKey(false);
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    setRevokingKeyId(keyId);
    try {
      const response = await fetch(`/api/v1/keys/${keyId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.error) {
        setMessage({ type: "error", text: data.error });
        return;
      }

      setApiKeys(prev => prev.filter(k => k.id !== keyId));
      setMessage({ type: "success", text: "API key revoked" });
    } catch (err) {
      console.error("API key revoke error:", err);
      setMessage({ type: "error", text: "Failed to revoke API key" });
    } finally {
      setRevokingKeyId(null);
    }
  };

  const handleManageSubscription = async () => {
    setOpeningPortal(true);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const { url, error } = await response.json();

      if (error) {
        setMessage({ type: "error", text: error });
        return;
      }

      window.location.href = url;
    } catch (err) {
      console.error("Portal error:", err);
      setMessage({ type: "error", text: "Failed to open subscription portal" });
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toUpperCase() !== "DELETE") {
      setMessage({ type: "error", text: 'Please type "DELETE" to confirm' });
      return;
    }

    setDeleting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      // Redirect to home page after deletion
      router.push("/");
    } catch (err) {
      console.error("Delete error:", err);
      setMessage({ type: "error", text: "Failed to delete account" });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base">
        <Nav />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="card text-center py-16">
            <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-4 animate-pulse">
              <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-text-secondary">Loading settings...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-text-secondary/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
            <p className="text-text-secondary text-sm">
              Configure your tax and display preferences
            </p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === "success"
              ? "bg-success/10 border border-success/30 text-success"
              : "bg-error/10 border border-error/30 text-error"
          }`}>
            {message.type === "success" ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            )}
            {message.text}
          </div>
        )}

        {/* Account Section */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Account</h2>
          </div>
          <div className="p-4 bg-bg-elevated rounded-xl">
            <label className="block text-text-muted text-xs uppercase tracking-wider mb-1">Email</label>
            <p className="text-text-primary font-medium">{email || "Not signed in"}</p>
          </div>
        </div>

        {/* Subscription Section */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Subscription</h2>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-bg-elevated rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-text-primary">{SUBSCRIPTION_TIERS[subscriptionTier].name} Plan</p>
                  {subscriptionTier !== "free" && (
                    <span className="badge badge-success">Active</span>
                  )}
                </div>
                {subscriptionTier === "free" ? (
                  <a href="/pricing" className="btn-primary">
                    Upgrade
                  </a>
                ) : (
                  <button
                    onClick={handleManageSubscription}
                    disabled={openingPortal}
                    className="btn-secondary disabled:opacity-50 flex items-center gap-2"
                  >
                    {openingPortal ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Opening...
                      </>
                    ) : (
                      "Manage Subscription"
                    )}
                  </button>
                )}
              </div>
              <div className="text-sm text-text-secondary">
                {subscriptionTier === "free" ? (
                  <p>1 wallet, 50 transactions, $21 one-time export fee</p>
                ) : (
                  <ul className="space-y-1">
                    {SUBSCRIPTION_TIERS[subscriptionTier].features.slice(0, 4).map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {subscriptionTier !== "free" && SUBSCRIPTION_TIERS[subscriptionTier].price > 0 && (
                <p className="text-xs text-text-muted mt-3">
                  ${SUBSCRIPTION_TIERS[subscriptionTier].price}/year
                </p>
              )}
            </div>
          </div>
        </div>

        {/* API Keys Section - Advisor tier only */}
        {subscriptionTier === "advisor" && (
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">API Keys</h2>
                  <p className="text-xs text-text-secondary">Programmatic access to your data</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/docs/api"
                  className="btn-secondary text-sm py-2"
                >
                  API Docs
                </Link>
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="btn-primary text-sm py-2"
                >
                  + New Key
                </button>
              </div>
            </div>

            {apiKeys.length === 0 ? (
              <div className="p-6 bg-bg-elevated rounded-xl text-center">
                <p className="text-text-secondary">No API keys yet.</p>
                <p className="text-sm text-text-muted mt-1">
                  Create a key to access the API. See the{' '}
                  <Link href="/docs/api" className="text-primary hover:underline">API documentation</Link>
                  {' '}for usage instructions.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map(key => (
                  <div key={key.id} className="p-4 bg-bg-elevated rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-medium text-text-primary">{key.name}</p>
                      <p className="text-xs text-text-muted font-mono">
                        {key.key_prefix}...
                        {key.last_used_at ? (
                          <span className="ml-2">Last used: {new Date(key.last_used_at).toLocaleDateString()}</span>
                        ) : (
                          <span className="ml-2">Never used</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevokeApiKey(key.id)}
                      disabled={revokingKeyId === key.id}
                      className="text-sm text-error hover:text-error/80 disabled:opacity-50"
                    >
                      {revokingKeyId === key.id ? "Revoking..." : "Revoke"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-text-muted mt-4">
              API documentation: <a href="/docs/api" className="text-primary hover:underline">/docs/api</a>
            </p>
          </div>
        )}

        {/* Create API Key Modal */}
        {showApiKeyModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-bg-raised border border-border rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">
                    {newlyCreatedKey ? "API Key Created" : "Create API Key"}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {newlyCreatedKey ? "Save this key - it won't be shown again" : "Give your key a name"}
                  </p>
                </div>
              </div>

              {newlyCreatedKey ? (
                <>
                  <div className="p-4 bg-bg-elevated rounded-xl mb-4">
                    <p className="text-xs text-text-muted mb-2">Your API Key:</p>
                    <code className="text-sm text-primary break-all select-all">{newlyCreatedKey}</code>
                  </div>
                  <p className="text-sm text-warning mb-4">
                    Copy this key now. For security, it cannot be displayed again.
                  </p>
                  <button
                    onClick={() => {
                      setShowApiKeyModal(false);
                      setNewlyCreatedKey(null);
                    }}
                    className="w-full btn-primary"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={newApiKeyName}
                    onChange={(e) => setNewApiKeyName(e.target.value)}
                    placeholder="e.g., Production, Tax Software, QuickBooks"
                    className="input w-full mb-4"
                    maxLength={50}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowApiKeyModal(false);
                        setNewApiKeyName("");
                      }}
                      className="flex-1 btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateApiKey}
                      disabled={creatingApiKey || !newApiKeyName.trim()}
                      className="flex-1 btn-primary disabled:opacity-50"
                    >
                      {creatingApiKey ? "Creating..." : "Create Key"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tax Settings */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Tax Settings</h2>
          </div>
          <div className="space-y-6">
            {/* Tax Jurisdiction */}
            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Tax Jurisdiction
              </label>
              <select
                value={settings.tax_jurisdiction}
                onChange={(e) =>
                  setSettings({ ...settings, tax_jurisdiction: e.target.value as "US" | "AU" | "OTHER" })
                }
                className="input w-full pr-10 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0.75rem center",
                  backgroundSize: "1rem",
                }}
              >
                <option value="US">United States</option>
                <option value="AU">Australia</option>
                <option value="OTHER">Other</option>
              </select>
              <p className="text-xs text-text-muted mt-2">
                {settings.tax_jurisdiction === "US" && "Tax year: Jan 1 - Dec 31. Long-term gains: > 1 year."}
                {settings.tax_jurisdiction === "AU" && "Tax year: Jul 1 - Jun 30. CGT discount: > 1 year."}
                {settings.tax_jurisdiction === "OTHER" && "Using US federal rules. Consult a tax professional."}
              </p>
            </div>

            {/* Cost Basis Method */}
            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Cost Basis Method
              </label>
              <select
                value={settings.cost_basis_method}
                onChange={(e) =>
                  setSettings({ ...settings, cost_basis_method: e.target.value as "FIFO" | "LIFO" | "HIFO" })
                }
                className="input w-full pr-10 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0.75rem center",
                  backgroundSize: "1rem",
                }}
              >
                <option value="FIFO">FIFO (First In, First Out)</option>
                <option value="LIFO">LIFO (Last In, First Out)</option>
                <option value="HIFO">HIFO (Highest In, First Out)</option>
              </select>
              <p className="text-xs text-text-muted mt-2">
                {settings.cost_basis_method === "FIFO" && "Oldest coins are sold first. Default IRS method."}
                {settings.cost_basis_method === "LIFO" && "Newest coins are sold first. May reduce short-term gains."}
                {settings.cost_basis_method === "HIFO" && "Highest cost coins sold first. May minimize gains."}
              </p>
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Display</h2>
          </div>
          <div className="space-y-6">
            {/* Default Currency */}
            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Default Currency
              </label>
              <select
                value={settings.default_currency}
                onChange={(e) =>
                  setSettings({ ...settings, default_currency: e.target.value as "USD" | "AUD" })
                }
                className="input w-full pr-10 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0.75rem center",
                  backgroundSize: "1rem",
                }}
              >
                <option value="USD">USD ($)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Timezone
              </label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="input w-full pr-10 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0.75rem center",
                  backgroundSize: "1rem",
                }}
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/Anchorage">Alaska Time (AKT)</option>
                <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                <option value="Australia/Sydney">Sydney (AEST)</option>
                <option value="Australia/Melbourne">Melbourne (AEST)</option>
                <option value="Australia/Brisbane">Brisbane (AEST)</option>
                <option value="Australia/Perth">Perth (AWST)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Asia/Singapore">Singapore (SGT)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-text-muted/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Data Management</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-bg-elevated rounded-xl">
              <div>
                <p className="font-medium text-text-primary">Export Data</p>
                <p className="text-sm text-text-secondary">
                  Download all your wallet and transaction data as JSON
                  {subscriptionTier === "free" && !hasPaidExportFee && (
                    <span className="text-warning"> ($21 one-time fee)</span>
                  )}
                  {subscriptionTier === "free" && hasPaidExportFee && (
                    <span className="text-success"> (Paid)</span>
                  )}
                </p>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-error/5 border border-error/20 rounded-xl">
              <div>
                <p className="font-medium text-error">Delete Account</p>
                <p className="text-sm text-text-secondary">Permanently delete your account and all data</p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-secondary text-error border-error/30 hover:bg-error/10"
              >
                Delete Account
              </button>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
              <div className="bg-bg-raised border border-border rounded-xl p-6 w-full max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-error">Delete Account</h3>
                    <p className="text-sm text-text-secondary">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-text-secondary mb-4">
                  This will permanently delete your account and all associated data including:
                </p>
                <ul className="text-sm text-text-tertiary mb-6 space-y-1 ml-4">
                  <li>- All wallets and addresses</li>
                  <li>- All transaction history</li>
                  <li>- All tax lots and reports</li>
                  <li>- Your account settings</li>
                </ul>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Type <span className="text-error font-bold">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="input w-full"
                    placeholder="DELETE"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText("");
                    }}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteConfirmText.toUpperCase() !== "DELETE"}
                    className="flex-1 bg-error text-white font-semibold py-2.5 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      "Delete Forever"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Export Fee Paywall Modal */}
          {showExportPaywall && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
              <div className="bg-bg-raised border border-border rounded-xl p-6 w-full max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Export Your Data</h3>
                    <p className="text-sm text-text-secondary">One-time fee for Free plan users</p>
                  </div>
                </div>
                <p className="text-text-secondary mb-4">
                  As a Free plan user, you can view and track your portfolio at no cost.
                  To download your data for tax filing or backup purposes, a one-time
                  export fee applies.
                </p>
                <div className="bg-bg-elevated rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-text-primary">Data Export</p>
                      <p className="text-sm text-text-tertiary">Includes all wallets, transactions, and tax lots</p>
                    </div>
                    <p className="text-2xl font-bold text-primary">$21</p>
                  </div>
                </div>
                <p className="text-xs text-text-muted mb-6">
                  Alternatively, <a href="/pricing" className="text-primary hover:underline">upgrade to a paid plan</a> for
                  unlimited exports and additional features.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowExportPaywall(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePayExportFee}
                    disabled={processingExportFee}
                    className="flex-1 btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processingExportFee ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      "Pay $21"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Save Settings
              </>
            )}
          </button>
        </div>

        {/* Footer Info */}
        <div className="mt-10 text-center">
          <div className="glass rounded-xl p-4 inline-block">
            <p className="text-sm text-text-secondary">Self Custody Tax v0.1.0</p>
            <p className="text-xs text-text-muted mt-1">
              Questions? Email{" "}
              <a href="mailto:selfcustodytax@proton.me" className="text-primary hover:text-primary-glow transition-colors">
                selfcustodytax@proton.me
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
