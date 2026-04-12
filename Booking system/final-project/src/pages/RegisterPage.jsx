import { useState, useEffect, useRef } from "react";
import { z } from "zod";

// --- Schema Definitions ---
const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(50, "Full name cannot exceed 50 characters")
      .regex(/^[A-Za-z]+(?: [A-Za-z]+)*$/, "Full name must contain only letters and single spaces"),
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
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    dob: "",
    password: "",
    confirmPassword: "",
  });

  const [touched, setTouched] = useState({});
  const [liveErrors, setLiveErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [apiResponse, setApiResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

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
    setTouched(prev => ({ ...prev, dob: true })); 
  };

  // --- Live Validation ---
  useEffect(() => {
    const result = registerSchema.safeParse(formData);
    setIsFormValid(result.success);

    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0];
        // Keep the first error for each field
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      });
      setLiveErrors(fieldErrors);
    } else {
      setLiveErrors({});
    }
  }, [formData]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleBlur(event) {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Mark all fields touched on attempt to submit
    setTouched({
      name: true,
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
      const response = await fetch("https://httpbin.org/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalResult.data),
      });

      const data = await response.json();
      setApiResponse(data);
      setSuccessMessage("Form submitted and sent to server successfully! 🎉");
    } catch (error) {
      console.error(error);
      setSuccessMessage("Something went wrong while sending data ❌");
    } finally {
      setLoading(false);
    }
  }

  // --- Dynamic Class Helper ---
  const getInputClass = (fieldName) => {
    const base = "w-full px-4 py-3 rounded-xl border text-[13px] text-gray-900 border-gray-300 focus:outline-none transition-all ";
    
    // Not touched yet -> default styling
    if (!touched[fieldName] && !formData[fieldName]) {
      return base + "focus:border-brand-primary";
    }

    // Touched & has error -> Red styling
    if (liveErrors[fieldName]) {
      return "w-full px-4 py-3 rounded-xl border text-[13px] text-gray-900 focus:outline-none transition-all border-red-500 bg-white ring-0";
    }

    // Touched & valid -> Green styling
    return "w-full px-4 py-3 rounded-xl border text-[13px] text-gray-900 focus:outline-none transition-all border-[#4ade80] bg-white ring-0"; 
  };

  return (
    <div className="w-full flex-grow flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] bg-white rounded-3xl p-10 shadow-[0_4px_40px_rgb(0,0,0,0.06)] flex flex-col relative mx-auto my-8">
        
        <div className="w-max px-3.5 py-1.5 bg-[#f0f9f6] text-[#418a6e] text-[11px] font-bold rounded-full mb-6">
          New Account
        </div>

        <h1 className="text-[28px] font-semibold leading-tight text-gray-900 mb-2">Register</h1>
        <p className="text-gray-500 mb-8 text-[13px]">Create an account to start booking resources securely.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Full Name */}
          <div>
            <label htmlFor="name" className="block text-[13px] font-bold text-gray-900 mb-1.5">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              className={getInputClass("name")}
              placeholder="John Doe"
            />
            {touched.name && liveErrors.name ? (
              <p className="text-red-500 font-medium text-xs mt-1.5">{liveErrors.name}</p>
            ) : (
              <p className="text-gray-400 text-[10px] mt-1.5">Letters and spaces only (2-50 chars)</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-[13px] font-bold text-gray-900 mb-1.5">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              className={getInputClass("email") + " " + (!liveErrors.email && formData.email && touched.email ? 'bg-[#f4fafe]' : '')}
              placeholder="john@example.com"
            />
            {touched.email && liveErrors.email ? (
              <p className="text-red-500 font-medium text-xs mt-1.5">{liveErrors.email}</p>
            ) : (
              <p className="text-gray-400 text-[10px] mt-1.5">e.g. user@example.com</p>
            )}
          </div>

          {/* Date of Birth (Custom Calendar) */}
          <div className="relative" ref={calendarRef}>
            <label htmlFor="dob" className="block text-[13px] font-bold text-gray-900 mb-1.5">Date of Birth</label>
            <div 
              className={getInputClass("dob") + " cursor-pointer flex justify-between items-center bg-white " + (formData.dob ? "text-gray-900" : "text-gray-400")}
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            >
              <span className="text-[13px]">{formData.dob || "Select your birth date"}</span>
              <svg className={`w-5 h-5 transition-colors pointer-events-none ${(isCalendarOpen) ? 'text-[#e10e49]' : (formData.dob ? 'text-[#4ade80]' : 'text-gray-400')}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            {isCalendarOpen && (
              <div className="absolute top-[85px] left-0 w-full bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 p-5 z-50">
                <div className="flex justify-between items-center mb-4 gap-3">
                  <select 
                    className="px-3 py-2 w-1/2 rounded-xl bg-gray-50 border border-gray-200 text-[13px] font-semibold text-gray-800 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary cursor-pointer text-center"
                    value={calendarView.month}
                    onChange={(e) => setCalendarView(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                  >
                    {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                  <select 
                    className="px-3 py-2 w-1/2 rounded-xl bg-gray-50 border border-gray-200 text-[13px] font-semibold text-gray-800 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary cursor-pointer text-center"
                    value={calendarView.year}
                    onChange={(e) => setCalendarView(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-center text-[10px] font-bold text-gray-400 py-1 uppercase tracking-wider">{day}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${calendarView.year}-${String(calendarView.month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const isSelected = formData.dob === dateStr;
                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => handleDayClick(dayNum)}
                        className={`h-9 w-full rounded-full flex items-center justify-center text-[12px] font-medium transition-all ${
                          isSelected 
                            ? 'bg-[#e10e49] text-white shadow-[0_2px_10px_rgba(225,14,73,0.3)]' 
                            : 'text-gray-700 hover:bg-gray-100 hover:text-[#e10e49]'
                        }`}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {touched.dob && liveErrors.dob ? (
              <p className="text-red-500 font-medium text-xs mt-1.5">{liveErrors.dob}</p>
            ) : (
               <p className="text-gray-400 text-[10px] mt-1.5">Must be 18 to 100 years old</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-[13px] font-bold text-gray-900 mb-1.5">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={(e) => {
                handleBlur(e);
                setIsPasswordFocused(false);
              }}
              className={getInputClass("password")}
              placeholder="Enter your password"
            />
            
            {isPasswordFocused && (
              <div className="mt-3 flex flex-col gap-2">
                {[
                  { label: "At least 8 characters", valid: formData.password.length >= 8 },
                  { label: "One uppercase letter", valid: /[A-Z]/.test(formData.password) },
                  { label: "One lowercase letter", valid: /[a-z]/.test(formData.password) },
                  { label: "One number", valid: /[0-9]/.test(formData.password) },
                  { label: "One special character", valid: /[^A-Za-z0-9]/.test(formData.password) },
                ].map((rule, idx) => (
                  <div key={idx} className={`flex items-center gap-2 ${rule.valid ? 'text-[#482885] font-medium' : 'text-gray-400'}`}>
                    {rule.valid ? (
                      <svg className="w-4 h-4 text-[#4ade80] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                    <span className="text-[11px] font-medium">{rule.label}</span>
                  </div>
                ))}
              </div>
            )}

            {touched.password && liveErrors.password && 
              !["Password must be at least 8 characters long", "Password must contain at least one uppercase letter", "Password must contain at least one lowercase letter", "Password must contain at least one number", "Password must contain at least one special character"].includes(liveErrors.password) && (
              <p className="text-red-500 font-medium text-xs mt-2">{liveErrors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="pt-2">
            <label htmlFor="confirmPassword" className="block text-[13px] font-bold text-gray-900 mb-1.5">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              onFocus={() => setIsConfirmPasswordFocused(true)}
              onBlur={(e) => {
                handleBlur(e);
                setIsConfirmPasswordFocused(false);
              }}
              className={getInputClass("confirmPassword")}
              placeholder="Confirm your password"
            />
            {isConfirmPasswordFocused && (
             <div className={`mt-2 flex items-center gap-2 ${(!liveErrors.confirmPassword && formData.confirmPassword.length > 0) ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                {(!liveErrors.confirmPassword && formData.confirmPassword.length > 0) ? (
                  <svg className="w-4 h-4 text-[#4ade80] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                )}
                <span className="text-[11px] font-medium">Passwords match</span>
              </div>
            )}
            {touched.confirmPassword && liveErrors.confirmPassword && (
              <p className="text-red-500 font-medium text-xs mt-1.5">{liveErrors.confirmPassword}</p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={!isFormValid || loading}
            className="w-full mt-4 rounded-xl bg-[#e10e49] px-6 py-3 text-[14px] font-semibold text-white hover:bg-[#c30c40] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Create Account'}
          </button>
        </form>

        {successMessage && (
          <div className={`mt-6 rounded-lg px-4 py-3.5 text-[12px] font-semibold text-center border ${successMessage.includes('❌') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-[#effdf4] text-[#166534] border-[#dcfce7]'}`}>
            {successMessage}
          </div>
        )}

        {apiResponse && (
          <div className="mt-8 pt-8 border-t border-gray-100">
            <h2 className="text-sm font-semibold mb-3 text-brand-dark">Server Echo (Debug)</h2>
            <div className="bg-gray-900 rounded-xl p-6 overflow-x-auto text-[11px] font-mono text-gray-300">
              <pre>
                {JSON.stringify(apiResponse.json, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RegisterPage;