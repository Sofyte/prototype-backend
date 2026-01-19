import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MyProjects.css";

function MyProjects() {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/api/myprojects")
      .then((res) => res.json())
      .then((data) => {
        console.log("Gauti projektai:", data);
        setProjects(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Klaida gaunant projektus:", err));
  }, []);

  const openProject = (id) => {
    console.log("NAVIGATE TO:", `/requirements/${id}`); // svarbu debug
    navigate(`/requirements/${id}`);
  };

  return (
    <div className="myp-wrapper">
      <h2 className="myp-title">My Projects</h2>

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
