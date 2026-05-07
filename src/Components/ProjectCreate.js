import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./ProjectCreate.css";

function ProjectCreate() {
  const navigate = useNavigate();

  const API_BASE = "https://prototype-backend-production-e92e.up.railway.app";

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const DRAFT_KEY = "reqfa_project_create_draft";

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    level: "",
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) {
        setFormData((prev) => ({ ...prev, date: prev.date || today }));
        return;
      }

      const saved = JSON.parse(raw);

      setFormData((prev) => ({
        ...prev,
        ...saved,
        date: saved?.date || prev.date || today,
      }));
    } catch (e) {
      console.warn("Draft load failed:", e);
      setFormData((prev) => ({ ...prev, date: prev.date || today }));
    }
  }, [today]);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    } catch (e) {
      console.warn("Draft save failed:", e);
    }
  }, [formData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox" && name === "level") {
      setFormData((prev) => ({
        ...prev,
        level: checked ? value : "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Please enter the project title.";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Please enter the project description.";
    }

    if (!formData.date) {
      newErrors.date = "Please select a date.";
    }

    if (!formData.level) {
      newErrors.level = "Please choose the accessibility level.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const safeReadResponse = async (res) => {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();
    const text = await res.text().catch(() => "");
    return { raw: text };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/projektai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pavadinimas: formData.title.trim(),
          aprasymas: formData.description.trim(),
          sukurimo_data: formData.date,
          atitikties_lygis: formData.level,
        }),
      });

      const data = await safeReadResponse(res);

      if (!res.ok) {
        alert(`⚠️ Error creating project (${res.status}). Check server logs.`);
        return;
      }

      const projectId = data?.projectId;

      localStorage.removeItem(DRAFT_KEY);

      if (!projectId) {
        alert("⚠️ Server did not return project ID!");
        return;
      }

      navigate(`/specifications/${projectId}`);
    } catch (err) {
      console.error("Connection error:", err);
      alert("⚠️ Could not connect to server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-project">
      <h2 className="project-title">Create new project</h2>

      <form className="project-form" onSubmit={handleSubmit}>
        <label>Title of the project*</label>
        <input
          type="text"
          name="title"
          placeholder="Title"
          value={formData.title}
          onChange={handleChange}
          autoComplete="off"
          className={errors.title ? "input-error" : ""}
        />
        {errors.title && (
          <div className="field-error">
            {errors.title}
          </div>
        )}

        <label>Description of the project*</label>
        <textarea
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleChange}
          rows={5}
          className={errors.description ? "input-error" : ""}
        />
        {errors.description && (
          <div className="field-error">
            {errors.description}
          </div>
        )}

        <label>Select project creation date*</label>

        <div className="date-field">
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="date-input"
            max={today}
            inputMode="none"
            onKeyDown={(e) => e.preventDefault()}
          />
          <button
            type="button"
            className="date-btn"
            aria-label="Open date picker"
            onClick={(e) => {
              const input = e.currentTarget
                .closest(".date-field")
                ?.querySelector('input[type="date"]');
              if (!input) return;

              if (typeof input.showPicker === "function") input.showPicker();
              else input.focus();
            }}
          >
            <span className="date-icon" aria-hidden="true">
              📅
            </span>
          </button>
        </div>
        {errors.date && (
          <div className="field-error">
            {errors.date}
          </div>
        )}

        <label>Choose accessibility conformance level*</label>

          <div
            className={`checkbox-group spacing-bottom ${
              errors.level ? "checkbox-error" : ""
            }`}
          >
          <label className="level-row">
            <input
              type="checkbox"
              name="level"
              value="A"
              checked={formData.level === "A"}
              onChange={handleChange}
              className="level-checkbox"
            />
            <span className="custom-checkbox" />
            <span className="level-code">A</span>
            <span className="level-text">Minimum accessibility</span>
          </label>

          <label className="level-row">
            <input
              type="checkbox"
              name="level"
              value="AA"
              checked={formData.level === "AA"}
              onChange={handleChange}
              className="level-checkbox"
            />
            <span className="custom-checkbox" />
            <span className="level-code">AA</span>
            <span className="level-text">High accessibility</span>
          </label>

          <label className="level-row">
            <input
              type="checkbox"
              name="level"
              value="AAA"
              checked={formData.level === "AAA"}
              onChange={handleChange}
              className="level-checkbox"
            />
            <span className="custom-checkbox" />
            <span className="level-code">AAA</span>
            <span className="level-text">Full accessibility</span>
          </label>
        </div>
        {errors.level && (
          <div className="field-error">
            {errors.level}
          </div>
        )}

        <button type="submit" className="btn-next" disabled={submitting}>
          {submitting ? "CREATING..." : "NEXT"}
        </button>
      </form>
    </div>
  );
}

export default ProjectCreate;