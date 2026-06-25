import { useState } from 'react';
import { useAuth } from './AuthContext';
import { CheckSquare, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function Auth() {
  const { signIn, resetPassword } = useAuth();
  const [mode, setMode] = useState<'signin' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) setError(error.message);
        else setMessage('Password reset email sent. Check your inbox.');
      } else {
        const { error } = await signIn(email, password);
        if (error) setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-600 flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl  text-slate-900">Task Flow - Sharpen.Studio
</h1>
          
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-1">
            {mode === 'signin' ? 'Welcome back' : 'Reset password'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {mode === 'signin' ? 'Sign in to manage your projects' : "We'll send you a reset link"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {mode === 'signin' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm transition-colors"
                    placeholder="Enter your password"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : 'Send Reset Link'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-sm">
            {mode === 'signin' ? (
              <button
                onClick={() => { setMode('reset'); setError(''); setMessage(''); }}
                className="text-slate-500 hover:text-slate-700"
              >
                Forgot password?
              </button>
            ) : (
              <button
                onClick={() => { setMode('signin'); setError(''); setMessage(''); }}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
