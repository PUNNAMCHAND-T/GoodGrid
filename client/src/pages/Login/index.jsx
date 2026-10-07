/**
 * pages/Login/index.jsx
 * Login form — calls loginUser thunk, surfaces 422 field errors.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearError } from '../../features/authSlice';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});

  const onChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setFieldErrors((p) => ({ ...p, [e.target.name]: '' }));
    dispatch(clearError());
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(loginUser(form));
    if (loginUser.fulfilled.match(result)) {
      navigate('/dashboard');
    } else {
      // Map per-field backend errors
      const errs = result.payload?.errors || [];
      const map = {};
      errs.forEach((err) => { map[err.field] = err.message; });
      setFieldErrors(map);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Welcome back</h2>

      {error && !Object.keys(fieldErrors).length && (
        <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error.message}</p>
      )}

      <Input label="Email" id="email" name="email" type="email" value={form.email}
        onChange={onChange} error={fieldErrors.email} autoComplete="email" required />

      <Input label="Password" id="password" name="password" type="password" value={form.password}
        onChange={onChange} error={fieldErrors.password} autoComplete="current-password" required />

      <div className="text-right">
        <Link to="/forgot-password" className="text-xs text-brand-500 hover:underline">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" loading={isLoading} className="w-full">Log in</Button>

      <p className="text-center text-sm text-slate-500 dark:text-zinc-400">
        No account?{' '}
        <Link to="/register" className="text-brand-500 hover:underline">Sign up</Link>
      </p>
    </form>
  );
};

export default Login;
