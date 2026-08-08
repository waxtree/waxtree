import { AuthLayout } from '@/components/auth/AuthLayout';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const RegisterPage = () => (
  <AuthLayout maxWidth={420}>
    <RegisterForm />
  </AuthLayout>
);
