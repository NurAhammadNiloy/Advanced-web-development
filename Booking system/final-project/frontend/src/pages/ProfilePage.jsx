import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

const profileSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),
  dob: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters").regex(/[A-Z]/, "Add one uppercase letter").regex(/[0-9]/, "Add one number"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

function ProfilePage({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState({ firstName: "", lastName: "", email: "", dob: "", role: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/profile", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token") || ""}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load profile");
      const nextProfile = {
        firstName: data.data.first_name || "",
        lastName: data.data.last_name || "",
        email: data.data.email || "",
        dob: data.data.dob ? String(data.data.dob).split("T")[0] : "",
        role: data.data.role || "",
      };
      setProfile(nextProfile);
      localStorage.setItem("user_firstName", nextProfile.firstName);
      localStorage.setItem("user_lastName", nextProfile.lastName);
      localStorage.setItem("user_email", nextProfile.email);
      if (nextProfile.dob) localStorage.setItem("user_dob", nextProfile.dob);
      setError("");
    } catch (err) {
      setError(err.message);
      showToast?.(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleProfileChange = (event) => {
    const next = { ...profile, [event.target.name]: event.target.value };
    setProfile(next);
    const result = profileSchema.safeParse(next);
    if (!result.success) {
      const errors = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path[0]] = issue.message;
      });
      setFieldErrors(errors);
    } else {
      setFieldErrors({});
    }
  };

  async function handleSave(event) {
    event.preventDefault();
    const result = profileSchema.safeParse(profile);
    if (!result.success) {
      const errors = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path[0]] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(profile),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update profile");
      setEditMode(false);
      showToast?.("Profile updated.", "success");
      await loadProfile();
    } catch (err) {
      showToast?.(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    const result = passwordSchema.safeParse(passwords);
    if (!result.success) {
      const errors = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path[0]] = issue.message;
      });
      setPasswordErrors(errors);
      return;
    }

    if (!window.confirm("Change your password now?")) return;
    setSaving(true);
    try {
      const response = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not change password");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordErrors({});
      showToast?.("Password changed.", "success");
    } catch (err) {
      showToast?.(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow animate-pulse">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="mt-6 h-12 rounded bg-gray-100" />
        <div className="mt-4 h-12 rounded bg-gray-100" />
        <div className="mt-4 h-12 rounded bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-[0_4px_40px_rgb(0,0,0,0.06)]">
      <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
      {error && <div role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">{error}</div>}
      <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
        Role: <strong className="capitalize">{profile.role || "reserver"}</strong> · Account: <strong>active</strong>
      </div>

      <form onSubmit={handleSave} className="mt-8 space-y-4" noValidate>
        {["firstName", "lastName"].map((name) => (
          <div key={name}>
            <label className="block font-bold mb-1" htmlFor={name}>{name === "firstName" ? "First Name" : "Last Name"}</label>
            <input id={name} name={name} value={profile[name]} onChange={handleProfileChange} disabled={!editMode} className="w-full rounded-2xl border border-gray-200 px-4 py-3 disabled:bg-gray-100" />
            {fieldErrors[name] && <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors[name]}</p>}
          </div>
        ))}
        <div>
          <label className="block font-bold mb-1" htmlFor="email">Email</label>
          <input id="email" value={profile.email} disabled className="w-full rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3" />
        </div>
        <div>
          <label className="block font-bold mb-1" htmlFor="dob">Date of Birth</label>
          <input id="dob" name="dob" type="date" value={profile.dob} onChange={handleProfileChange} disabled={!editMode} className="w-full rounded-2xl border border-gray-200 px-4 py-3 disabled:bg-gray-100" />
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          {editMode ? (
            <>
              <button disabled={saving} type="submit" className="rounded-2xl bg-[#418a6e] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
              <button type="button" className="rounded-2xl border border-gray-200 px-6 py-3 text-sm font-bold" onClick={() => { setEditMode(false); loadProfile(); }}>Cancel</button>
            </>
          ) : (
            <button type="button" className="rounded-2xl bg-[#e10e49] px-6 py-3 text-sm font-bold text-white" onClick={() => setEditMode(true)}>Edit Profile</button>
          )}
        </div>
      </form>

      <hr className="my-8" />

      <form onSubmit={handlePasswordChange} className="space-y-4" noValidate>
        <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
        {[
          ["currentPassword", "Current Password"],
          ["newPassword", "New Password"],
          ["confirmPassword", "Confirm New Password"],
        ].map(([name, label]) => (
          <div key={name}>
            <label className="block font-bold mb-1" htmlFor={name}>{label}</label>
            <input id={name} name={name} type="password" value={passwords[name]} onChange={(event) => setPasswords({ ...passwords, [name]: event.target.value })} className="w-full rounded-2xl border border-gray-200 px-4 py-3" />
            {passwordErrors[name] && <p className="mt-1 text-xs font-semibold text-red-600">{passwordErrors[name]}</p>}
          </div>
        ))}
        <p className="text-xs text-gray-500">Use at least 8 characters with an uppercase letter and a number.</p>
        <button disabled={saving} type="submit" className="rounded-2xl bg-[#418a6e] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
          {saving ? "Changing..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}

export default ProfilePage;
