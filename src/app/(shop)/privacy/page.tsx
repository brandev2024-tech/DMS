import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How DMS (Direct Message Us) collects, uses and protects your information on the website and the DMS app.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const settings = await getSettings();
  const contact = settings.email ?? "our Facebook or Instagram page";
  return (
    <LegalPage eyebrow="Legal" title="Privacy Policy" updated="October 3, 2026">
      <section>
        <p>
          This policy explains what {settings.shop_name} (&ldquo;Direct Message Us&rdquo;, &ldquo;we&rdquo;) collects when you use our website and the DMS mobile app,
          and how we use it. We only collect what we need to show you our pieces and answer your inquiries. We never sell your information.
        </p>
      </section>
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account details</strong> (only if you register): your email address, name, and, if you add them, your phone number and delivery
            address. If you sign in with Google or Apple, we receive your name and email from them.
          </li>
          <li>
            <strong>Direct Ask chats</strong>: the messages and photos you send us, and the product you asked about.
          </li>
          <li>
            <strong>Favorites</strong>: the products you save. When you are not logged in, they stay on your device only.
          </li>
          <li>
            <strong>Notifications</strong>: if you turn them on, a device token so we can notify you when we reply.
          </li>
          <li>
            <strong>Shop statistics</strong>: anonymous counts of product views and of taps on our Messenger, Instagram and Direct Ask buttons. These are
            not linked to your account.
          </li>
        </ul>
        <p className="mt-3">
          When you message us on Messenger or Instagram, that conversation happens on Meta&rsquo;s apps and is covered by Meta&rsquo;s privacy policy.
        </p>
      </section>
      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To answer your questions and arrange your orders, payment and delivery.</li>
          <li>To keep you signed in and keep your favorites on all your devices.</li>
          <li>To send you chat notifications you asked for.</li>
          <li>To understand which pieces shoppers like, so we can restock them.</li>
        </ul>
      </section>
      <section>
        <h2>Who helps us run the shop</h2>
        <p>
          Your data is stored and processed by our service providers, only to run the shop: Supabase (accounts and database), Cloudflare (website hosting
          and photo storage), and Expo, Apple and Google (delivering app notifications). Couriers such as J&amp;T Express and LBC receive the delivery
          details you give us for your order.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <ul>
          <li>You can browse and save favorites without an account.</li>
          <li>You can edit your name, phone and address any time in your account.</li>
          <li>You can turn notifications off in the app or in your phone settings.</li>
          <li>
            You can delete your account in the app (Account &rarr; Delete my account). This permanently deletes your account, favorites and Direct Ask
            chats. You can also ask us to do it by contacting {contact}.
          </li>
        </ul>
      </section>
      <section>
        <h2>Keeping it safe</h2>
        <p>
          We use encrypted connections, and access rules in our database so shoppers can only see their own chats and favorites. We keep chats for as
          long as your account exists, so we can help you with past orders.
        </p>
      </section>
      <section>
        <h2>Children</h2>
        <p>Our shop is not directed to children under 13, and we do not knowingly collect their information.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Questions about your privacy? Contact us at {contact}
          {settings.phone ? ` or ${settings.phone}` : ""}. We will update this page if anything changes.
        </p>
      </section>
    </LegalPage>
  );
}
