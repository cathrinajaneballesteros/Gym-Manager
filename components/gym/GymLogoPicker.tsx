'use client';

import React, { useRef } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { DBService } from '@/lib/data/db-service';

interface GymLogoPickerProps {
  /** The current logo (an uploaded link or a local preview); initials are shown when empty. */
  imageUrl: string | null;
  gymName: string;
  onSelect: (file: File) => void;
  onRemove: () => void;
  busy?: boolean;
}

export const GymLogoPicker: React.FC<GymLogoPickerProps> = ({ imageUrl, gymName, onSelect, onRemove, busy }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          backgroundColor: imageUrl ? '#ffffff' : '#0f172a',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '1.1rem',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- uploaded logos and local previews aren't known at build time
          <img src={imageUrl} alt={`${gymName || 'Gym'} logo`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          DBService.getInitials(gymName)
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => inputRef.current?.click()} disabled={busy}>
            <ImagePlus size={14} />
            <span>{busy ? 'Saving…' : imageUrl ? 'Change logo' : 'Upload logo'}</span>
          </button>
          {imageUrl && (
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600, color: '#ef4444', cursor: 'pointer' }}
            >
              <Trash2 size={14} />
              Remove
            </button>
          )}
        </div>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>PNG, JPG or WebP, up to 2 MB. A square image looks best.</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Clear the input so choosing the same file again still triggers a change.
          e.target.value = '';
          if (file) onSelect(file);
        }}
      />
    </div>
  );
};
