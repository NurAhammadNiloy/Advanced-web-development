import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <section className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-[0_4px_40px_rgb(0,0,0,0.06)]">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-3xl font-bold text-[#e10e49]" aria-hidden="true">
        404
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-3 text-sm text-gray-500">This page does not exist or the link is no longer active.</p>
      <Link to="/" className="mt-6 inline-flex rounded-2xl bg-[#e10e49] px-6 py-3 text-sm font-bold text-white">
        Back home
      </Link>
    </section>
  );
}

export default NotFoundPage;
