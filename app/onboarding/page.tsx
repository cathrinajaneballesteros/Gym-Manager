'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Building2, Clock, Layers, Phone, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DBService } from '@/lib/data/db-service';
import { GymDetails } from '@/types/database';
import { OpeningHoursEditor } from '@/components/gym/OpeningHoursEditor';
import { GymLogoPicker } from '@/components/gym/GymLogoPicker';
import { DEFAULT_OPENING_HOURS, emptyGymDetails, invalidHourDays } from '@/lib/ui/gym';
import { STAFF_HOME } from '@/lib/ui/roles';
import { showError, showToast } from '@/lib/ui/swal';
import { escapeHtml } from '@/lib/ui/escape';

interface PlanDraft {
  name: string;
  price: string;
  months: string;
}

const STEPS = [
  { title: 'Your gym', subtitle: 'What is your gym called, and where is it?', icon: Building2 },
  { title: 'Contact details', subtitle: 'How members can reach the gym. Used on receipts and reminders.', icon: Phone },
  { title: 'Opening hours', subtitle: 'When is the gym open? You can change this later in Settings.', icon: Clock },
  { title: 'Prices', subtitle: 'What walk-ins pay, and the plans members can sign up for. You can also do this later.', icon: Layers },
];

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#424245', marginBottom: '0.4rem' };
const emptyPlan = (): PlanDraft => ({ name: '', price: '', months: '1' });

export default function OnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<GymDetails>(emptyGymDetails);
  const [plans, setPlans] = useState<PlanDraft[]>([emptyPlan()]);
  const [existingPlans, setExistingPlans] = useState(0);
  const [saving, setSaving] = useState(false);
  // Uploaded after the gym is created, since the logo is stored in the gym's own folder.
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const chooseLogo = (file: File | null) => {
    if (file) {
      const problem = DBService.logoFileProblem(file);
      if (problem) {
        showError('Logo not added', problem);
        return;
      }
    }
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  };

  // Only people without a finished gym belong here; everyone else goes into the app.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await DBService.load();
      } catch {
        router.replace('/login?mode=signin');
        return;
      }
      if (cancelled) return;
      if (!DBService.needsOnboarding()) {
        router.replace(DBService.isOwner() ? '/dashboard' : STAFF_HOME);
        return;
      }
      const { data } = await createClient().auth.getUser();
      const gym = DBService.getGym();
      const profile = DBService.getProfile();
      setDetails((d) => ({
        ...d,
        // A gym set up before onboarding existed keeps its name; otherwise use what they typed at signup.
        name: gym?.name || data.user?.user_metadata?.gym_name || '',
        email: gym?.email || profile.email || '',
        currency: gym?.currency || d.currency,
      }));
      const planCount = DBService.getPlans().length;
      setExistingPlans(planCount);
      if (planCount > 0) setPlans([]);
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const set = <K extends keyof GymDetails>(key: K, value: GymDetails[K]) => setDetails((d) => ({ ...d, [key]: value }));
  const setPlan = (index: number, changes: Partial<PlanDraft>) =>
    setPlans((list) => list.map((p, i) => (i === index ? { ...p, ...changes } : p)));

  // Rows with a name are kept; returns an error message for the first incomplete one.
  const filledPlans = plans.filter((p) => p.name.trim());
  const planError = (): string | null => {
    for (const p of filledPlans) {
      const price = Number(p.price);
      const months = Number(p.months);
      if (p.price.trim() === '' || !Number.isFinite(price) || price < 0) return `Enter a price for "${p.name.trim()}".`;
      if (!Number.isInteger(months) || months < 1) return `"${p.name.trim()}" needs a duration of at least 1 month.`;
    }
    const names = filledPlans.map((p) => p.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) return 'Two plans have the same name.';
    return null;
  };

  const next = () => {
    if (step === 0 && !details.name.trim()) {
      showError('Gym name needed', 'Please enter the name of your gym.');
      return;
    }
    if (step === 2) {
      const badDays = invalidHourDays(details.opening_hours || DEFAULT_OPENING_HOURS);
      if (badDays.length > 0) {
        showError('Check opening hours', `Closing time must be after opening time on ${badDays.join(', ')}.`);
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const finish = async (withPlans: boolean) => {
    const error = withPlans ? planError() : null;
    if (error) {
      showError('Check your plans', error);
      return;
    }
    setSaving(true);
    try {
      const gym = await DBService.createGym({ ...details, name: details.name.trim() });
      if (withPlans) {
        for (const p of filledPlans) {
          await DBService.addPlan({
            name: p.name.trim(),
            price: Number(p.price),
            duration_months: Number(p.months),
            description: '',
            is_active: true,
          });
        }
      }
      let logoFailed = false;
      if (logoFile) {
        try {
          await DBService.uploadGymLogo(logoFile);
        } catch {
          // The gym is set up either way; the logo can be added again from Settings.
          logoFailed = true;
        }
      }
      sessionStorage.setItem('sgfm_authenticated', 'true');
      if (logoFailed) showToast(`${escapeHtml(gym.name)} is ready. The logo didn't upload; add it in Settings → Gym.`, 'warning');
      else showToast(`${escapeHtml(gym.name)} is ready`);
      router.replace('/dashboard');
    } catch (err) {
      showError('Setup Failed', err instanceof Error ? err.message : 'Could not save your gym.');
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f7' }}>
        <p style={{ fontSize: '0.9rem', color: '#6e6e73' }}>Loading…</p>
      </div>
    );
  }

  const current = STEPS[step];
  const StepIcon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f7', display: 'flex', justifyContent: 'center', padding: '3rem 1rem' }}>
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          alignSelf: 'flex-start',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -15px rgba(0, 0, 0, 0.07)',
          padding: '2.25rem 2rem',
        }}
        className="onboarding-card"
      >
        {/* Progress */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.75rem' }}>
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: i <= step ? '#059669' : '#e5e7eb', transition: 'background-color 0.2s ease' }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <StepIcon size={18} />
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#86868b' }}>
            Step {step + 1} of {STEPS.length}
          </div>
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '0.3rem' }}>{current.title}</h1>
        <p style={{ fontSize: '0.875rem', color: '#6e6e73', marginBottom: '1.5rem' }}>{current.subtitle}</p>

        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Logo (optional)</label>
              <GymLogoPicker
                imageUrl={logoPreview}
                gymName={details.name}
                onSelect={(file) => chooseLogo(file)}
                onRemove={() => chooseLogo(null)}
              />
            </div>
            <div>
              <label style={labelStyle}>Gym name *</label>
              <input type="text" value={details.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. IronPeak Fitness Club" style={{ width: '100%' }} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Street address</label>
              <input type="text" value={details.address} onChange={(e) => set('address', e.target.value)} placeholder="e.g. 123 Rizal Avenue" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={labelStyle}>City</label>
              <input type="text" value={details.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g. Quezon City" style={{ width: '100%' }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#86868b' }}>
              Were you invited as staff? Sign in with the email your gym owner invited, and you&apos;ll join their gym instead.
            </p>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Gym phone</label>
              <input type="tel" value={details.phone} onChange={(e) => set('phone', e.target.value)} placeholder="e.g. +63 917 123 4567" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={labelStyle}>Gym email</label>
              <input type="email" value={details.email} onChange={(e) => set('email', e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>
        )}

        {step === 2 && (
          <OpeningHoursEditor value={details.opening_hours || DEFAULT_OPENING_HOURS} onChange={(hours) => set('opening_hours', hours)} />
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle}>Walk-in price ({details.currency})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={details.walk_in_price ?? ''}
                onChange={(e) => set('walk_in_price', e.target.value === '' ? null : Number(e.target.value))}
                placeholder="e.g. 100 (leave blank if you don't take walk-ins)"
                style={{ width: '100%' }}
              />
            </div>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Membership plans</label>
            {existingPlans > 0 && (
              <p style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                You already have {existingPlans} {existingPlans === 1 ? 'plan' : 'plans'}. Add more here or skip.
              </p>
            )}
            {plans.length > 0 && (
              <div className="onboarding-plan-row" style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 32px', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#86868b' }}>
                <span>Plan name</span>
                <span>Price ({details.currency})</span>
                <span>Months</span>
                <span />
              </div>
            )}
            {plans.map((p, i) => (
              <div key={i} className="onboarding-plan-row" style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 32px', gap: '0.5rem', alignItems: 'center' }}>
                <input type="text" value={p.name} onChange={(e) => setPlan(i, { name: e.target.value })} placeholder="e.g. Monthly Pass" aria-label="Plan name" />
                <input type="number" min="0" step="0.01" value={p.price} onChange={(e) => setPlan(i, { price: e.target.value })} placeholder="1500" aria-label="Price" />
                <input type="number" min="1" step="1" value={p.months} onChange={(e) => setPlan(i, { months: e.target.value })} aria-label="Duration in months" />
                <button
                  type="button"
                  onClick={() => setPlans((list) => list.filter((_, j) => j !== i))}
                  aria-label="Remove plan"
                  style={{ color: '#ef4444', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPlans((list) => [...list, emptyPlan()])}
              style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', color: '#059669', fontWeight: 600, cursor: 'pointer' }}
            >
              <Plus size={15} />
              Add a plan
            </button>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap' }}>
          {step > 0 && (
            <button type="button" className="btn btn-secondary" onClick={() => setStep((s) => s - 1)} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ArrowLeft size={15} />
              Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {isLast ? (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => finish(false)} disabled={saving}>
                Skip for now
              </button>
              <button type="button" className="btn btn-primary" onClick={() => finish(true)} disabled={saving} style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
                {saving ? 'Setting up…' : 'Finish setup'}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={next} style={{ backgroundColor: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              Continue
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 520px) {
          .onboarding-card {
            padding: 1.75rem 1.25rem !important;
          }
          .onboarding-plan-row {
            grid-template-columns: 1fr 80px 60px 28px !important;
          }
        }
      `}</style>
    </div>
  );
}
