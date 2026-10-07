/**
 * pages/Register/index.jsx
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, clearError } from '../../features/authSlice';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});

  const onChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setFieldErrors((p) => ({ ...p, [e.target.name]: '' }));
    dispatch(clearError());
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(registerUser(form));
    if (registerUser.fulfilled.match(result)) {
      navigate('/dashboard');
    } else {
      const errs = result.payload?.errors || [];
      const map = {};
      errs.forEach((err) => { map[err.field] = err.message; });
      setFieldErrors(map);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Create your account</h2>

      {error && !Object.keys(fieldErrors).length && (
        <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error.message}</p>
      )}

      <Input label="Full name" id="name" name="name" value={form.name}
        onChange={onChange} error={fieldErrors.name} required />
      <Input label="Email" id="email" name="email" type="email" value={form.email}
        onChange={onChange} error={fieldErrors.email} required />
      <Input label="Password" id="password" name="password" type="password" value={form.password}
        onChange={onChange} error={fieldErrors.password} required />

      <Button type="submit" loading={isLoading} className="w-full">Create account</Button>

      <p className="text-center text-sm text-slate-500 dark:text-zinc-400">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-500 hover:underline">Log in</Link>
      </p>
    </form>
  );
};

export default Register;
