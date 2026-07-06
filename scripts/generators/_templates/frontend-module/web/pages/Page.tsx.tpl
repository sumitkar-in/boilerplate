// This module's own page — feature-specific UI lives in
// modules/{{featureKey}}/components/, not in packages/ui-common (that's
// reserved for building blocks a *second* module also needs).
// See: skills/frontend-module/SKILL.md
import { Folder } from 'lucide-react';

export function {{FeatureName}}Page() {

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Folder size={24} />
            {{FeatureLabel}}
          </h1>
          <p className="hint-text">Manage {{FeatureLabel}} for the current tenant.</p>
        </div>
      </header>
      {/* TODO: break complex UI into smaller reusable components (< 150 lines) under modules/{{featureKey}}/components/ */}
    </div>
  );
}
