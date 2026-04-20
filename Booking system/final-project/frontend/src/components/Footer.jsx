const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-sm text-slate-600 sm:flex-row">
        <span>&copy; {year} Booking System. All rights reserved.</span>
        <nav className="flex gap-4" aria-label="Footer">
          <a href="/help" className="font-semibold hover:text-slate-950">Help</a>
          <a href="/privacy" className="font-semibold hover:text-slate-950">Privacy</a>
          <a href="/terms" className="font-semibold hover:text-slate-950">Terms</a>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
