import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import "./Requirements.css";

function Requirements() {
  const { projectId } = useParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("");
  const [projectLevel, setProjectLevel] = useState("-");
  const [bulkKey, setBulkKey] = useState(null);

  // ✅ collapse per PA: key = paId => true/false
  const [collapsedPA, setCollapsedPA] = useState({});

  const togglePA = (paId) => {
    setCollapsedPA((prev) => ({ ...prev, [paId]: !prev[paId] }));
  };

  const isPACollapsed = (paId) => !!collapsedPA[paId];

  // edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({
    busena: "To review",
    tenkinimo_kriterijus: "",
    prioritetas: "",
    patikslinta_formuluote: "",
    atmetimo_priezastis: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchAll = useCallback(() => {
    setLoading(true);

    Promise.all([
      fetch(`http://localhost:5000/api/project/${projectId}`).then((r) => r.json()),
      fetch(`http://localhost:5000/api/requirements/${projectId}`).then((r) => r.json()),
    ])
      .then(([project, requirements]) => {
        const lvl = project?.Atitikties_lygis
          ? String(project.Atitikties_lygis).trim().toUpperCase()
          : "-";

        const name = project?.Pavadinimas ? String(project.Pavadinimas).trim() : "";

        setProjectLevel(lvl);
        setProjectName(name);
        setRows(Array.isArray(requirements) ? requirements : []);
      })
      .catch((e) => {
        console.error("Requirements fetch error:", e);
        setProjectLevel("-");
        setProjectName("");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Grupavimas pagal PA (use case)
  const grouped = useMemo(() => {
    const map = new Map();

    rows.forEach((r) => {
      const paId = r.fk_id_PA ?? "unknown";
      if (!map.has(paId)) {
        map.set(paId, {
          fk_id_PA: r.fk_id_PA,
          PA_kodas: r.PA_kodas,
          PA_pavadinimas: r.PA_pavadinimas,
          items: [],
        });
      }
      map.get(paId).items.push(r);
    });

    return Array.from(map.values());
  }, [rows]);

  const getWcagCodeFromText = (text) => {
    const first = String(text || "").trim().split(/\s+/)[0] || "";
    const m = first.match(/^(\d+(?:\.\d+){1,3})(?:\.)?$/);
    return m ? m[1] : "";
  };

  const wcagCodeToParts = (code) => code.split(".").map((n) => Number(n));

  const sortByWcagCode = (list, getText) => {
    return (Array.isArray(list) ? list : [])
      .map((item, idx) => ({ item, idx }))
      .sort((a, b) => {
        const aCode = getWcagCodeFromText(getText(a.item));
        const bCode = getWcagCodeFromText(getText(b.item));

        if (!aCode && !bCode) return a.idx - b.idx;
        if (!aCode) return 1;
        if (!bCode) return -1;

        const ap = wcagCodeToParts(aCode);
        const bp = wcagCodeToParts(bCode);

        const maxLen = Math.max(ap.length, bp.length);
        for (let i = 0; i < maxLen; i++) {
          const av = Number.isFinite(ap[i]) ? ap[i] : -1;
          const bv = Number.isFinite(bp[i]) ? bp[i] : -1;
          if (av !== bv) return av - bv;
        }

        return a.idx - b.idx;
      })
      .map((x) => x.item);
  };

  /* ===============================
     EDIT
  =============================== */
  const openEdit = (row) => {
    setEditRow(row);

    setEditForm({
      busena: row.Busena || "To review",
      tenkinimo_kriterijus: row.Tenkinimo_kriterijus || "",
      prioritetas: row.Prioritetas ?? "1",
      patikslinta_formuluote: row.Patikslinta_formuluote || "",
      atmetimo_priezastis: row.AtmEtimo_priezastis || "",
    });

    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditRow(null);
    setEditForm({
      busena: "To review",
      tenkinimo_kriterijus: "",
      prioritetas: "1",
      patikslinta_formuluote: "",
      atmetimo_priezastis: "",
    });
  };

  const saveEdit = async () => {
    if (!editRow) return;

    // paprastos validacijos (kaip pas tave)
    if (!String(editForm.tenkinimo_kriterijus || "").trim()) {
      alert("Tenkinimo kriterijus is required.");
      return;
    }
    if (String(editForm.prioritetas ?? "").toString().trim() === "") {
      alert("Prioritetas is required.");
      return;
    }
    if (!String(editForm.patikslinta_formuluote || "").trim()) {
      alert("Patikslinta formuluote is required.");
      return;
    }

    setSavingEdit(true);

    const payload = {
      reikalavimasId: editRow.fk_id_Reikalavimas || editRow.id_Reikalavimas, // saugiai
      paId: editRow.fk_id_PA,
      busena: editForm.busena,
      tenkinimo_kriterijus: editForm.tenkinimo_kriterijus,
      prioritetas: editForm.prioritetas,
      patikslinta_formuluote: editForm.patikslinta_formuluote,
      atmetimo_priezastis:
        editForm.busena === "Cancelled" ? editForm.atmetimo_priezastis : null,
    };

    try {
      const res = await fetch("http://localhost:5000/api/pa-reikalavimas/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json")
        ? await res.json()
        : { raw: await res.text() };

      if (!res.ok || !data?.success) {
        console.error("Edit save failed:", res.status, data);
        alert(`Edit save failed (${res.status}). Check server logs.`);
        return;
      }

      closeEdit();
      fetchAll();
    } catch (e) {
      console.error("Edit save error:", e);
      alert("Edit save error. Check server logs.");
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmAllForPA = async (g) => {
    const paId = g?.fk_id_PA ?? "unknown";
    if (paId === "unknown") return;

    const items = Array.isArray(g.items) ? g.items : [];
    if (items.length === 0) return alert("Nothing to confirm for this use case.");

    const toUpdate = items.filter((r) => String(r.Busena || "").trim() !== "Reviewed");

    if (toUpdate.length === 0) {
      alert("Nothing to confirm — everything is already reviewed for this use case.");
      return;
    }

    const ok = window.confirm(
      `Confirm (mark as Reviewed) ${toUpdate.length} requirements for this use case?`
    );
    if (!ok) return;

    setBulkKey(`CONFIRM:${paId}`);

    try {
      await Promise.all(
        toUpdate.map((r) =>
          fetch("http://localhost:5000/api/pa-reikalavimas/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reikalavimasId: r.fk_id_Reikalavimas ?? r.id_Reikalavimas,
              paId: r.fk_id_PA,
              busena: "Reviewed",

              tenkinimo_kriterijus: r.Tenkinimo_kriterijus || "",
              prioritetas: String(r.Prioritetas ?? "3"),
              patikslinta_formuluote: r.Patikslinta_formuluote || "",

              atmetimo_priezastis: null,
            }),
          }).then(async (res) => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success)
              throw new Error(
                `Failed to confirm reqId=${r.fk_id_Reikalavimas ?? r.id_Reikalavimas}`
              );
          })
        )
      );

      fetchAll();
    } catch (e) {
      console.error("Confirm all (PA) error:", e);
      alert("Confirm all failed. Check server logs.");
    } finally {
      setBulkKey(null);
    }
  };

  const declineAllForPA = async (g) => {
    const paId = g?.fk_id_PA ?? "unknown";
    if (paId === "unknown") return;

    const items = Array.isArray(g.items) ? g.items : [];
    if (items.length === 0) return alert("Nothing to decline for this use case.");

    const toUpdate = items.filter((r) => String(r.Busena || "").trim() !== "Cancelled");

    if (toUpdate.length === 0) {
      alert("Nothing to decline — everything is already cancelled for this use case.");
      return;
    }

    const ok = window.confirm(
      `Decline (mark as Cancelled) ${toUpdate.length} requirements for this use case?`
    );
    if (!ok) return;

    setBulkKey(`DECLINE:${paId}`);

    try {
      await Promise.all(
        toUpdate.map((r) =>
          fetch("http://localhost:5000/api/pa-reikalavimas/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reikalavimasId: r.fk_id_Reikalavimas ?? r.id_Reikalavimas,
              paId: r.fk_id_PA,
              busena: "Cancelled",

              tenkinimo_kriterijus: r.Tenkinimo_kriterijus || "",
              prioritetas: String(r.Prioritetas ?? "3"),
              patikslinta_formuluote: r.Patikslinta_formuluote || "",

              atmetimo_priezastis: r.AtmEtimo_priezastis || "Cancelled in bulk",
            }),
          }).then(async (res) => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success)
              throw new Error(
                `Failed to decline reqId=${r.fk_id_Reikalavimas ?? r.id_Reikalavimas}`
              );
          })
        )
      );

      fetchAll();
    } catch (e) {
      console.error("Decline all (PA) error:", e);
      alert("Decline all failed. Check server logs.");
    } finally {
      setBulkKey(null);
    }
  };

  return (
    <div className="req-wrapper">
      <div className="req-header">
        <div>
          <h1 className="req-title">Project Requirements</h1>
          <h3>Project name: {projectName}</h3>
          <h3>Project ID: {projectId}</h3>
          <h4>Conformance level: {projectLevel}</h4>
        </div>

        <Link className="req-back" to="/myprojects">
          Back to My Projects
        </Link>
      </div>

      {loading ? (
        <p>Loading requirements...</p>
      ) : rows.length === 0 ? (
        <p>No requirements found for this project yet.</p>
      ) : (
        grouped.map((g) => {
          const paId = g?.fk_id_PA ?? "unknown";

          return (
            <section
              key={paId ?? g.PA_kodas ?? `pa-${Math.random()}`}
              className="req-section"
            >
              {/* ✅ COLLAPSIBLE HEADER */}
              <div
                className="pa-collapse-header"
                role="button"
                tabIndex={0}
                onClick={() => togglePA(paId)}
                onKeyDown={(e) => e.key === "Enter" && togglePA(paId)}
              >
                <div className="pa-collapse-title">
                  Use case: {g.PA_kodas ? `${g.PA_kodas} – ` : ""}
                  {g.PA_pavadinimas || "(no name)"}
                </div>

                <div className="pa-collapse-meta">
                  <span className="pa-counts">
                    Total: {Array.isArray(g.items) ? g.items.length : 0}
                  </span>
                  <span className="pa-collapse-icon">{isPACollapsed(paId) ? "+" : "–"}</span>
                </div>
              </div>

              {/* ✅ COLLAPSIBLE CONTENT */}
              {!isPACollapsed(paId) && (
                <>
                  <div className="pa-bulk-actions">
                    <button
                      type="button"
                      className="accept-all-pa-btn"
                      disabled={bulkKey === `CONFIRM:${g.fk_id_PA}`}
                      onClick={() => confirmAllForPA(g)}
                    >
                      {bulkKey === `CONFIRM:${g.fk_id_PA}`
                        ? "Confirming..."
                        : "Confirm all"}
                    </button>

                    <button
                      type="button"
                      className="cancel-all-pa-btn"
                      disabled={bulkKey === `DECLINE:${g.fk_id_PA}`}
                      onClick={() => declineAllForPA(g)}
                    >
                      {bulkKey === `DECLINE:${g.fk_id_PA}`
                        ? "Declining..."
                        : "Decline all"}
                    </button>
                  </div>
                  <div className="req-table-wrap">
                    <table className="req-table">
                      <thead>
                        <tr>
                          <th>Recommendation</th>
                          <th>Goal</th>
                          <th>WCAG level</th>
                          <th>Probability</th>

                          <th>Status</th>
                          <th>Priority</th>
                          <th>Updated</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {sortByWcagCode(g.items, (r) => r.Formuluote).map((r) => (
                          <tr key={`${r.fk_id_PA}:${r.fk_id_Reikalavimas ?? r.id_Reikalavimas}`}>
                            <td>{r.Formuluote}</td>
                            <td>{r.Tikslas}</td>
                            <td>{r.Atitikties_lygis || "-"}</td>
                            <td>{r.Tikimybe ?? "-"}</td>

                            <td>{r.Busena || "-"}</td>
                            <td>{r.Prioritetas ?? "-"}</td>
                            <td>
                              {r.Koregavimo_data
                                ? new Date(r.Koregavimo_data).toLocaleDateString()
                                : "-"}
                            </td>

                            <td>
                              <button className="req-edit-btn" onClick={() => openEdit(r)}>
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          );
        })
      )}

      {/* EDIT MODAL */}
      {editOpen && editRow ? (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit requirement</h2>
              <button
                type="button"
                className="modal-x"
                onClick={closeEdit}
                disabled={savingEdit}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-meta">
                <div>
                  <b>PA:</b> {editRow.PA_kodas ? `${editRow.PA_kodas} – ` : ""}
                  {editRow.PA_pavadinimas || editRow.fk_id_PA}
                </div>
              </div>

              {editForm.busena === "Cancelled" ? (
                <label className="modal-label">
                  Atmetimo priežastis
                  <input
                    className="modal-input"
                    value={editForm.atmetimo_priezastis}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        atmetimo_priezastis: e.target.value,
                      }))
                    }
                    placeholder="Įrašyk atmetimo priežastį (nebūtina)"
                  />
                </label>
              ) : null}

              <label className="modal-label">
                Conformance criteria <span className="req">*</span>
                <textarea
                  className="modal-textarea"
                  value={editForm.tenkinimo_kriterijus}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      tenkinimo_kriterijus: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </label>

              <label className="modal-label">
                Priority <span className="req">*</span>
                <select
                  className="modal-select"
                  value={editForm.prioritetas}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, prioritetas: e.target.value }))
                  }
                >
                  <option value="1">1 (Highest)</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5 (Lowest)</option>
                </select>
              </label>

              <label className="modal-label">
                Clarified definition <span className="req">*</span>
                <textarea
                  className="modal-textarea"
                  value={editForm.patikslinta_formuluote}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      patikslinta_formuluote: e.target.value,
                    }))
                  }
                  rows={4}
                />
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn modal-btn--ghost"
                onClick={closeEdit}
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn modal-btn--primary"
                onClick={saveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Requirements;
