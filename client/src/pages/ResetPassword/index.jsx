/**
 * pages/ResetPassword/index.jsx
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../api/authService';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      toast.success('Password reset! Please log in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Set new password</h2>
      {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
      <Input label="New password" id="new-password" type="password" value={password}
        onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      <Button type="submit" loading={loading} className="w-full">Reset password</Button>
    </form>
  );
};

export default ResetPassword;
