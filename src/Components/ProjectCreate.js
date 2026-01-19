import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ProjectCreate.css";

function ProjectCreate() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const DRAFT_KEY = "reqfa_project_create_draft";

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    level: "",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);

      setFormData((prev) => ({ ...prev, ...saved }));
    } catch (e) {
      console.warn("Draft load failed:", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    } catch (e) {
      console.warn("Draft save failed:", e);
    }
  }, [formData]);


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setFormData({ ...formData, level: checked ? value : "" });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("Please enter the project title.");
      return;
    }
    if (!formData.description.trim()) {
      alert("Please enter the project description.");
      return;
    }
    if (!formData.date) {
      alert("Please select a date.");
      return;
    }
    if (!formData.level) {
      alert("Please choose the accessibility level.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/projektai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pavadinimas: formData.title,
          aprasymas: formData.description,
          sukurimo_data: formData.date,
          atitikties_lygis: formData.level,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Server error:", data);
        alert("⚠️ Error creating project.");
        return;
      }

      const projectId = data.projectId;

      localStorage.removeItem(DRAFT_KEY);

      if (!projectId) {
        alert("⚠️ Server did not return project ID!");
        return;
      }

      navigate(`/specifications/${projectId}`);
    } catch (err) {
      console.error("Connection error:", err);
      alert("⚠️ Could not connect to server.");
    }
  };

  return (
    <div className="create-project">
      <h2 className="project-title">Create new project</h2>

      <form className="project-form" onSubmit={handleSubmit}>
        <label>Title of the project</label>
        <input
          type="text"
          name="title"
          placeholder="Title"
          value={formData.title}
          onChange={handleChange}
        />

        <label>Description of the project</label>
        <textarea
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleChange}
        ></textarea>

        <label>Select project creation date</label>

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
            <span className="date-icon" aria-hidden="true">📅</span>
          </button>
        </div>

        <label>Choose accessibility conformance level</label>

        <div className="checkbox-group spacing-bottom">
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
        
        <button type="submit" className="btn-next">
          NEXT
        </button>
      </form>
    </div>
  );
}

export default ProjectCreate;
