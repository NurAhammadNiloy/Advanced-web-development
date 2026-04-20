import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Email cannot be blank").email("Enter good email"),
  password: z.string().min(1, "Password needed"),
});

function LoginPage({ showToast }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [website, setWebsite] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if(!email && !password) {
      setFieldErrors({});
      return;
    }
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errs = {};
      result.error.issues.forEach((err) => {
        const fieldName = err.path[0];
        if (!errs[fieldName]) errs[fieldName] = err.message;
      });
      setFieldErrors(errs);
    } else {
      setFieldErrors({});
    }
  }, [email, password]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errs = {};
      result.error.issues.forEach((err) => {
        const fieldName = err.path[0];
        if (!errs[fieldName]) errs[fieldName] = err.message;
      });
      setFieldErrors(errs);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, website }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store token (since API returns it or we can rely on HttpOnly cookie)
      if (data.token) localStorage.setItem("token", data.token);
      if (data.data?.id) localStorage.setItem("user_id", data.data.id);
      if (data.data?.role) localStorage.setItem("user_role", data.data.role);
      if (data.data?.firstName) localStorage.setItem("user_firstName", data.data.firstName);
      if (data.data?.lastName) localStorage.setItem("user_lastName", data.data.lastName);
      if (data.data?.email) localStorage.setItem("user_email", data.data.email);
      if (data.data?.dob) localStorage.setItem("user_dob", String(data.data.dob).split("T")[0]);

      window.dispatchEvent(new Event("auth-change"));
      showToast?.("Signed in successfully.", "success");
      navigate("/resources");
    } catch (err) {
      setError(err.message);
      showToast?.(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-grow flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] bg-white rounded-3xl p-10 flex flex-col relative mx-auto my-8 shadow-[0_4px_40px_rgb(0,0,0,0.06)]">
        <h1 className="text-[28px] font-semibold leading-tight text-gray-900 mb-2">Sign in</h1>
        <p className="text-gray-500 mb-8 text-[13px]">Welcome back! Please enter your details.</p>

        {error && <p role="alert" className="text-red-500 text-sm mb-4">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-5">
          <input className="hidden" tabIndex="-1" autoComplete="off" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} aria-hidden="true" />
          <div>
            <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`px-4 py-3 w-full rounded-2xl bg-gray-50 border text-[13px] font-medium text-gray-800 outline-none focus:border-brand-primary ${fieldErrors.email ? 'border-red-500' : 'border-gray-200'}`}
              placeholder="e.g. user@example.com"
              required
            />
            {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
          </div>
          <div>
            <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Password</label>
            <div className="flex gap-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`px-4 py-3 w-full rounded-2xl bg-gray-50 border text-[13px] font-medium text-gray-800 outline-none focus:border-brand-primary ${fieldErrors.password ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="Enter your password"
                required
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="rounded-2xl border border-gray-200 px-4 text-sm font-bold text-gray-600">
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-4 py-3.5 rounded-2xl text-[14px] font-bold transition-colors ${loading ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-[#e10e49] text-white hover:bg-[#c00a3d]"}`}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
