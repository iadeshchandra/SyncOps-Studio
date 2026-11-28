import Header from '../components/Header';
import Footer from '../components/Footer';
import { useConfigPageMeta } from '../lib/meta';

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'Who we are',
    body: [
      'SyncOps Studio is a one-architect server-side tracking studio run by Adesh Chandra from Bangladesh. This page explains, in plain words, what data the studio’s website and client portal hold, why, and what you can ask us to do with it. Questions: iadeshchandra@gmail.com.',
    ],
  },
  {
    title: 'What we collect — and why',
    body: [
      'Accounts: when you create an account or hire the studio, we store your name and email address so you can sign in and so your projects, payments and deliveries stay attached to you.',
      'Project data: orders, portal messages, files you share, intake-form answers and payment claims (amount, method and the transaction ID you submit) — everything needed to run your engagement and to verify payments you made directly to the studio.',
      'Free-tool requests: when you use the tracking auditor or the ROI calculator and ask for a report, we store the site address you submitted and the email you gave us, so the report can reach you.',
      'Technical basics: our hosting provider records standard request logs (IP address, browser, time) to keep the site online and secure.',
    ],
  },
  {
    title: 'What we never collect',
    body: [
      'Card numbers and bank logins — never. Payments are coordination, never custody: you pay the studio’s own accounts directly (bKash, Wise, Payoneer or a marketplace), and the portal only records the claim and its verification.',
      'We do not sell personal data, and we do not share it for anyone else’s marketing.',
    ],
  },
  {
    title: 'Cookies, advertising and chat',
    body: [
      'The site itself uses browser storage for sign-in sessions and your preferences (for example your payment-region choice). These are functional, not advertising.',
      'Public pages may show Google AdSense advertising. Google and its partners use cookies to serve and personalise ads based on your visits to this and other sites. You can opt out of personalised advertising at google.com/settings/ads, or via aboutads.info. Google’s own explanation of how it uses data from sites that use its services is at google.com/policies/technologies/partner-sites.',
      'Public pages offer a live-chat widget provided by Tawk.to; if you open it, Tawk.to sets its own cookies and receives what you type there, under its own privacy policy.',
    ],
  },
  {
    title: 'Who processes data for us',
    body: [
      'Firebase (Google) hosts the site, the database and sign-in. Tawk.to provides the public-page chat. That is the whole list of processors today — data goes to them only so the site and your portal work.',
    ],
  },
  {
    title: 'Retention and your rights',
    body: [
      'Project data is kept while your engagement is active and afterwards only as long as tax and accounting law requires the studio to retain records.',
      'At any time you can email iadeshchandra@gmail.com to ask for an export of your data or for its deletion. Deletion is completed within 30 days, keeping only what tax law requires. The same request is available inside your client dashboard, under “Your data”.',
    ],
  },
  {
    title: 'Changes to this page',
    body: [
      'If this policy changes, the new version is posted here with its date. Material changes that affect existing clients are also noted in the portal.',
    ],
  },
];

export default function Privacy() {
  useConfigPageMeta('privacy');

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-6">
        <p className="eyebrow">privacy_policy</p>
        <h1 className="h-display mt-2 text-3xl sm:text-4xl">Privacy Policy</h1>
        <p className="mt-4 leading-relaxed text-slate-400">
          The short, plain version: the studio holds the data your engagement needs, never
          your card details, and never sells anything. Last updated 28 November 2026.
        </p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="h-display text-xl text-slate-100">{s.title}</h2>
              {s.body.map((para, i) => (
                <p key={i} className="mt-3 leading-relaxed text-slate-400">
                  {para}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
