'use client';

import {useEffect, useState, type SubmitEvent} from 'react';
import {MapPin} from 'lucide-react';
import {usePathname} from 'next/navigation';
import {getSupabase} from '@/lib/supabase';
import {useLanguage} from '@/lib/i18n';

type LocationForm = {
  state_code: 'TS' | 'AP';
  district: string;
  mandal: string;
  village: string;
};

const emptyLocation: LocationForm = {
  state_code: 'TS',
  district: '',
  mandal: '',
  village: '',
};

export function SellerLocationGate() {
  const pathname = usePathname();
  const {t, locale} = useLanguage();
  const [checking, setChecking] = useState(true);
  const [checkedPath, setCheckedPath] = useState('');
  const [required, setRequired] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<LocationForm>(emptyLocation);

  useEffect(() => {
    if (!pathname.startsWith('/dashboard')) {
      setChecking(false);
      setRequired(false);
      setCheckedPath(pathname);
      return;
    }

    let active = true;
    const finishChecking = () => {
      setChecking(false);
      setCheckedPath(pathname);
    };
    const supabase = getSupabase();
    setChecking(true);
    setError('');

    async function checkLocation() {
      if (!supabase) {
        if (active) {
          setError(t('configureBody'));
          setRequired(true);
          finishChecking();
        }
        return;
      }

      const {data: {user}, error: userError} = await supabase.auth.getUser();
      if (!active) return;
      if (userError) {
        setError(userError.message);
        setRequired(true);
        finishChecking();
        return;
      }
      if (!user) {
        finishChecking();
        return;
      }

      const {data: profileData, error: profileError} = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      const profile = profileData as {role: string} | null;
      if (!active) return;
      if (profileError) {
        setError(profileError.message);
        setRequired(true);
        finishChecking();
        return;
      }
      if (!profile || profile.role === 'admin') {
        finishChecking();
        return;
      }

      const {data: locationData, error: locationError} = await supabase
        .from('seller_locations')
        .select('state_code,district,mandal,village')
        .eq('seller_id', user.id)
        .limit(1)
        .maybeSingle();
      const location = locationData as LocationForm | null;
      if (!active) return;
      if (locationError) {
        setError(locationError.message);
        setRequired(true);
      } else if (location) {
        setForm({
          state_code: location.state_code,
          district: location.district,
          mandal: location.mandal || '',
          village: location.village || '',
        });
        setRequired(false);
      } else {
        setRequired(true);
      }
      finishChecking();
    }

    checkLocation().catch((cause: unknown) => {
      if (!active) return;
      setError(cause instanceof Error ? cause.message : t('authError'));
      setRequired(true);
      finishChecking();
    });

    return () => {
      active = false;
    };
  }, [pathname, t]);

  async function saveLocation(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const supabase = getSupabase();
    if (!supabase) {
      setError(t('configureBody'));
      return;
    }
    setBusy(true);
    try {
      // Generated Supabase Database types are not configured, so RPC arguments otherwise infer as never.
      const {error: saveError} = await supabase.rpc('upsert_my_seller_location', {
        p_state_code: form.state_code,
        p_district: form.district.trim(),
        p_mandal: form.mandal.trim(),
        p_village: form.village.trim(),
      } as never);
      if (saveError) {
        setError(saveError.message);
        return;
      }
      setRequired(false);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : t('submitError'));
    } finally {
      setBusy(false);
    }
  }

  if (!pathname.startsWith('/dashboard') || (checkedPath === pathname && !checking && !required)) return null;
  const isChecking = checking || checkedPath !== pathname;

  return (
    <div className="modal-backdrop">
      <dialog open className="modal-card" aria-labelledby="seller-location-title" style={{maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', border: 0, margin: 0}}>
        <div className="modal-icon"><MapPin size={24}/></div>
        <h2 id="seller-location-title">{locale === 'te' ? 'మీ విక్రేత స్థానాన్ని జోడించండి' : 'Add your seller location'}</h2>
        <p>{locale === 'te'
          ? 'మీ డ్యాష్‌బోర్డ్ మరియు జాబితాలను ఉపయోగించే ముందు మీ ప్రాంత వివరాలను నమోదు చేయండి.'
          : 'Add your area before continuing to your dashboard and creating listings.'}</p>
        {isChecking ? <div className="loader"/> : <>
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={saveLocation}>
            <div className="field">
              <label>{t('state')} *</label>
              <select
                value={form.state_code}
                onChange={event => setForm({...form, state_code: event.target.value === 'AP' ? 'AP' : 'TS'})}
                required
              >
                <option value="TS">Telangana</option>
                <option value="AP">Andhra Pradesh</option>
              </select>
            </div>
            <div className="field">
              <label>{t('district')} *</label>
              <input value={form.district} onChange={event => setForm({...form, district: event.target.value})} required minLength={2}/>
            </div>
            <div className="field">
              <label>{t('mandal')}</label>
              <input value={form.mandal} onChange={event => setForm({...form, mandal: event.target.value})}/>
            </div>
            <div className="field">
              <label>{t('village')}</label>
              <input value={form.village} onChange={event => setForm({...form, village: event.target.value})}/>
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={busy}>
              {busy ? t('loading') : t('saveProfile')}
            </button>
          </form>
        </>}
      </dialog>
    </div>
  );
}
