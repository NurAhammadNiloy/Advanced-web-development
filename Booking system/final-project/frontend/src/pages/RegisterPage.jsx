import { useState, useEffect, useRef } from "react";
import { z } from "zod";

// --- Schema Definitions ---
const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "First name must be at least 2 characters")
      .max(50, "cannot exceed 50 characters"),
    lastName: z
      .string()
      .trim()
      .min(2, "Last name must be at least 2 characters")
      .max(50, "cannot exceed 50 characters"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Email cannot be blank")
      .email("Please enter a valid email address"),
    dob: z
        .string()
        .min(1, "Date of birth is required")
        .refine((dateString) => {
            const today = new Date();
            const birthDate = new Date(dateString);
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
            }
            return age >= 18;
        }, "You must be at least 18 years old")
        .refine((dateString) => {
            const today = new Date();
            const birthDate = new Date(dateString);
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
            }
            return age <= 100;
        }, "Age must be 100 years or less"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(64, "Password cannot exceed 64 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
      .refine(
        (val) => !["password", "12345678", "qwerty"].includes(val.toLowerCase()),
        "This password is too common"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    role: z.enum(["reserver", "manager", "administrator"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function RegisterPage({ showToast }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    dob: "",
    password: "",
    confirmPassword: "",
    role: "reserver",
    website: "",
  });


  const [touched, setTouched] = useState({});
  const [liveErrors, setLiveErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [apiResponse, setApiResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  // Password show/hide
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Password strength
  function getPasswordStrength(password) {
    let score = 0;
    if (!password) return 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (password.length >= 12) score++;
    return score;
  }
  const passwordStrength = getPasswordStrength(formData.password);

  const passwordStrengthLabel = [
    "Very Weak",
    "Weak",
    "Medium",
    "Strong",
    "Very Strong",
    "Excellent"
  ][passwordStrength] || "Very Weak";

  // --- Custom Calendar State ---
  const today = new Date();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef(null);

  const [calendarView, setCalendarView] = useState(() => {
    const d = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    return { month: d.getMonth(), year: d.getFullYear() };
  });

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = Array.from({ length: 100 - 18 + 1 }, (_, i) => today.getFullYear() - i - 18);

  const daysInMonth = new Date(calendarView.year, calendarView.month + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarView.year, calendarView.month, 1).getDay();

  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsCalendarOpen(false);
        if (isCalendarOpen) setTouched(prev => ({...prev, dob: true}));
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCalendarOpen]);

  const handleDayClick = (day) => {
    const dateStr = `${calendarView.year}-${String(calendarView.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setFormData(prev => ({ ...prev, dob: dateStr }));
    setIsCalendarOpen(false);
  };

  useEffect(() => {
    const result = registerSchema.safeParse(formData);
    setIsFormValid(result.success);

    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((err) => {
        const fieldName = err.path[0];
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = err.message;
        }
      });
      setLiveErrors(fieldErrors);
    } else {
      setLiveErrors({});
    }
  }, [formData]);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleBlur(event) {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      dob: true,
      password: true,
      confirmPassword: true,
    });

    if (!isFormValid) return;

    setSuccessMessage("");
    setApiResponse(null);
    setLoading(true);

    const finalResult = registerSchema.safeParse(formData);
    if (!finalResult.success) {
      setLoading(false);
      return;
    }

    try {
      const parsedData = finalResult.data;

      const payload = {
        firstName: parsedData.firstName,
        lastName: parsedData.lastName,
        email: parsedData.email,
        dob: parsedData.dob,
        password: parsedData.password,
        role: parsedData.role,
        website: formData.website
      };

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
         throw new Error(data.error || "Registration failed");
      }

      setApiResponse(data);
      setSuccessMessage("Account created successfully. You can sign in now.");
      showToast?.("Account created successfully.", "success");
    } catch (error) {
      console.error(error);
      setSuccessMessage("Something went wrong: " + error.message);
      showToast?.(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  const getInputClass = (fieldName) => {
    const base = "w-full px-4 py-3 rounded-xl border text-[13px] text-gray-900 border-gray-300 focus:outline-none transition-all ";
    if (!touched[fieldName] && !formData[fieldName]) return base + "focus:border-brand-primary";
    if (liveErrors[fieldName] && touched[fieldName]) return "w-full px-4 py-3 rounded-xl border text-[13px] text-gray-900 focus:outline-none transition-all border-red-500 bg-white ring-0";
    if (!liveErrors[fieldName] && touched[fieldName] && formData[fieldName]) return "w-full px-4 py-3 rounded-xl border text-[13px] text-gray-900 focus:outline-none transition-all border-green-500 bg-white ring-0";
    return base + "focus:border-brand-primary";
  };

  return (
    <div className="w-full flex-grow flex items-center justify-center p-4">
      <div className="w-full max-w-[800px] bg-white rounded-3xl p-8 flex flex-col relative mx-auto my-8 shadow-[0_4px_40px_rgb(0,0,0,0.06)]">
        <div className="w-max px-3.5 py-1.5 bg-[#f0f9f6] text-[#418a6e] text-[11px] font-bold rounded-full mb-6">
          Account onboarding
        </div>
        
        <h1 className="text-[28px] font-semibold leading-tight text-gray-900 mb-2">Register</h1>
        <p className="text-gray-500 mb-8 text-[13px]">Create your new Booking System account.</p>

        {successMessage && (
          <div role="alert" className={"mb-6 rounded-xl p-4 text-[13px] font-bold break-words " + (successMessage.startsWith("Something") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700")}>
            <p>{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <input className="hidden" tabIndex="-1" autoComplete="off" name="website" value={formData.website} onChange={handleInputChange} aria-hidden="true" />
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="relative">
              <label className="block text-[13px] font-bold text-gray-900 mb-1.5" htmlFor="name">
                First name
              </label>
              <input id="firstName" name="firstName" type="text" value={formData.firstName} onChange={handleInputChange} onBlur={handleBlur} className={getInputClass("firstName")} placeholder="John" aria-describedby="firstName-tip" />
              {liveErrors.firstName && touched.firstName && (
                <div className="absolute left-0 mt-1.5 z-10">
                  <div id="firstName-tip" role="tooltip" className="bg-red-50 border border-red-200 text-[#e10e49] text-xs rounded px-3 py-1 shadow-lg">
                    {liveErrors.firstName}
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative">
              <label className="block text-[13px] font-bold text-gray-900 mb-1.5" htmlFor="lastName">
                Last name
              </label>
              <input id="lastName" name="lastName" type="text" value={formData.lastName} onChange={handleInputChange} onBlur={handleBlur} className={getInputClass("lastName")} placeholder="Doe" aria-describedby="lastName-tip" />
              {liveErrors.lastName && touched.lastName && (
                <div className="absolute left-0 mt-1.5 z-10">
                  <div id="lastName-tip" role="tooltip" className="bg-red-50 border border-red-200 text-[#e10e49] text-xs rounded px-3 py-1 shadow-lg">
                    {liveErrors.lastName}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block text-[13px] font-bold text-gray-900 mb-1.5" htmlFor="email">
                Email address
              </label>
              <input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} onBlur={handleBlur} className={getInputClass("email")} placeholder="name@example.com" aria-describedby="email-tip" />
              {liveErrors.email && touched.email && (
                <div className="absolute left-0 mt-1.5 z-10">
                  <div id="email-tip" role="tooltip" className="bg-red-50 border border-red-200 text-[#e10e49] text-xs rounded px-3 py-1 shadow-lg">
                    {liveErrors.email}
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative" ref={calendarRef}>
              <label className="block text-[13px] font-bold text-gray-900 mb-1.5" htmlFor="dob">
                Date of birth
              </label>
              <div className={`${getInputClass("dob")} cursor-pointer flex justify-between items-center ${!formData.dob ? "text-gray-400" : ""}`} onClick={() => setIsCalendarOpen(!isCalendarOpen)}>
                <span>{formData.dob || "YYYY-MM-DD"}</span>
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              {isCalendarOpen && (
                <div className="absolute top-12 left-0 mt-2 bg-white border border-gray-200 rounded-2xl p-4 shadow-xl z-50 w-72">
                  <div className="flex justify-between mb-4 gap-2">
                    <select value={calendarView.month} onChange={(e) => setCalendarView(prev => ({...prev, month: parseInt(e.target.value)}))} className="p-1 border rounded text-sm w-full">
                      {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select value={calendarView.year} onChange={(e) => setCalendarView(prev => ({...prev, year: parseInt(e.target.value)}))} className="p-1 border rounded text-sm w-full">
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-500 mb-2">
                    <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({length: firstDayOfMonth}).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({length: daysInMonth}).map((_, i) => (
                      <button key={i+1} type="button" onClick={() => handleDayClick(i+1)} className="p-2 hover:bg-red-50 text-sm rounded-lg">{i+1}</button>
                    ))}
                  </div>
                </div>
              )}
              {liveErrors.dob && touched.dob && (
                <div className="absolute left-0 mt-1.5 z-10">
                  <div id="dob-tip" role="tooltip" className="bg-red-50 border border-red-200 text-[#e10e49] text-xs rounded px-3 py-1 shadow-lg">
                    {liveErrors.dob}
                  </div>
                </div>
              )}
            </div>

            <div className="relative rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <span className="block text-[13px] font-bold text-gray-900">Account type</span>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  ["reserver", "Reserver"],
                  ["manager", "Manager"],
                  ["administrator", "Admin"],
                ].map(([value, label]) => (
                  <label key={value} className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-sm font-bold transition-colors ${formData.role === value ? "border-[#e10e49] bg-red-50 text-[#e10e49]" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`}>
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={formData.role === value}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-gray-500">Demo mode: role selection is enabled for coursework testing.</p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="relative">
              <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Password</label>
              <div className="flex items-center gap-2">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={getInputClass("password")}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  aria-describedby="password-tip"
                />
                <button type="button" tabIndex={-1} aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(v => !v)} className="text-gray-500 hover:text-gray-900 px-2 py-1 rounded">
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.336-3.236.938-4.675M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.062-2.675A9.956 9.956 0 0022 9c0 5.523-4.477 10-10 10-.657 0-1.299-.063-1.925-.183" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm2.21 2.21A9.956 9.956 0 0022 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 1.657.336 3.236.938 4.675M4.22 4.22l15.56 15.56" /></svg>
                  )}
                </button>
              </div>
              {/* Password strength meter */}
              <div className="mt-2">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      passwordStrength <= 1 ? "bg-red-400 w-1/6" :
                      passwordStrength === 2 ? "bg-yellow-400 w-2/6" :
                      passwordStrength === 3 ? "bg-yellow-500 w-3/6" :
                      passwordStrength === 4 ? "bg-green-400 w-4/6" :
                      passwordStrength === 5 ? "bg-green-500 w-5/6" :
                      "bg-green-700 w-full"
                    }`}
                    style={{ width: `${(passwordStrength / 6) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs mt-1 font-bold text-gray-600">Strength: {passwordStrengthLabel}</div>
              </div>
              {/* Password rules */}
              <ul className="text-xs text-gray-500 mt-2 ml-1 space-y-1">
                <li>Password must be 8-64 chars</li>
                <li>At least 1 uppercase, 1 lowercase, 1 number, 1 special char</li>
                <li>No common passwords (e.g. "password", "12345678")</li>
              </ul>
              {liveErrors.password && touched.password && (
                <div className="absolute left-0 mt-1.5 z-10">
                  <div id="password-tip" role="tooltip" className="bg-red-50 border border-red-200 text-[#e10e49] text-xs rounded px-3 py-1 shadow-lg">
                    {liveErrors.password}
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <label className="block text-[13px] font-bold text-gray-900 mb-1.5">Confirm password</label>
              <div className="flex items-center gap-2">
                <input
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={getInputClass("confirmPassword")}
                  placeholder="Repeat the password"
                  autoComplete="new-password"
                  aria-describedby="confirmPassword-tip"
                />
                <button type="button" tabIndex={-1} aria-label={showConfirm ? "Hide password" : "Show password"} onClick={() => setShowConfirm(v => !v)} className="text-gray-500 hover:text-gray-900 px-2 py-1 rounded">
                  {showConfirm ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.336-3.236.938-4.675M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.062-2.675A9.956 9.956 0 0022 9c0 5.523-4.477 10-10 10-.657 0-1.299-.063-1.925-.183" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm2.21 2.21A9.956 9.956 0 0022 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 1.657.336 3.236.938 4.675M4.22 4.22l15.56 15.56" /></svg>
                  )}
                </button>
              </div>
              {liveErrors.confirmPassword && touched.confirmPassword && (
                <div className="absolute left-0 mt-1.5 z-10">
                  <div id="confirmPassword-tip" role="tooltip" className="bg-red-50 border border-red-200 text-[#e10e49] text-xs rounded px-3 py-1 shadow-lg">
                    {liveErrors.confirmPassword}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full mt-6 bg-[#e10e49] text-white py-3.5 rounded-2xl text-[14px] font-bold hover:bg-[#c00a3d] transition-colors disabled:opacity-50">
            {loading ? "Submitting..." : "Register Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
