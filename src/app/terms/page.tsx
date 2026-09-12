import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Terms of Service — Student Archive',
  description: 'Terms of Service for Student Archive (studentarchive.xyz)',
};

export default function TermsPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#07090d', color: '#d4c4a0' }}>
      <Header />
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '60px 24px 100px', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '15px', lineHeight: 1.75 }}>

        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 300, color: '#e8dcc4', letterSpacing: '0.04em', marginBottom: '8px' }}>
          Terms of Service
        </h1>
        <p style={{ color: 'rgba(180,160,120,0.6)', fontSize: '13px', marginBottom: '48px' }}>
          Last updated: January 2025
        </p>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 600, color: '#e8dcc4', marginBottom: '12px' }}>1. Acceptance of terms</h2>
          <p style={{ color: 'rgba(200,180,140,0.8)' }}>
            By accessing or using Student Archive (<strong>studentarchive.xyz</strong>), you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 600, color: '#e8dcc4', marginBottom: '12px' }}>2. Description of service</h2>
          <p style={{ color: 'rgba(200,180,140,0.8)' }}>
            Student Archive is a free educational platform providing access to Cambridge past papers, mark schemes and examiner reports for IGCSE, AS &amp; A Level, IGCSE 9-1 and O Level students. The service is provided free of charge for personal, non-commercial study use.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 600, color: '#e8dcc4', marginBottom: '12px' }}>3. Intellectual property</h2>
          <p style={{ color: 'rgba(200,180,140,0.8)' }}>
            Past papers, mark schemes and examiner reports are the intellectual property of Cambridge Assessment International Education (CAIE). They are made available here for educational purposes only. Student Archive does not claim ownership of any Cambridge examination materials.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 600, color: '#e8dcc4', marginBottom: '12px' }}>4. Acceptable use</h2>
          <p style={{ color: 'rgba(200,180,140,0.8)', marginBottom: '12px' }}>You agree not to:</p>
          <ul style={{ color: 'rgba(200,180,140,0.8)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Use the service for any unlawful purpose</li>
            <li>Redistribute or commercially exploit any content from this platform</li>
            <li>Attempt to gain unauthorised access to any part of the service</li>
            <li>Use automated tools to scrape or mass-download content</li>
            <li>Upload content that is harmful, offensive or infringes third-party rights</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 600, color: '#e8dcc4', marginBottom: '12px' }}>5. User accounts</h2>
          <p style={{ color: 'rgba(200,180,140,0.8)' }}>
            You may sign in using your Google account. You are responsible for maintaining the security of your account. We reserve the right to suspend or terminate accounts that violate these terms.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 600, color: '#e8dcc4', marginBottom: '12px' }}>6. User-generated content</h2>
          <p style={{ color: 'rgba(200,180,140,0.8)' }}>
            Users may upload study resources (notes, flashcards, etc.) to the platform. By uploading content you confirm you have the right to share it and grant Student Archive a non-exclusive licence to display it on the platform. We reserve the right to remove any content that violates these terms.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 600, color: '#e8dcc4', marginBottom: '12px' }}>7. Disclaimer of warranties</h2>
          <p style={{ color: 'rgba(200,180,140,0.8)' }}>
            Student Archive is provided "as is" without warranties of any kind. We do not guarantee the accuracy, completeness or availability of any content. Past paper answers and mark schemes are provided for reference only — always verify with official Cambridge resources.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 600, color: '#e8dcc4', marginBottom: '12px' }}>8. Limitation of liability</h2>
          <p style={{ color: 'rgba(200,180,140,0.8)' }}>
            To the fullest extent permitted by law, Student Archive shall not be liable for any indirect, incidental or consequential damages arising from your use of the service.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 600, color: '#e8dcc4', marginBottom: '12px' }}>9. Changes to terms</h2>
          <p style={{ color: 'rgba(200,180,140,0.8)' }}>
            We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the updated terms. We will update the "Last updated" date at the top of this page when changes are made.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 600, color: '#e8dcc4', marginBottom: '12px' }}>10. Contact</h2>
          <p style={{ color: 'rgba(200,180,140,0.8)' }}>
            Questions about these terms? Email us at{' '}
            <a href="mailto:studentarchive.support@gmail.com" style={{ color: '#C9A84C' }}>studentarchive.support@gmail.com</a>.
          </p>
        </section>

      </div>
      <Footer />
    </main>
  );
}
