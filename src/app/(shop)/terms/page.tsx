import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms for using the DMS (Direct Message Us) website and app.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const settings = await getSettings();
  const contact = settings.email ?? "our Facebook or Instagram page";
  return (
    <LegalPage eyebrow="Legal" title="Terms of Use" updated="October 3, 2026">
      <section>
        <p>
          By using the {settings.shop_name} website or app you agree to these terms. If you don&rsquo;t agree, please don&rsquo;t use them.
        </p>
      </section>
      <section>
        <h2>How ordering works</h2>
        <p>
          Our website and app are a showcase. There is no online checkout: you send us an inquiry through Messenger, Instagram or Direct Ask, and we
          confirm the price, availability, payment and delivery with you directly. An order is only confirmed once we both agree in chat.
        </p>
      </section>
      <section>
        <h2>Products and prices</h2>
        <p>
          We do our best to show each piece accurately, but colours can look different on screens. Prices, stock and badges can change at any time.
          Where a price isn&rsquo;t shown, message us for it. The price we confirm in chat is the one that applies.
        </p>
      </section>
      <section>
        <h2>Your account</h2>
        <ul>
          <li>Keep your login details private. You are responsible for activity on your account.</li>
          <li>Please be respectful in Direct Ask. Don&rsquo;t send spam, offensive content or anything you don&rsquo;t have the right to share.</li>
          <li>We may suspend accounts that misuse the service. You can delete your account at any time in the app.</li>
        </ul>
      </section>
      <section>
        <h2>Our content</h2>
        <p>Photos, text and the DMS name and logo belong to us. Please don&rsquo;t copy them for commercial use without permission.</p>
      </section>
      <section>
        <h2>Liability</h2>
        <p>
          We provide the website and app &ldquo;as is&rdquo;. To the extent allowed by law, we are not liable for indirect losses from using them. Nothing
          here limits your rights as a consumer under Philippine law.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Questions? Contact us at {contact}.</p>
      </section>
    </LegalPage>
  );
}
