import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Privacy Policy — Student Archive',
  description: 'Privacy Policy for Student Archive (studentarchive.xyz)',
};

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#07090d', color: '#d4c4a0' }}>
      <Header />
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '60px 24px 100px', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '15px', lineHeight: 1.75 }}>

        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 300, color: '#e8dcc4', letterSpacing: '0.04em', marginBottom: '8px' }}>
          Privacy Policy
        </h1>
        <p style={{ color: 'rgba(180,160,120,0.6)', fontSize: '13px', marginBottom: '48px' }}>
          Last updated: January 2025
        </p>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 600, color: '#e8dcc4', marginBottom: '12px' }}>1. Who we are</h2>
          <p style={{ color: 'rgba(200,180,140,0.8)' }}>
            Student Archive (<strong>studentarchive.xyz</strong>) is a free study resource for Cambridge IGCSE, AS &amp; A Level, IGCSE 9-1 and O Level students. We provide access to past papers, mark schemes and examiner reports.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 600, color: '#e8dcc4', marginBottom: '12px' }}>2. Information we collect</h2>
          <p style={{ color: 'rgba(200,180,140,0.8)', marginBottom: '12px' }}>When you sign in with Google we receive:</p>
          <ul style={{ color: 'rgba(200,180,140,0.8)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Your name and email address (from your Google account)</li>
            <li>A unique identifier from Google</li>
            <li>Your profile picture URL</li>
          </ul>
          <p style={{ color: 'rgba(200,180,140,0.8)', marginTop: '12px' }}>
            We also store your exam attempts and scores so you can track your progress over time. We do not access your Google Drive, Gmail or any other Google service.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 600, color: '#e8dcc4', marginBottom: '12px' }}>3. How we use your information</h2>
          <ul style={{ color: 'rgba(200,180,140,0.8)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>To create and manage your account</li>
            <li>To save your practice exam results and progress</li>
            <li>To display your username and profile within the platform</li>
            <li>To improve the service</li>
          </ul>
          <p style={{ color: 'rgba(200,180,140,0.8)', marginTop: '12px' }}>
            We do not sell, rent or share your personal information with third parties for marketing purposes.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 600, color: '#e8dcc4', marginBottom: '12px' }}>4. Data storage</h2>
          <p style={{ color: 'rgba(200,180,140,0.8)' }}>
            Your data is stored securely using <strong>Supabase</strong>, a hosted PostgreSQL database service. Data is encrypted in transit (HTTPS/TLS) and at rest. We retain your data for as long as your account is active.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 600, color: '#e8dcc4', marginBottom: '12px' }}>5. Cookies</h2>
          <p style={{ color: 'rgba(200,180,140,0.8)' }}>
            We use essential session cookies to keep you logged in. We do not use advertising or tracking cookies.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 600, color: '#e8dcc4', marginBottom: '12px' }}>6. Your rights</h2>
          <p style={{ color: 'rgba(200,180,140,0.8)', marginBottom: '12px' }}>You have the right to:</p>
          <ul style={{ color: 'rgba(200,180,140,0.8)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and associated data</li>
          </ul>
          <p style={{ color: 'rgba(200,180,140,0.8)', marginTop: '12px' }}>
            To exercise any of these rights, email us at <a href="mailto:studentarchive.support@gmail.com" style={{ color: '#C9A84C' }}>studentarchive.support@gmail.com</a>.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 600, color: '#e8dcc4', marginBottom: '12px' }}>7. Third-party services</h2>
          <ul style={{ color: 'rgba(200,180,140,0.8)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li><strong>Google OAuth</strong> — for sign-in authentication</li>
            <li><strong>Supabase</strong> — for database and authentication</li>
            <li><strong>Vercel</strong> — for hosting</li>
            <li><strong>Internet Archive</strong> — for PDF storage and delivery</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 600, color: '#e8dcc4', marginBottom: '12px' }}>8. Contact</h2>
          <p style={{ color: 'rgba(200,180,140,0.8)' }}>
            If you have any questions about this Privacy Policy, contact us at{' '}
            <a href="mailto:studentarchive.support@gmail.com" style={{ color: '#C9A84C' }}>studentarchive.support@gmail.com</a>.
          </p>
        </section>

      </div>
      <Footer />
    </main>
  );
}
