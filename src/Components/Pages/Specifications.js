import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./Specifications.css";

function Specifications() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [krList, setKrList] = useState([]);
  const [projectAspects, setProjectAspects] = useState([
    {
      id: Date.now(),
      PA_kodas: "",
      pavadinimas: "",
      charakteristika: "",
      krValues: {},
    },
  ]);

  const [loadingKR, setLoadingKR] = useState(true);

  // === LOAD KR LIST ===
  useEffect(() => {
    fetch("http://localhost:5000/api/kr")
      .then((res) => res.json())
      .then((data) => {
        setKrList(data);
        setLoadingKR(false);
      })
      .catch(() => setLoadingKR(false));
  }, []);

  const addPA = () => {
    setProjectAspects((prev) => [
      ...prev,
      {
        id: Date.now(),
        PA_kodas: "",
        pavadinimas: "",
        charakteristika: "",
        krValues: {},
      },
    ]);
  };

  const removePA = (paId) => {
    setProjectAspects((prev) => prev.filter((pa) => pa.id !== paId));
  };

  const setPAField = (paId, field, value) => {
    setProjectAspects((prev) =>
      prev.map((pa) => (pa.id === paId ? { ...pa, [field]: value } : pa))
    );
  };

  const setKRValue = (paId, krId, gkrId) => {
    setProjectAspects((prev) =>
      prev.map((pa) =>
        pa.id === paId
          ? { ...pa, krValues: { ...pa.krValues, [krId]: gkrId } }
          : pa
      )
    );
  };

  const selectAllKR = (paId, valueLabel) => {
    setProjectAspects((prev) =>
      prev.map((pa) => {
        if (pa.id !== paId) return pa;

        const newKRValues = {};

        krList.forEach((kr) => {
          const match = kr.reiksmes.find(
            (r) => (r.Reiksme || "").toLowerCase() === valueLabel.toLowerCase()
          );

          if (match) {
            newKRValues[kr.id_KR] = match.id_GKR;
          }
        });

        return { ...pa, krValues: newKRValues };
      })
    );
  };

  const saveAll = async () => {
    for (const pa of projectAspects) {
      if (!pa.PA_kodas.trim()) {
        alert("Each PA must have a CODE!");
        return;
      }
      if (!pa.pavadinimas.trim()) {
        alert("Each PA must have a NAME!");
        return;
      }

      const paRes = await fetch("http://localhost:5000/api/pa/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PA_kodas: pa.PA_kodas,
          pavadinimas: pa.pavadinimas,
          charakteristika: pa.charakteristika,
          projektas_id: projectId,
        }),
      });

      const paData = await paRes.json();

      if (!paData.id_PA) {
        alert("Error while saving PA.");
        return;
      }

      const selectedKR = Object.values(pa.krValues).map((id_GKR) => ({
        id_GKR: Number(id_GKR),
      }));

      await fetch("http://localhost:5000/api/pa/kr/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paId: paData.id_PA,
          krValues: selectedKR,
        }),
      });
    }

    alert("Project aspects successfully saved!");
    navigate(`/recommendations/${projectId}`);
  };

  return (
    <div className="spec-page">
      <h1 className="spec-title">Project Specifications</h1>
      <div className="spec-sub">Project ID: {projectId}</div>

      {projectAspects.map((pa) => (
        <div className="spec-card" key={pa.id}>
          <div className="pa-header">
            <h3>USE CASE EVALUATION</h3>
          </div>

          <div className="pa-inputs">
            <div className="pa-field">
              <label>Use-case code</label>
              <input
                type="text"
                value={pa.PA_kodas}
                onChange={(e) => setPAField(pa.id, "PA_kodas", e.target.value)}
              />
            </div>

            <div className="pa-field">
              <label>Name</label>
              <input
                type="text"
                value={pa.pavadinimas}
                onChange={(e) =>
                  setPAField(pa.id, "pavadinimas", e.target.value)
                }
              />
            </div>

            <div className="pa-field description">
              <label>Description</label>
              <input
                type="text"
                value={pa.charakteristika}
                onChange={(e) =>
                  setPAField(pa.id, "charakteristika", e.target.value)
                }
              />
            </div>
          </div>

          <h4>Criteria to evaluate</h4>

          {loadingKR ? (
            <p>Loading criteria...</p>
          ) : krList.length === 0 ? (
            <p className="empty-kr">No Evaluation Criteria found.</p>
          ) : (
            <div className="kr-table">
              <div className="kr-column-header">
                <div className="kr-question-spacer" />

                <div className="kr-column">
                  <button
                    type="button"
                    className="bulk-btn yes"
                    onClick={() => selectAllKR(pa.id, "Yes")}
                    title="Set ALL criteria to YES"
                  >
                    Select all Yes
                  </button>
                </div>

                <div className="kr-column">
                  <button
                    type="button"
                    className="bulk-btn no"
                    onClick={() => selectAllKR(pa.id, "No")}
                    title="Set ALL criteria to NO"
                  >
                    Select all No
                  </button>
                </div>

                <div className="kr-column">
                  <button
                    type="button"
                    className="bulk-btn maybe"
                    onClick={() => selectAllKR(pa.id, "Maybe")}
                    title="Set ALL criteria to MAYBE"
                  >
                    Select all Maybe
                  </button>
                </div>
              </div>

              {krList.map((kr) => (
                <div className="kr-row" key={kr.id_KR}>
                  <div className="kr-question">
                    {kr.Klausimas}

                    <span className="tooltip">
                      <span
                        className="info-icon"
                        tabIndex={0}
                        aria-label="More info"
                        aria-describedby={`tip-${pa.id}-${kr.id_KR}`}
                      >
                        ⓘ
                      </span>

                      <span
                        className="tooltip-text"
                        id={`tip-${pa.id}-${kr.id_KR}`}
                        role="tooltip"
                      >
                        {kr.Paaiskinimas && kr.Paaiskinimas.trim() !== ""
                          ? kr.Paaiskinimas
                          : "No description available."}
                      </span>
                    </span>
                  </div>

                  <div className="kr-options kr-columns">
                    {kr.reiksmes.map((val) => (
                      <div className="kr-column" key={val.id_GKR}>
                        <label className="kr-radio">
                          <input
                            type="radio"
                            name={`pa-${pa.id}-kr-${kr.id_KR}`}
                            onChange={() =>
                              setKRValue(pa.id, kr.id_KR, val.id_GKR)
                            }
                            checked={pa.krValues[kr.id_KR] === val.id_GKR}
                          />
                          {val.Reiksme}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card-footer">
            <button className="remove-pa-btn" onClick={() => removePA(pa.id)}>
                Remove
              </button>
            <button className="add-pa-btn" onClick={addPA}>
              + Add another use-case
            </button>
          </div>
        </div>
      ))}

      <div className="bottom-actions">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <button className="spec-save-btn" onClick={saveAll}>
          Next →
        </button>
      </div>
    </div>
  );
}

export default Specifications;
