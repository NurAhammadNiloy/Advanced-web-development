const Footer = () => {
  return (
    <footer className="bg-brand-dark text-white py-6 mt-auto">
      <div className="mx-auto max-w-7xl px-6 text-center text-sm text-white/70">
        &copy; {new Date().getFullYear()} Booking System. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;