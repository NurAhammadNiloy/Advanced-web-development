import { Link } from "react-router-dom";

function ServerErrorPage() {
  return (
    <section className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-[0_4px_40px_rgb(0,0,0,0.06)]">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-3xl font-bold text-[#e10e49]" aria-hidden="true">
        500
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
      <p className="mt-3 text-sm text-gray-500">The server could not complete that request. Please try again in a moment.</p>
      <Link to="/" className="mt-6 inline-flex rounded-2xl bg-[#e10e49] px-6 py-3 text-sm font-bold text-white">
        Back home
      </Link>
    </section>
  );
}

export default ServerErrorPage;
