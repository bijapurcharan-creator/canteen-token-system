import React, { useState, useEffect, useRef } from 'react';
import {
  Phone, Lock, Camera, Utensils, History, LogOut, Check,
  MapPin, Calendar, Coffee, User, Building2, RefreshCw,
  ChevronRight, ChevronLeft, AlertCircle, Hash, Clock,
  CheckCircle2, Sparkles, Info, Settings, ShieldCheck, Eye, EyeOff,
  Sunrise, Sun
} from 'lucide-react';

// ════════════════════════════════════════════════════════════════
//  CONFIG
// ════════════════════════════════════════════════════════════════
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbw4a0iAwb7NNnImW_ckkh4UrKDgDMtkzJf3w0ZXdpJqYlD3OvWO4qLoLhLAuFLjOmLxug/exec';
const DEFAULT_PASSWORD_HINT = 'rentomojo123';
const STORAGE_KEY = 'canteen_api_url';

const MEALS = {
  breakfast: { label: 'Breakfast', window: '6 AM – 11 AM', icon: Sunrise, accent: 'amber' },
  lunch:     { label: 'Lunch',     window: '12 PM – 4 PM',  icon: Sun,     accent: 'orange' }
};

// ════════════════════════════════════════════════════════════════
//  LOGO — fork-spoon curve (inline SVG, no asset needed)
// ════════════════════════════════════════════════════════════════
function ForkSpoonLogo({ size = 48, color = 'currentColor' }) {
  return (
    <svg viewBox="0 0 200 100" width={size} height={size * 0.5} fill={color} xmlns="http://www.w3.org/2000/svg">
      {/* Fork prongs */}
      <rect x="18" y="20" width="3" height="22" rx="1.5" />
      <rect x="25" y="20" width="3" height="22" rx="1.5" />
      <rect x="32" y="20" width="3" height="22" rx="1.5" />
      <rect x="39" y="20" width="3" height="22" rx="1.5" />
      {/* Curved handle from fork to spoon */}
      <path
        d="M 30 42 C 30 70, 50 88, 100 88 C 150 88, 168 70, 168 50"
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* Spoon bowl */}
      <ellipse cx="168" cy="34" rx="14" ry="18" />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════
//  API
// ════════════════════════════════════════════════════════════════
function getApiUrl() {
  if (typeof window === 'undefined') return DEFAULT_API_URL;
  if (window.__CANTEEN_API_URL__) return window.__CANTEEN_API_URL__;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
  } catch (e) {}
  return DEFAULT_API_URL;
}

async function api(action, payload = {}) {
  const url = getApiUrl();
  if (!url) throw new Error('API URL not configured.');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ════════════════════════════════════════════════════════════════
//  UTILS
// ════════════════════════════════════════════════════════════════
const pad = n => String(n).padStart(2, '0');
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fmtDate = key => {
  if (!key) return '';
  const [y, m, d] = String(key).split('-');
  return new Date(+y, +m - 1, +d).toLocaleDateString('en-IN',
    { weekday: 'short', day: 'numeric', month: 'short' });
};
const fmtFullDate = () => new Date().toLocaleDateString('en-IN',
  { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// ════════════════════════════════════════════════════════════════
//  ROOT
// ════════════════════════════════════════════════════════════════
export default function App() {
  const [view, setView] = useState('role');
  const [employee, setEmployee] = useState(null);
  const [staff, setStaff] = useState(null);
  const [pendingEmployee, setPendingEmployee] = useState(null);
  const [pendingStaff, setPendingStaff] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let resolved = DEFAULT_API_URL;
    if (window.__CANTEEN_API_URL__) resolved = window.__CANTEEN_API_URL__;
    else {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) resolved = saved;
      } catch (e) {}
    }
    setApiUrl(resolved);
    if (resolved) window.__CANTEEN_API_URL__ = resolved;
  }, []);

  const saveApiUrl = (url) => {
    setApiUrl(url);
    if (typeof window !== 'undefined') {
      window.__CANTEEN_API_URL__ = url;
      try { window.localStorage.setItem(STORAGE_KEY, url); } catch (e) {}
    }
    setShowSettings(false);
  };

  const resetApiUrl = () => {
    setApiUrl(DEFAULT_API_URL);
    if (typeof window !== 'undefined') {
      window.__CANTEEN_API_URL__ = DEFAULT_API_URL;
      try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }
  };

  const handleEmployeeLoginResult = (res) => {
    if (!res || typeof res !== 'object') throw new Error('Unexpected response from server');
    if (res.mustChangePassword) {
      const emp = res.employee || {};
      setPendingEmployee({
        phone: emp.phone || '',
        name: emp.name || 'there',
        designation: emp.designation || ''
      });
      setView('emp_set_password');
      return;
    }
    if (!res.employee) throw new Error('Login response missing employee data');
    setEmployee(res.employee);
    setView(res.employee.photoLink ? 'emp_dashboard' : 'emp_photo');
  };

  const handleStaffLoginResult = (res) => {
    if (!res || typeof res !== 'object') throw new Error('Unexpected response from server');
    if (res.mustChangePassword) {
      setPendingStaff({ userId: (res.staff && res.staff.userId) || '' });
      setView('can_set_password');
      return;
    }
    if (!res.staff) throw new Error('Login response missing staff data');
    setStaff(res.staff);
    setView('can_dashboard');
  };

  return (
    <div className="min-h-screen bg-stone-200 font-sans antialiased text-stone-900">
      <div className="max-w-md mx-auto min-h-screen bg-stone-50 shadow-2xl shadow-stone-400/30 relative">
        {showSettings && (
          <SettingsPanel currentUrl={apiUrl} onSave={saveApiUrl} onReset={resetApiUrl} onClose={() => setShowSettings(false)} />
        )}

        {view === 'role' && (
          <RoleSelector onSelect={r => setView(r)} onSettings={() => setShowSettings(true)} apiConfigured={!!apiUrl} />
        )}
        {view === 'emp_login' && (
          <EmployeeLogin onBack={() => setView('role')} onResult={handleEmployeeLoginResult} />
        )}
        {view === 'emp_set_password' && pendingEmployee && (
          <SetPasswordScreen
            heading="Set Your Password"
            subtitle={`Welcome ${pendingEmployee.name}! Choose a password — you'll use this every time you log in.`}
            onCancel={() => { setPendingEmployee(null); setView('role'); }}
            onSave={async (newPassword) => {
              const res = await api('setEmployeePassword', { phone: pendingEmployee.phone, newPassword });
              if (!res || !res.employee) throw new Error('Failed to set password — try again');
              setPendingEmployee(null);
              setEmployee(res.employee);
              setView(res.employee.photoLink ? 'emp_dashboard' : 'emp_photo');
            }}
          />
        )}
        {view === 'emp_photo' && employee && (
          <PhotoCapture
            employee={employee}
            onSaved={url => { setEmployee({ ...employee, photoLink: url }); setView('emp_dashboard'); }}
          />
        )}
        {view === 'emp_dashboard' && employee && (
          <EmployeeDashboard
            employee={employee}
            onLogout={() => { setEmployee(null); setView('role'); }}
          />
        )}
        {view === 'can_login' && (
          <CanteenLogin onBack={() => setView('role')} onResult={handleStaffLoginResult} />
        )}
        {view === 'can_set_password' && pendingStaff && (
          <SetPasswordScreen
            dark
            heading="Set Your Password"
            subtitle={`Welcome ${pendingStaff.userId}! Choose a password — you'll use this every time you log in.`}
            onCancel={() => { setPendingStaff(null); setView('role'); }}
            onSave={async (newPassword) => {
              const res = await api('setCanteenPassword', { userId: pendingStaff.userId, newPassword });
              if (!res || !res.staff) throw new Error('Failed to set password — try again');
              setPendingStaff(null);
              setStaff(res.staff);
              setView('can_dashboard');
            }}
          />
        )}
        {view === 'can_dashboard' && staff && (
          <CanteenDashboard staff={staff} onLogout={() => { setStaff(null); setView('role'); }} />
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  ROLE SELECTOR — with logo
// ════════════════════════════════════════════════════════════════
function RoleSelector({ onSelect, onSettings, apiConfigured }) {
  return (
    <div className="min-h-screen flex flex-col p-6">
      <div className="flex justify-between items-start pt-8 pb-4">
        <div className="text-stone-900">
          <ForkSpoonLogo size={56} />
        </div>
        <button onClick={onSettings} className="p-2 text-stone-400 hover:text-stone-700" aria-label="Settings">
          <Settings size={18} />
        </button>
      </div>

      <div className="pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-900 rounded-full text-[11px] font-semibold tracking-wider uppercase">
          <Utensils size={13} /> Warehouse Canteen
        </div>
        <h1 className="mt-4 text-[2.25rem] leading-[1.05] font-bold tracking-tight text-stone-900">
          Meal Token<br />
          <span className="text-amber-700">System.</span>
        </h1>
        <p className="mt-3 text-stone-600 text-sm leading-relaxed">
          Daily breakfast & lunch tokens for<br />third-party warehouse employees.
        </p>
      </div>

      {!apiConfigured && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs">
          <AlertCircle size={14} className="text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="text-amber-900">
            <span className="font-semibold">Backend not configured.</span> Tap the gear icon.
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center gap-4">
        <button
          onClick={() => onSelect('emp_login')}
          className="group bg-white border border-stone-200 rounded-2xl p-5 text-left hover:border-amber-400 hover:shadow-xl hover:shadow-amber-100/50 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-700">
              <User size={22} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-stone-900">Employee Login</div>
              <div className="text-xs text-stone-500 mt-0.5">Get breakfast & lunch tokens</div>
            </div>
            <ChevronRight className="text-stone-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" size={20} />
          </div>
        </button>

        <button
          onClick={() => onSelect('can_login')}
          className="group bg-white border border-stone-200 rounded-2xl p-5 text-left hover:border-stone-900 hover:shadow-xl active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-stone-900 text-amber-300 rounded-xl flex items-center justify-center">
              <Utensils size={22} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-stone-900">Canteen Staff</div>
              <div className="text-xs text-stone-500 mt-0.5">Verify tokens · Serve meals</div>
            </div>
            <ChevronRight className="text-stone-400 group-hover:text-stone-900 group-hover:translate-x-0.5 transition-all" size={20} />
          </div>
        </button>
      </div>

      <div className="pt-6 pb-2 text-center space-y-1">
        <div className="text-[10px] text-stone-400 tracking-wider uppercase">
          Connected to Google Sheets
        </div>
        <div className="text-[10px] text-stone-400">
          Designed by <span className="font-medium text-stone-500">Charan A Bijapur</span>
          <span className="text-stone-400"> · IT Analyst</span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  SETTINGS
// ════════════════════════════════════════════════════════════════
function SettingsPanel({ currentUrl, onSave, onReset, onClose }) {
  const [url, setUrl] = useState(currentUrl || '');
  return (
    <div className="absolute inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-end" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-6 pb-8 max-w-md mx-auto" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1 bg-stone-200 rounded-full mx-auto mb-6"></div>
        <h2 className="text-xl font-bold tracking-tight text-stone-900">API Settings</h2>
        <p className="mt-1 text-xs text-stone-500">The default URL is preset. Override only if you've redeployed the backend.</p>

        <div className="mt-4 bg-white border border-stone-200 rounded-xl px-4 py-3 focus-within:border-amber-400">
          <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-1">Web App URL</div>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            className="w-full bg-transparent text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none"
          />
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={onReset} className="px-4 bg-stone-100 text-stone-600 font-semibold py-3 rounded-xl text-xs">Reset</button>
          <button onClick={onClose} className="flex-1 bg-stone-100 text-stone-700 font-semibold py-3 rounded-xl">Cancel</button>
          <button
            onClick={() => onSave(url.trim())}
            disabled={!url.trim()}
            className="flex-1 bg-stone-900 text-amber-50 font-semibold py-3 rounded-xl disabled:opacity-40"
          >Save</button>
        </div>

        <div className="mt-5 pt-4 border-t border-stone-100 text-center text-[10px] text-stone-400">
          Designed by <span className="font-medium text-stone-500">Charan A Bijapur</span>
          <span className="text-stone-400"> · IT Analyst</span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  EMPLOYEE LOGIN
// ════════════════════════════════════════════════════════════════
function EmployeeLogin({ onBack, onResult }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api('loginEmployee', { phone: phone.trim(), password });
      onResult(res);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6">
      <button onClick={onBack} className="self-start -ml-2 p-2 text-stone-500 hover:text-stone-900">
        <ChevronLeft size={22} />
      </button>

      <div className="pt-6 pb-8">
        <div className="text-stone-900 mb-4"><ForkSpoonLogo size={44} /></div>
        <h2 className="text-3xl font-bold tracking-tight text-stone-900">Welcome back.</h2>
        <p className="mt-2 text-stone-600 text-sm">Sign in to claim today's meal tokens.</p>
      </div>

      <form onSubmit={submit} className="space-y-4 flex-1">
        <Field icon={Phone} label="Phone Number">
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit phone"
            className="w-full bg-transparent text-stone-900 placeholder:text-stone-400 focus:outline-none text-base"
            inputMode="numeric"
          />
        </Field>
        <Field icon={Lock} label="Password" right={
          <button type="button" onClick={() => setShowPw(s => !s)} className="text-stone-400 hover:text-stone-700">
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }>
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full bg-transparent text-stone-900 placeholder:text-stone-400 focus:outline-none text-base"
          />
        </Field>

        <div className="bg-stone-100 border border-stone-200 rounded-xl p-3 flex items-start gap-2 text-[11px] text-stone-600">
          <Info size={13} className="mt-0.5 flex-shrink-0 text-stone-500" />
          <div>
            <span className="font-semibold text-stone-700">First time?</span> Use the default password <span className="font-mono font-semibold text-stone-800">{DEFAULT_PASSWORD_HINT}</span> — you'll be asked to set your own.
          </div>
        </div>

        {error && <ErrorBanner message={error} />}

        <button
          type="submit"
          disabled={loading || !phone || !password}
          className="w-full bg-stone-900 text-amber-50 font-semibold py-4 rounded-xl hover:bg-stone-800 disabled:opacity-40 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
        >
          {loading ? <><RefreshCw size={16} className="animate-spin" /> Verifying…</> : <>Sign In <ChevronRight size={18} /></>}
        </button>
      </form>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  SET PASSWORD
// ════════════════════════════════════════════════════════════════
function SetPasswordScreen({ heading, subtitle, onSave, onCancel, dark = false }) {
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const validateLocal = () => {
    if (pw1.length < 4) return 'Password must be at least 4 characters';
    if (pw1 === DEFAULT_PASSWORD_HINT) return 'Please choose a password different from the default';
    if (pw1 !== pw2) return 'Passwords do not match';
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = validateLocal();
    if (v) { setError(v); return; }
    setError('');
    setSaving(true);
    try {
      await onSave(pw1);
    } catch (err) {
      setError(err.message || 'Failed to save password');
      setSaving(false);
    }
  };

  const wrap = dark ? 'min-h-screen flex flex-col p-6 bg-stone-900 text-amber-50' : 'min-h-screen flex flex-col p-6';
  const iconWrap = dark
    ? 'w-14 h-14 bg-amber-400/20 rounded-2xl flex items-center justify-center text-amber-300 mb-5'
    : 'w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 mb-5';
  const headingCls = dark ? 'text-3xl font-bold tracking-tight' : 'text-3xl font-bold tracking-tight text-stone-900';
  const subCls = dark ? 'mt-2 text-stone-400 text-sm' : 'mt-2 text-stone-600 text-sm';
  const FieldCmp = dark ? DarkField : Field;
  const btnCls = dark
    ? 'w-full bg-amber-400 text-stone-900 font-semibold py-4 rounded-xl hover:bg-amber-300 disabled:opacity-40 transition-all active:scale-[0.99] flex items-center justify-center gap-2'
    : 'w-full bg-stone-900 text-amber-50 font-semibold py-4 rounded-xl hover:bg-stone-800 disabled:opacity-40 transition-all active:scale-[0.99] flex items-center justify-center gap-2';
  const cancelCls = dark
    ? 'self-start -ml-2 p-2 text-stone-400 hover:text-amber-300'
    : 'self-start -ml-2 p-2 text-stone-500 hover:text-stone-900';

  return (
    <div className={wrap}>
      <button onClick={onCancel} className={cancelCls}><ChevronLeft size={22} /></button>
      <div className="pt-6 pb-8">
        <div className={iconWrap}><ShieldCheck size={26} /></div>
        <h2 className={headingCls}>{heading}</h2>
        <p className={subCls}>{subtitle}</p>
      </div>

      <form onSubmit={submit} className="space-y-4 flex-1">
        <FieldCmp icon={Lock} label="New Password" right={
          <button type="button" onClick={() => setShowPw(s => !s)} className={dark ? 'text-stone-500 hover:text-amber-300' : 'text-stone-400 hover:text-stone-700'}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }>
          <input
            type={showPw ? 'text' : 'password'}
            value={pw1}
            onChange={e => setPw1(e.target.value)}
            placeholder="At least 4 characters"
            className={`w-full bg-transparent focus:outline-none text-base ${dark ? 'text-amber-50 placeholder:text-stone-500' : 'text-stone-900 placeholder:text-stone-400'}`}
          />
        </FieldCmp>

        <FieldCmp icon={Lock} label="Confirm Password">
          <input
            type={showPw ? 'text' : 'password'}
            value={pw2}
            onChange={e => setPw2(e.target.value)}
            placeholder="Re-enter password"
            className={`w-full bg-transparent focus:outline-none text-base ${dark ? 'text-amber-50 placeholder:text-stone-500' : 'text-stone-900 placeholder:text-stone-400'}`}
          />
        </FieldCmp>

        {pw1 && pw2 && pw1 === pw2 && pw1.length >= 4 && pw1 !== DEFAULT_PASSWORD_HINT && (
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${dark ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-700/50' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            <CheckCircle2 size={14} /> Passwords match
          </div>
        )}

        {error && (
          dark ? (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-900/30 border border-red-700/50 rounded-xl text-sm text-red-300">
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          ) : <ErrorBanner message={error} />
        )}

        <button type="submit" disabled={saving || !pw1 || !pw2} className={btnCls}>
          {saving ? <><RefreshCw size={16} className="animate-spin" /> Saving…</> : <>Save Password <ChevronRight size={18} /></>}
        </button>
      </form>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  PHOTO CAPTURE — camera or gallery, works on iOS + Android
// ════════════════════════════════════════════════════════════════
function PhotoCapture({ employee, onSaved }) {
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onerror = () => setError('Could not read the image — try again');
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => setError('Invalid image — try another photo');
      img.onload = () => {
        try {
          const maxSize = 480;
          const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          setPreview(canvas.toDataURL('image/jpeg', 0.78));
        } catch (err) {
          setError('Could not process the image');
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await api('savePhoto', { phone: employee.phone, photoDataUrl: preview });
      onSaved(res.photoLink || '');
    } catch (err) {
      setError(err.message || 'Photo upload failed');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6">
      <div className="pt-10 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-[11px] font-semibold tracking-wider uppercase">
          <Sparkles size={12} /> First-time setup
        </div>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-stone-900">Add your photo.</h2>
        <p className="mt-2 text-stone-600 text-sm">
          Hi <span className="font-semibold text-stone-900">{employee.name}</span> — the canteen team will use this to verify it's you.
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-56 h-56 rounded-3xl overflow-hidden bg-stone-200 border-4 border-white shadow-2xl shadow-stone-300 flex items-center justify-center mb-6">
          {preview
            ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
            : <Camera size={64} className="text-stone-400" />}
        </div>

        <input ref={cameraRef} type="file" accept="image/*" capture="user" onChange={handleFile} className="hidden" />
        <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

        {error && <div className="w-full mb-4"><ErrorBanner message={error} /></div>}

        {!preview ? (
          <div className="w-full space-y-3">
            <button
              onClick={() => cameraRef.current?.click()}
              className="w-full bg-amber-500 text-stone-900 font-semibold py-4 rounded-xl hover:bg-amber-400 transition-all active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg shadow-amber-200"
            >
              <Camera size={18} /> Take Photo with Camera
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              className="w-full bg-white border border-stone-200 text-stone-700 font-semibold py-3 rounded-xl hover:bg-stone-50 transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-sm"
            >
              <Sparkles size={16} /> Choose from Gallery
            </button>
          </div>
        ) : (
          <div className="flex gap-3 w-full">
            <button
              onClick={() => {
                setPreview(null);
                if (cameraRef.current) cameraRef.current.value = '';
                if (galleryRef.current) galleryRef.current.value = '';
              }}
              className="flex-1 bg-white border border-stone-200 text-stone-700 font-semibold py-3.5 rounded-xl hover:bg-stone-50"
              disabled={saving}
            >Retake</button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 bg-stone-900 text-amber-50 font-semibold py-3.5 rounded-xl hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <><RefreshCw size={16} className="animate-spin" /> Uploading…</> : <><Check size={18} /> Save Photo</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  EMPLOYEE DASHBOARD — TWO MEAL CARDS
// ════════════════════════════════════════════════════════════════
function EmployeeDashboard({ employee, onLogout }) {
  const [todayData, setTodayData] = useState({ tokens: { breakfast: null, lunch: null }, breakfastAvailable: false, lunchAvailable: false });
  const [generating, setGenerating] = useState({ breakfast: false, lunch: false });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState('');

  const loadAll = async () => {
    try {
      const [todayRes, historyRes] = await Promise.all([
        api('getTodayTokens', { phone: employee.phone }),
        api('getMonthlyHistory', { phone: employee.phone })
      ]);
      setTodayData({
        tokens: todayRes.tokens || { breakfast: null, lunch: null },
        breakfastAvailable: !!todayRes.breakfastAvailable,
        lunchAvailable: !!todayRes.lunchAvailable
      });
      setHistory(historyRes.history || []);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const generate = async (mealType) => {
    setGenerating(g => ({ ...g, [mealType]: true }));
    setError('');
    try {
      const res = await api('generateToken', { phone: employee.phone, mealType });
      if (res.token) {
        setTodayData(d => ({ ...d, tokens: { ...d.tokens, [mealType]: res.token } }));
      }
      loadAll();
    } catch (err) {
      setError(err.message || 'Failed to generate token');
    } finally {
      setGenerating(g => ({ ...g, [mealType]: false }));
    }
  };

  if (loading) return <FullPageSpinner />;

  return (
    <div className="min-h-screen flex flex-col pb-6">
      {/* Header */}
      <div className="bg-stone-900 text-amber-50 px-6 pt-10 pb-8 rounded-b-3xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-400/50 bg-stone-800 flex-shrink-0">
              {employee.photoLink
                ? <img src={employee.photoLink} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                : <div className="w-full h-full flex items-center justify-center"><User size={28} className="text-stone-500" /></div>}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-amber-200/70 uppercase tracking-wider">Welcome</div>
              <div className="text-xl font-bold leading-tight truncate">{employee.name}</div>
              <div className="text-xs text-stone-400 mt-0.5">{employee.designation}</div>
            </div>
          </div>
          <button onClick={onLogout} className="p-2 -mr-2 text-stone-400 hover:text-amber-300">
            <LogOut size={18} />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-stone-300"><MapPin size={12} /> {employee.city}</div>
          <div className="flex items-center gap-1.5 text-stone-300"><Building2 size={12} /> {employee.warehouse}</div>
        </div>
      </div>

      <div className="flex-1 px-6 -mt-4 space-y-4">
        {error && <ErrorBanner message={error} />}

        {/* Today's date */}
        <div className="text-center text-xs text-stone-500 font-medium flex items-center justify-center gap-1.5 pt-2">
          <Calendar size={12} className="text-amber-600" /> {fmtFullDate()}
        </div>

        {/* Breakfast Card */}
        <MealCard
          mealType="breakfast"
          token={todayData.tokens.breakfast}
          available={todayData.breakfastAvailable}
          generating={generating.breakfast}
          onGenerate={() => generate('breakfast')}
        />

        {/* Lunch Card */}
        <MealCard
          mealType="lunch"
          token={todayData.tokens.lunch}
          available={todayData.lunchAvailable}
          generating={generating.lunch}
          onGenerate={() => generate('lunch')}
        />

        {/* History */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-4 bg-white border border-stone-200 rounded-2xl hover:border-stone-300"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-stone-100 rounded-lg flex items-center justify-center text-stone-700">
              <History size={16} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm text-stone-900">Monthly Consumption</div>
              <div className="text-xs text-stone-500">{history.length} token{history.length === 1 ? '' : 's'} this month</div>
            </div>
          </div>
          <ChevronRight size={18} className={`text-stone-400 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
        </button>

        {showHistory && (
          <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100 overflow-hidden">
            {history.length === 0 ? (
              <div className="p-8 text-center text-sm text-stone-500">No tokens used this month yet.</div>
            ) : (
              history.map((h, idx) => {
                const meal = MEALS[h.mealType] || {};
                return (
                  <div key={idx} className="px-4 py-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          h.mealType === 'breakfast' ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-800'
                        }`}>{meal.label || h.mealType}</span>
                        <span className="text-sm font-medium text-stone-900">{fmtDate(h.date)}</span>
                      </div>
                      <div className="text-xs text-stone-500 font-mono mt-0.5">{h.tokenId}</div>
                    </div>
                    <div className="text-right">
                      {h.foodProvided ? (
                        <div className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                          <CheckCircle2 size={13} /> Served
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-amber-700 font-medium">
                          <Clock size={13} /> Pending
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  MEAL CARD — reusable for breakfast & lunch
// ════════════════════════════════════════════════════════════════
function MealCard({ mealType, token, available, generating, onGenerate }) {
  const meal = MEALS[mealType];
  const Icon = meal.icon;
  const colors = mealType === 'breakfast'
    ? {
        accent: 'bg-amber-500 hover:bg-amber-400 shadow-amber-200',
        accentText: 'text-stone-900',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-800',
        tokenBg: 'from-stone-50 to-amber-50 border-amber-300'
      }
    : {
        accent: 'bg-orange-500 hover:bg-orange-400 shadow-orange-200',
        accentText: 'text-white',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-700',
        badge: 'bg-orange-100 text-orange-800',
        tokenBg: 'from-stone-50 to-orange-50 border-orange-300'
      };

  const status = !token ? (available ? 'available' : 'closed') : (token.foodProvided ? 'served' : 'active');

  return (
    <div className="bg-white rounded-3xl shadow-lg shadow-stone-300/30 border border-stone-100 overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${colors.iconBg} rounded-xl flex items-center justify-center ${colors.iconColor}`}>
            <Icon size={20} />
          </div>
          <div>
            <div className="font-bold text-stone-900">{meal.label}</div>
            <div className="text-[11px] text-stone-500 flex items-center gap-1">
              <Clock size={10} /> {meal.window}
            </div>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          status === 'served' ? 'bg-emerald-100 text-emerald-700'
          : status === 'active' ? colors.badge
          : status === 'available' ? 'bg-stone-100 text-stone-600'
          : 'bg-stone-100 text-stone-400'
        }`}>
          {status === 'served' ? 'Served'
           : status === 'active' ? 'Active'
           : status === 'available' ? 'Ready'
           : 'Closed'}
        </div>
      </div>

      <div className="px-5 pb-5">
        {!token ? (
          available ? (
            <button
              onClick={onGenerate}
              disabled={generating}
              className={`w-full ${colors.accent} ${colors.accentText} font-bold py-4 rounded-2xl disabled:opacity-50 transition-all active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg`}
            >
              {generating
                ? <><RefreshCw size={18} className="animate-spin" /> Generating…</>
                : <><Coffee size={18} /> Use {meal.label} Token</>}
            </button>
          ) : (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-center">
              <div className="text-xs text-stone-500">
                {meal.label} window: <span className="font-semibold text-stone-700">{meal.window}</span>
              </div>
              <div className="text-[11px] text-stone-400 mt-1">Come back during this window to claim your token.</div>
            </div>
          )
        ) : (
          <div className={`bg-gradient-to-br ${colors.tokenBg} border-2 border-dashed rounded-2xl p-4 text-center`}>
            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-semibold">Token ID</div>
            <div className="mt-1.5 text-3xl font-bold font-mono tracking-[0.05em] text-stone-900 break-all">
              {token.tokenId}
            </div>
            {token.foodProvided && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                <CheckCircle2 size={12} /> Meal served
              </div>
            )}
            {!token.foodProvided && (
              <div className="mt-3 text-[11px] text-stone-600">Show this code to the canteen staff.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  CANTEEN LOGIN
// ════════════════════════════════════════════════════════════════
function CanteenLogin({ onBack, onResult }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api('loginCanteen', { userId: userId.trim(), password });
      onResult(res);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-stone-900 text-amber-50">
      <button onClick={onBack} className="self-start -ml-2 p-2 text-stone-400 hover:text-amber-300">
        <ChevronLeft size={22} />
      </button>

      <div className="pt-6 pb-8">
        <div className="text-amber-300 mb-4"><ForkSpoonLogo size={44} color="currentColor" /></div>
        <h2 className="text-3xl font-bold tracking-tight">Canteen Staff.</h2>
        <p className="mt-2 text-stone-400 text-sm">Sign in to verify today's tokens.</p>
      </div>

      <form onSubmit={submit} className="space-y-4 flex-1">
        <DarkField icon={User} label="User ID">
          <input
            type="text"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            placeholder="e.g. RMMUM101"
            className="w-full bg-transparent text-amber-50 placeholder:text-stone-500 focus:outline-none text-base"
            autoCapitalize="characters"
          />
        </DarkField>
        <DarkField icon={Lock} label="Password" right={
          <button type="button" onClick={() => setShowPw(s => !s)} className="text-stone-500 hover:text-amber-300">
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }>
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full bg-transparent text-amber-50 placeholder:text-stone-500 focus:outline-none text-base"
          />
        </DarkField>

        <div className="bg-stone-800/60 border border-stone-700 rounded-xl p-3 flex items-start gap-2 text-[11px] text-stone-400">
          <Info size={13} className="mt-0.5 flex-shrink-0" />
          <div>First time? Use default password <span className="font-mono font-semibold text-amber-300">{DEFAULT_PASSWORD_HINT}</span>.</div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-900/30 border border-red-700/50 rounded-xl text-sm text-red-300">
            <AlertCircle size={16} className="flex-shrink-0" /> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !userId || !password}
          className="w-full bg-amber-400 text-stone-900 font-semibold py-4 rounded-xl hover:bg-amber-300 disabled:opacity-40 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
        >
          {loading ? <><RefreshCw size={16} className="animate-spin" /> Verifying…</> : <>Sign In <ChevronRight size={18} /></>}
        </button>
      </form>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  CANTEEN DASHBOARD — meal filter tabs
// ════════════════════════════════════════════════════════════════
function CanteenDashboard({ staff, onLogout }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mealFilter, setMealFilter] = useState('all'); // all | breakfast | lunch
  const [statusFilter, setStatusFilter] = useState('pending'); // pending | served | all
  const [error, setError] = useState('');

  const load = async () => {
    setRefreshing(true);
    setError('');
    try {
      const res = await api('getCanteenTokens', { city: staff.city, warehouse: staff.warehouse });
      const list = res.tokens || [];
      list.sort((a, b) => {
        if (a.foodProvided !== b.foodProvided) return a.foodProvided ? 1 : -1;
        if (a.mealType !== b.mealType) return (a.mealType || '').localeCompare(b.mealType || '');
        return 0;
      });
      setTokens(list);
    } catch (err) {
      setError(err.message || 'Failed to load tokens');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const markServed = async (phone, mealType, served) => {
    try {
      await api('markServed', { phone, mealType, served, canteenPersonId: staff.userId });
      setTokens(prev => prev.map(t =>
        (t.phone === phone && t.mealType === mealType) ? { ...t, foodProvided: served } : t
      ));
    } catch (err) {
      setError(err.message || 'Failed to update');
    }
  };

  // counts
  const counts = {
    all: tokens.length,
    breakfast: tokens.filter(t => t.mealType === 'breakfast').length,
    lunch: tokens.filter(t => t.mealType === 'lunch').length,
    pending: tokens.filter(t => !t.foodProvided).length,
    served: tokens.filter(t => t.foodProvided).length
  };

  const filtered = tokens.filter(t => {
    if (mealFilter !== 'all' && t.mealType !== mealFilter) return false;
    if (statusFilter === 'pending' && t.foodProvided) return false;
    if (statusFilter === 'served' && !t.foodProvided) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-stone-100">
      {/* Header */}
      <div className="bg-stone-900 text-amber-50 px-6 pt-10 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-amber-200/70 uppercase tracking-wider">Canteen Counter</div>
            <div className="text-xl font-bold leading-tight mt-0.5">{staff.userId}</div>
            <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
              <span className="flex items-center gap-1"><MapPin size={11} /> {staff.city}</span>
              <span className="flex items-center gap-1"><Building2 size={11} /> {staff.warehouse}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={refreshing} className="p-2 text-stone-400 hover:text-amber-300">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={onLogout} className="p-2 text-stone-400 hover:text-amber-300">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Meal tabs */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <MealTab label="All" count={counts.all} active={mealFilter === 'all'} onClick={() => setMealFilter('all')} />
          <MealTab label="Breakfast" count={counts.breakfast} active={mealFilter === 'breakfast'} onClick={() => setMealFilter('breakfast')} icon={Sunrise} accent="amber" />
          <MealTab label="Lunch" count={counts.lunch} active={mealFilter === 'lunch'} onClick={() => setMealFilter('lunch')} icon={Sun} accent="orange" />
        </div>
      </div>

      {/* Status sub-filter */}
      <div className="px-6 pt-4 pb-2 flex items-center gap-2">
        <div className="flex bg-white border border-stone-200 rounded-full p-1 text-xs">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-full font-semibold ${statusFilter === 'pending' ? 'bg-stone-900 text-amber-50' : 'text-stone-600'}`}
          >Pending ({counts.pending})</button>
          <button
            onClick={() => setStatusFilter('served')}
            className={`px-3 py-1.5 rounded-full font-semibold ${statusFilter === 'served' ? 'bg-stone-900 text-amber-50' : 'text-stone-600'}`}
          >Served ({counts.served})</button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-full font-semibold ${statusFilter === 'all' ? 'bg-stone-900 text-amber-50' : 'text-stone-600'}`}
          >All</button>
        </div>
      </div>

      <div className="px-6 pt-2 pb-3 flex items-center gap-2 text-xs text-stone-600">
        <Calendar size={12} className="text-amber-600" />
        <span className="font-medium">{fmtFullDate()}</span>
      </div>

      <div className="flex-1 px-6 pb-6">
        {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

        {loading ? <FullPageSpinner inline /> :
          filtered.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center">
              <Coffee size={32} className="mx-auto text-stone-300" />
              <div className="mt-3 text-sm font-medium text-stone-600">No tokens to show</div>
              <div className="mt-1 text-xs text-stone-400">Try changing the filters above.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((t) => (
                <TokenCard key={`${t.phone}-${t.mealType}`} token={t} onMark={markServed} />
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}

function MealTab({ label, count, active, onClick, icon: Icon, accent }) {
  const activeBg =
    accent === 'amber' ? 'bg-amber-400 text-stone-900' :
    accent === 'orange' ? 'bg-orange-400 text-stone-900' :
    'bg-amber-50 text-stone-900';
  const inactiveBg =
    accent === 'amber' ? 'bg-stone-800 text-amber-300' :
    accent === 'orange' ? 'bg-stone-800 text-orange-300' :
    'bg-stone-800 text-stone-200';
  return (
    <button onClick={onClick} className={`rounded-xl px-3 py-2.5 text-left transition-all ${active ? activeBg : inactiveBg}`}>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={12} />}
        <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80">{label}</div>
      </div>
      <div className="text-2xl font-bold leading-none mt-1">{count}</div>
    </button>
  );
}

function TokenCard({ token, onMark }) {
  const isBreakfast = token.mealType === 'breakfast';
  return (
    <div className={`bg-white rounded-2xl border ${token.foodProvided ? 'border-emerald-200' : 'border-stone-200'} overflow-hidden shadow-sm`}>
      <div className="p-4 flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
          {token.photoLink
            ? <img src={token.photoLink} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            : <div className="w-full h-full flex items-center justify-center text-stone-400"><User size={22} /></div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-stone-900 truncate">{token.name}</div>
          <div className="text-xs text-stone-500 mt-0.5">{token.designation}</div>
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              isBreakfast ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-800'
            }`}>
              {isBreakfast ? 'Breakfast' : 'Lunch'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
              <Hash size={10} /> {token.tokenId}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        {!token.foodProvided ? (
          <button
            onClick={() => onMark(token.phone, token.mealType, true)}
            className="w-full bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-emerald-500 transition-all active:scale-[0.99] flex items-center justify-center gap-1.5"
          >
            <Check size={16} /> Food Provided
          </button>
        ) : (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 size={14} />
              <span className="font-semibold">Served</span>
              {token.canteenPersonId && <span className="text-emerald-700">· by {token.canteenPersonId}</span>}
            </div>
            <button
              onClick={() => onMark(token.phone, token.mealType, false)}
              className="text-[11px] text-emerald-700 hover:text-emerald-900 underline"
            >Undo</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  SHARED
// ════════════════════════════════════════════════════════════════
function Field({ icon: Icon, label, children, right }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl px-4 py-3 focus-within:border-amber-400 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold flex items-center gap-1.5">
          <Icon size={11} /> {label}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function DarkField({ icon: Icon, label, children, right }) {
  return (
    <div className="bg-stone-800/60 border border-stone-700 rounded-2xl px-4 py-3 focus-within:border-amber-400 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold flex items-center gap-1.5">
          <Icon size={11} /> {label}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function FullPageSpinner({ inline }) {
  return (
    <div className={`${inline ? 'py-12' : 'min-h-screen'} flex items-center justify-center`}>
      <RefreshCw size={24} className="animate-spin text-stone-400" />
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
      <AlertCircle size={16} className="flex-shrink-0" /> {message}
    </div>
  );
}
