import { redirect } from 'next/navigation';

// Login is shared — redirect to the IGCSE login which uses Supabase auth
export default function ALevelsLogin() {
  redirect('/igcse/login');
}
