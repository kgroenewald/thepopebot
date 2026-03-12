'use client';

import { useState, useEffect } from 'react';
import { getGeneralSettings, updateGeneralSetting } from '../actions.js';

export function SettingsGeneralPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [includeBeta, setIncludeBeta] = useState(false);

  useEffect(() => {
    getGeneralSettings().then((result) => {
      if (result.settings) {
        setIncludeBeta(result.settings.UPGRADE_INCLUDE_BETA === 'true');
      }
      setLoading(false);
    });
  }, []);

  const handleToggle = async () => {
    const newValue = !includeBeta;
    setIncludeBeta(newValue);
    setSaving(true);
    await updateGeneralSetting('UPGRADE_INCLUDE_BETA', newValue ? 'true' : 'false');
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="rounded-lg border bg-card p-4">
          <div className="h-4 w-64 bg-muted animate-pulse rounded mb-3" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto Upgrade */}
      <div>
        <h2 className="text-lg font-medium mb-1">Auto Upgrade</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Configure how the system checks for new versions.
        </p>

        <div className="rounded-lg border bg-card p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeBeta}
              onChange={handleToggle}
              disabled={saving}
              className="mt-1 h-4 w-4 rounded border-border accent-foreground"
            />
            <div>
              <span className="text-sm font-medium">Include beta versions</span>
              <p className="text-sm text-muted-foreground mt-0.5">
                Stable installs only check for stable releases by default. Enable this to also check the beta channel for pre-release updates.
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
