import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./MyProjects.css";

function MyProjects() {
  const [projects, setProjects] = useState([]);
  const [banner, setBanner] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetch("https://prototype-backend-production-e92e.up.railway.app/api/myprojects")
      .then((res) => res.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Klaida gaunant projektus:", err));
  }, []);

  useEffect(() => {
    const b = location.state?.banner;
    if (!b) return;

    setBanner(b);

    navigate(location.pathname, { replace: true, state: {} });

    const t = setTimeout(() => setBanner(null), 3000);
    return () => clearTimeout(t);
  }, [location.state, location.pathname, navigate]);

  const openProject = (id) => {
    navigate(`/requirements/${id}`);
  };

  return (
    <div className="myp-wrapper">
      <h2 className="myp-title">My Projects</h2>
      {banner && (
        <div className={`myp-banner myp-banner--${banner.type}`} role="status">
          <span>{banner.message}</span>
          <button
            type="button"
            className="myp-banner-x"
            onClick={() => setBanner(null)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}

      {projects.length === 0 ? (
        <p className="myp-empty">No projects found.</p>
      ) : (
        <div className="myp-grid">
          {projects.map((p) => (
            <div key={p.id_Projektas} className="myp-card">
              <h2 className="myp-name">{p.Pavadinimas}</h2>

              <p className="myp-desc">
                {p.Aprasymas || "No description provided."}
              </p>

              <p className="myp-date">
                <span>Created:</span>{" "}
                {p.Sukurimo_data
                  ? new Date(p.Sukurimo_data).toLocaleDateString()
                  : "-"}
              </p>

              <p className="myp-level">
                Accessibility level: <strong>{p.Atitikties_lygis}</strong>
              </p>

              <div className="button-container">
                <button
                  className="myp-btn"
                  type="button"
                  onClick={() => openProject(p.id_Projektas)}
                >
                  Open project
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyProjects;