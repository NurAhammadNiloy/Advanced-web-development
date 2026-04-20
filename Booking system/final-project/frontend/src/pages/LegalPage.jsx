const content = {
  help: {
    title: "Help and FAQ",
    items: [
      ["How do I book a resource?", "Sign in, open Resources, choose a resource, then select a future start and end time."],
      ["Why can I not sign in?", "Check that your email and password are correct, and that your account is active."],
      ["Who can create resources?", "Manager accounts can create, edit, and delete resources."],
    ],
  },
  privacy: {
    title: "Privacy",
    items: [
      ["Data collected", "We store account details, reservations, and security logs needed to operate the booking service."],
      ["Security", "Passwords are hashed, cookies are HTTP-only, and API requests are validated server-side."],
      ["Contact", "Ask your system manager to update or remove account information."],
    ],
  },
  terms: {
    title: "Terms",
    items: [
      ["Use", "Use bookings responsibly and only reserve resources you intend to use."],
      ["Accounts", "Keep your password private and report suspicious access."],
      ["Availability", "Managers may update resources and reservations to keep schedules accurate."],
    ],
  },
};

function LegalPage({ type }) {
  const page = content[type] || content.help;

  return (
    <section className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-[0_4px_40px_rgb(0,0,0,0.06)]">
      <h1 className="text-3xl font-bold text-gray-900">{page.title}</h1>
      <div className="mt-8 grid gap-4">
        {page.items.map(([title, body]) => (
          <article key={title} className="rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default LegalPage;
