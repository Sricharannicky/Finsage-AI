import type { Metadata } from "next";
import Link from "next/link";
import { Brain } from "lucide-react";

// TODO(MANUAL, before publishing): replace with a real inbox you monitor.
// Do not publish the policy with this placeholder still in place.
const CONTACT_EMAIL = "REPLACE_WITH_CONTACT_EMAIL";

const LAST_UPDATED = "October 5, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy — FinSage AI",
  description: "How FinSage AI collects, uses and protects your personal and financial information.",
  robots: { index: true, follow: true },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center gap-2 mb-2">
          <div className="size-9 rounded-2xl gradient-emerald flex items-center justify-center">
            <Brain className="size-4 text-white" />
          </div>
          <span className="font-bold text-lg">FinSage AI</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mt-1">Last updated: {LAST_UPDATED}</p>

        <div className="glass rounded-3xl p-7 mt-6">
          <Section title="Overview">
            <p>
              FinSage AI is a personal finance and budgeting application. This policy explains what
              information we collect, why we collect it, how it is stored and protected, and the
              choices you have. We only collect information that is needed to run the app&apos;s
              features.
            </p>
          </Section>

          <Section title="Information we collect">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium text-foreground">Account information:</span> your name,
                email address and authentication method (email and password, or Google sign-in).
                Passwords are stored only as salted bcrypt hashes and are never stored in plain text.
              </li>
              <li>
                <span className="font-medium text-foreground">Financial information you enter:</span>{" "}
                income, expenses, budgets, savings goals, bills, investments, net worth entries,
                categories, currency preference and similar records you choose to add.
              </li>
              <li>
                <span className="font-medium text-foreground">AI conversations:</span> the messages
                you send to the AI advisor and the responses generated for you, so that conversation
                history can be shown and continued.
              </li>
              <li>
                <span className="font-medium text-foreground">Usage information:</span> session
                information required to keep you signed in, such as a session cookie.
              </li>
            </ul>
            <p>We do not collect your contacts, precise location, photos, or phone/device contacts.</p>
          </Section>

          <Section title="How we use your information">
            <ul className="list-disc pl-5 space-y-2">
              <li>To create and manage your account and keep you signed in.</li>
              <li>To provide budgeting, tracking, reporting and forecasting features.</li>
              <li>
                To generate personalised AI advice: a summary of your financial data and your recent
                messages are sent to our AI provider to produce responses.
              </li>
              <li>To send transactional email, such as password reset links.</li>
              <li>To secure the service, prevent abuse and fix errors.</li>
            </ul>
            <p>We do not use your financial data for advertising, and we do not sell your data.</p>
          </Section>

          <Section title="AI processing">
            <p>
              When you use the AI advisor, relevant portions of your financial profile (for example
              income, expense and budget summaries) and your message history are transmitted to our
              AI inference provider (Groq) to generate a response. This processing is used only to
              answer your request. Do not send information you do not want processed by that
              provider.
            </p>
          </Section>

          <Section title="Sign in with Google">
            <p>
              If you choose &quot;Continue with Google&quot;, Google shares your name, email address
              and profile picture with us so we can create or connect your account. Your Google
              password is never shared with us. Google&apos;s own terms and privacy policy apply to
              that sign-in.
            </p>
          </Section>

          <Section title="How information is stored and protected">
            <ul className="list-disc pl-5 space-y-2">
              <li>Your data is stored in Google Firebase Firestore, encrypted in transit and at rest.</li>
              <li>
                Session cookies are <code className="text-foreground">HttpOnly</code>,{" "}
                <code className="text-foreground">Secure</code> in production and{" "}
                <code className="text-foreground">SameSite=Lax</code>, and expire after 7 days.
              </li>
              <li>Password reset tokens are stored hashed, expire after 1 hour and can be used once.</li>
              <li>Access is limited to the operation of the service.</li>
            </ul>
            <p>
              No method of transmission or storage is completely secure, but we apply these measures
              to protect your information.
            </p>
          </Section>

          <Section title="Service providers we share data with">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium text-foreground">Google Firebase</span> — database
                hosting, authentication and account storage.
              </li>
              <li>
                <span className="font-medium text-foreground">Groq</span> — AI inference for the
                financial advisor.
              </li>
              <li>
                <span className="font-medium text-foreground">Resend / SMTP email</span> — delivery
                of password reset and other transactional email.
              </li>
            </ul>
            <p>
              We do not share your information with advertisers, data brokers, or for marketing
              purposes, and we do not sell it.
            </p>
          </Section>

          <Section title="Retention">
            <p>
              Your account and financial records are kept while your account exists. Password reset
              tokens expire after 1 hour. You can delete your AI conversation history from the app at
              any time. You can export your income and expense records as CSV from the app.
            </p>
          </Section>

          <Section title="Your rights and choices">
            <ul className="list-disc pl-5 space-y-2">
              <li>Access and review your data within the app.</li>
              <li>Export your income and expense data as CSV.</li>
              <li>Change your password or use Google sign-in instead.</li>
              <li>Delete your AI chat history at any time.</li>
              <li>
                Request correction or deletion of your account data by contacting us (see below).
              </li>
            </ul>
          </Section>

          <Section title="Children&apos;s privacy">
            <p>
              FinSage AI is intended for general audiences and is not directed at children under 13
              (or the minimum age required in your jurisdiction). We do not knowingly collect
              information from children. If you believe a child has provided information, contact us
              and we will delete it.
            </p>
          </Section>

          <Section title="Data location">
            <p>
              Your data is processed and stored in the country where our service providers operate,
              which may include the United States and India. By using the app you understand that
              your information may be transferred to these locations.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              We may update this policy as the app changes. The &quot;Last updated&quot; date above
              shows when it was most recently revised. Continued use after an update means you accept
              the revised policy.
            </p>
          </Section>

          <Section title="Contact us">
            <p>
              For questions, access requests, or deletion requests, email{" "}
              <span className="text-foreground font-medium">{CONTACT_EMAIL}</span> from the address
              registered to your account.
            </p>
          </Section>
        </div>

        <div className="mt-6 text-sm text-muted-foreground">
          <Link href="/" className="text-emerald-500 hover:underline">
            ← Back to FinSage AI
          </Link>
        </div>
      </div>
    </div>
  );
}
