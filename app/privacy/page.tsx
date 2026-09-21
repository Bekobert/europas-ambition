import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Europa\'s Ambition 4',
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-300 font-sans p-8 md:p-16 selection:bg-[#CFB53B] selection:text-slate-900">
      <div className="max-w-3xl mx-auto bg-slate-900/50 p-8 md:p-12 rounded-xl border border-slate-800 shadow-2xl">
        
        <Link href="/" className="text-[#CFB53B] hover:text-[#FFF3A3] text-sm font-bold tracking-wide uppercase flex items-center gap-2 mb-8 transition-colors">
          ← Back to Home
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-serif text-white font-bold mb-8 pb-4 border-b border-slate-800">
          Privacy Policy
        </h1>

        <div className="space-y-8 text-sm md:text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-[#CFB53B] mb-3">1. Information We Collect</h2>
            <p>
              When you use the "Connect Steam" feature, we request your public Steam ID64. Using this ID, we interact with the official Steam Web API to retrieve your public Steam profile name, avatar, and your Europa Universalis IV achievement progress.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#CFB53B] mb-3">2. How We Use Your Information</h2>
            <p>
              The data fetched from Steam is used <strong>strictly</strong> for real-time personalization during your current session. We use it to highlight which achievements you have already completed and which ones are still locked.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#CFB53B] mb-3">3. Data Storage & Retention</h2>
            <p>
              <strong>We do not store your data.</strong> All data retrieved from the Steam Web API is held locally in your browser's active memory for the duration of your session. We have no databases, and we do not log, save, or share your Steam ID, profile information, or achievement data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#CFB53B] mb-3">4. Authentication & Security</h2>
            <p>
              We will never ask for your Steam password. Our application relies solely on your publicly accessible Steam ID64 to query public achievement data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#CFB53B] mb-3">5. Third-Party Services</h2>
            <p>
              This application utilizes the official Steam Web API provided by Valve Corporation. 
              This site is not affiliated with Valve, Steam, or Paradox Interactive. All Steam Data is provided "as is," and we do not guarantee its real-time accuracy or availability.
            </p>
          </section>

          <section>
            <p className="text-slate-500 pt-8 mt-8 border-t border-slate-800">
              Last Updated: September 2026
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}