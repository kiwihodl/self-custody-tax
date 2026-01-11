'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

const DEFAULT_PRIMARY = '#F7931A';
const DEFAULT_SECONDARY = '#1a1a2e';

export default function BrandingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    firm_name: '',
    primary_color: DEFAULT_PRIMARY,
    secondary_color: DEFAULT_SECONDARY,
    accent_color: '',
    contact_email: '',
    contact_phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA',
    footer_text: '',
    website_url: '',
  });

  const fetchBranding = useCallback(async () => {
    try {
      const response = await fetch('/api/advisor/branding');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch branding settings');
      }

      setFormData({
        firm_name: data.data.firm_name || '',
        primary_color: data.data.primary_color || DEFAULT_PRIMARY,
        secondary_color: data.data.secondary_color || DEFAULT_SECONDARY,
        accent_color: data.data.accent_color || '',
        contact_email: data.data.contact_email || '',
        contact_phone: data.data.contact_phone || '',
        address_line_1: data.data.address_line_1 || '',
        address_line_2: data.data.address_line_2 || '',
        city: data.data.city || '',
        state: data.data.state || '',
        postal_code: data.data.postal_code || '',
        country: data.data.country || 'USA',
        footer_text: data.data.footer_text || '',
        website_url: data.data.website_url || '',
      });

      if (data.data.logo_path) {
        setLogoPreview(getLogoUrl(data.data.logo_path));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const getLogoUrl = (path: string) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/advisor-assets/${path}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/advisor/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update branding');
      }

      setSuccess('Branding settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setError('Logo must be PNG or JPEG format');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2MB');
      return;
    }

    setUploadingLogo(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/advisor/branding/logo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload logo');
      }

      setLogoPreview(data.data.logo_url);
      setSuccess('Logo uploaded successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm('Are you sure you want to remove your logo?')) return;

    setUploadingLogo(true);
    setError(null);

    try {
      const response = await fetch('/api/advisor/branding/logo', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete logo');
      }

      setLogoPreview(null);
      setSuccess('Logo removed successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleLogoUpload(file);
    }
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/advisor/dashboard"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">Firm Branding</h1>
          <p className="text-text-secondary">
            Customize how your reports appear to clients
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo Upload */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Firm Logo</h2>
          <div className="flex items-start gap-6">
            <div
              className="w-40 h-20 rounded-lg border-2 border-dashed border-border-subtle flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden bg-bg-elevated"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingLogo ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              ) : logoPreview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logoPreview}
                  alt="Firm logo"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center text-text-muted">
                  <svg className="w-8 h-8 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs">Drop logo</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex-1">
              <p className="text-sm text-text-secondary mb-2">
                Upload your firm logo for white-label reports. PNG or JPEG, max 2MB.
              </p>
              <p className="text-xs text-text-muted mb-3">
                Recommended: 400x200px or similar aspect ratio
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="btn-secondary text-sm"
                >
                  {logoPreview ? 'Replace Logo' : 'Upload Logo'}
                </button>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={handleDeleteLogo}
                    disabled={uploadingLogo}
                    className="text-sm text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Firm Details */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Firm Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Firm Name
              </label>
              <input
                type="text"
                value={formData.firm_name}
                onChange={(e) => setFormData({ ...formData, firm_name: e.target.value })}
                placeholder="Smith & Associates CPA"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="tax@smithcpa.com"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Website
              </label>
              <input
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                placeholder="https://smithcpa.com"
                className="input w-full"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Address</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Address Line 1
              </label>
              <input
                type="text"
                value={formData.address_line_1}
                onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
                placeholder="123 Main Street"
                className="input w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.address_line_2}
                onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
                placeholder="Suite 100"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="New York"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                State/Province
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="NY"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Postal Code
              </label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                placeholder="10001"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Country
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="USA"
                className="input w-full"
              />
            </div>
          </div>
        </div>

        {/* Brand Colors */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Brand Colors</h2>
          <p className="text-sm text-text-secondary mb-4">
            These colors will be used in your white-label PDF reports
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Primary Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  placeholder="#F7931A"
                  className="input flex-1"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
              <p className="text-xs text-text-muted mt-1">Headers, accent text</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Secondary Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  placeholder="#1a1a2e"
                  className="input flex-1"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
              <p className="text-xs text-text-muted mt-1">Backgrounds, borders</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Accent Color (optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.accent_color || '#ffffff'}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={formData.accent_color}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  placeholder="#4A90D9"
                  className="input flex-1"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
              <p className="text-xs text-text-muted mt-1">Links, highlights</p>
            </div>
          </div>
        </div>

        {/* Report Footer */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Report Footer</h2>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Footer Disclaimer
            </label>
            <textarea
              value={formData.footer_text}
              onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
              placeholder="Prepared by Smith & Associates CPA. This report is provided for informational purposes only and does not constitute tax advice."
              className="input w-full h-24 resize-none"
              maxLength={500}
            />
            <p className="text-xs text-text-muted mt-1">
              {formData.footer_text.length}/500 characters
            </p>
          </div>
        </div>

        {/* Preview Section */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Preview</h2>
          <div
            className="rounded-lg p-6"
            style={{ backgroundColor: formData.secondary_color + '10' }}
          >
            <div className="flex items-center gap-4 pb-4 mb-4" style={{ borderBottom: `2px solid ${formData.primary_color}` }}>
              {logoPreview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logoPreview} alt="Logo" className="h-10 object-contain" />
              ) : (
                <div className="w-16 h-10 bg-bg-elevated rounded flex items-center justify-center text-text-muted text-xs">
                  Logo
                </div>
              )}
              <div>
                <h3 className="font-bold" style={{ color: formData.secondary_color }}>
                  {formData.firm_name || 'Your Firm Name'}
                </h3>
                {formData.contact_email && (
                  <p className="text-sm text-text-muted">{formData.contact_email}</p>
                )}
              </div>
            </div>
            <div className="text-center py-8">
              <h2 className="text-xl font-bold mb-2" style={{ color: formData.primary_color }}>
                TAX REPORT 2025
              </h2>
              <p className="text-text-secondary">Form 8949 Summary</p>
            </div>
            {formData.footer_text && (
              <div className="pt-4 mt-4 border-t border-border-subtle">
                <p className="text-xs text-text-muted text-center">
                  {formData.footer_text}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => window.open('/api/advisor/reports/branded', '_blank')}
            className="btn-secondary"
          >
            Preview PDF Report
          </button>
          <div className="flex gap-3">
            <Link href="/advisor/dashboard" className="btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save Branding'}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
