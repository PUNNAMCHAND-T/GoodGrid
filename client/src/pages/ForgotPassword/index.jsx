/**
 * pages/ForgotPassword/index.jsx
 */
import { useState } from 'react';
import { authService } from '../../api/authService';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center flex flex-col gap-3">
        <div className="w-12 h-12 bg-brand-500/10 text-brand-500 rounded-full flex items-center justify-center mx-auto text-2xl">✓</div>
        <h2 className="font-semibold text-slate-800 dark:text-white">Check your email</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400">If that address is registered, a reset link has been sent.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Reset your password</h2>
      <p className="text-sm text-slate-500 dark:text-zinc-400">Enter your email and we'll send a reset link.</p>
      <Input label="Email" id="forgot-email" type="email" value={email}
        onChange={(e) => setEmail(e.target.value)} required />
      <Button type="submit" loading={loading} className="w-full">Send reset link</Button>
    </form>
  );
};

export default ForgotPassword;
