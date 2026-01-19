import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import "./Recommendations.css";

function Recommendations() {
  const { projectId } = useParams();
  const [projectName, setProjectName] = useState("");
  const [projectLevel, setProjectLevel] = useState("-");
  const [specs, setSpecs] = useState([]); // PA list
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  // confirmed state: key = `${paId}:${recId}`
  const [confirmed, setConfirmed] = useState({});
  const [confirmingKey, setConfirmingKey] = useState(null);

  // requirements map (status + ids)
  const [reqMap, setReqMap] = useState(new Map());

  // edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({
    tenkinimo_kriterijus: "",
    prioritetas: "3",
    patikslinta_formuluote: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  // collapse per PA: key = paId => true/false
  const [collapsedPA, setCollapsedPA] = useState({});

  const togglePA = (paId) => {
    setCollapsedPA((prev) => ({ ...prev, [paId]: !prev[paId] }));
  };

  const isPACollapsed = (paId) => !!collapsedPA[paId];


  /* ===============================
     FETCH
  =============================== */
  const fetchAll = useCallback(() => {
    setLoading(true);

    Promise.all([
      fetch(`http://localhost:5000/api/project/${projectId}`).then((r) => r.json()),
      fetch(`http://localhost:5000/api/specifications/${projectId}`).then((r) => r.json()),
      fetch(`http://localhost:5000/api/rekomendacijos`).then((r) => r.json()),
      fetch(`http://localhost:5000/api/requirements/${projectId}`).then((r) => r.json()),
    ])
      .then(([project, specifications, recommendations, requirements]) => {
        const lvl = project?.Atitikties_lygis
          ? String(project.Atitikties_lygis).trim().toUpperCase()
          : "-";

        const name = project?.Pavadinimas ? String(project.Pavadinimas).trim() : "";

        setProjectLevel(lvl);
        setProjectName(name);
        setSpecs(Array.isArray(specifications) ? specifications : []);
        setRecs(Array.isArray(recommendations) ? recommendations : []);

        const map = new Map();
        const conf = {};

        (Array.isArray(requirements) ? requirements : []).forEach((row) => {
          const key = `${row.fk_id_PA}:${row.fk_id_Rekomendacija}`;
          map.set(key, row);
          conf[key] = true;
        });

        setReqMap(map);
        setConfirmed(conf);
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
        setSpecs([]);
        setRecs([]);
        setReqMap(new Map());
        setConfirmed({});
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ===============================
     HELPERS
  =============================== */

  const isUniversalValue = (v) => {
    if (v == null) return false;

    if (typeof v === "object" && v.type === "Buffer" && Array.isArray(v.data)) {
      return v.data.length > 0 && v.data[0] === 1;
    }

    if (v === 1 || v === true) return true;
    if (v === 0 || v === false) return false;

    if (typeof v === "number") return v === 1;

    if (typeof v === "string") {
      const s = v.trim().toUpperCase();
      if (["1", "TRUE", "YES", "TAIP", "T"].includes(s)) return true;
      if (["0", "FALSE", "NO", "NE", "N"].includes(s)) return false;
      return false;
    }

    return false;
  };

  const normalizeAnswer = (v) => {
    if (typeof v !== "string") return undefined;
    const s = v.trim().toUpperCase();

    if (s === "TAIP") return "YES";
    if (s === "NE") return "NO";
    if (s === "GAL" || s === "GALBŪT" || s === "GALBUT") return "MAYBE";

    return s; // YES/NO/MAYBE
  };

  const getWcagCode = (rec) => {
    const first = String(rec?.Formuluote || "").trim().split(/\s+/)[0] || "";
    const m = first.match(/^(\d+\.\d+\.\d+)(?:\.)?$/);
    return m ? m[1] : "";
  };

  const isRec412 = (rec) => getWcagCode(rec) === "4.1.2";

  const computeProbability = (ru) => ru.v1 * 0.5 + ru.v2 * 0.3 + ru.v3 * 0.2;

  const probToLevel = (p) => {
    if (p >= 0.7 && p <= 1.0) return "H";
    if (p >= 0.3 && p <= 0.69) return "M";
    if (p >= 0.0 && p <= 0.29) return "L";
    return null;
  };

  const probToDb = (lvl) => {
    if (lvl === "H") return "A";
    if (lvl === "M") return "V";
    if (lvl === "L") return "Ž";
    return null;
  };

  /* ===============================
     allowed WCAG levels (kaupiantis)
  =============================== */
  const allowedLevels = useMemo(() => {
    return (
      {
        A: ["A"],
        AA: ["A", "AA"],
        AAA: ["A", "AA", "AAA"],
      }[String(projectLevel || "").trim().toUpperCase()] || []
    );
  }, [projectLevel]);

  /* ===============================
     Dedupe families
  =============================== */
  const DUP_GROUPS = useMemo(
    () => [
      { key: "contrast_text", A: null, AA: "1.4.3", AAA: "1.4.6" },
      { key: "resize_visual", A: null, AA: "1.4.4", AAA: "1.4.8" },
      { key: "audio_desc", A: null, AA: "1.2.5", AAA: "1.2.7" },
      { key: "media_alt", A: "1.2.3", AA: null, AAA: "1.2.8" },
      { key: "keyboard", A: "2.1.1", AA: null, AAA: "2.1.3" },
      { key: "timing", A: "2.2.1", AA: null, AAA: "2.2.3" },
      { key: "headings", A: null, AA: "2.4.6", AAA: "2.4.10" },
    ],
    []
  );

  const levelPriority = useMemo(() => {
    const lvl = String(projectLevel || "").trim().toUpperCase();
    if (lvl === "AAA") return ["AAA", "AA", "A"];
    if (lvl === "AA") return ["AA", "A"];
    return ["A"];
  }, [projectLevel]);

  const dedupeByWcagFamilies = useCallback(
    (list) => {
      if (!Array.isArray(list) || list.length === 0) return list;

      const byCode = new Map();
      for (const r of list) {
        const code = getWcagCode(r);
        if (code) byCode.set(code, r);
      }

      const allFamilyCodes = new Set(DUP_GROUPS.flatMap((g) => [g.A, g.AA, g.AAA]).filter(Boolean));
      const base = list.filter((r) => !allFamilyCodes.has(getWcagCode(r)));

      const chosen = [];
      for (const g of DUP_GROUPS) {
        let picked = null;
        for (const lvl of levelPriority) {
          const code = g[lvl];
          if (!code) continue;
          const rec = byCode.get(code);
          if (rec) {
            picked = rec;
            break;
          }
        }
        if (picked) chosen.push(picked);
      }

      const merged = [...chosen, ...base];
      const seen = new Set();
      return merged.filter((r) => {
        const id = r.id_Rekomendacija;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    },
    [DUP_GROUPS, levelPriority]
  );

  /* ===============================
     recMap (group rules per rec)
  =============================== */
  const recMap = useMemo(() => {
    const map = new Map();

    (Array.isArray(recs) ? recs : []).forEach((row) => {
      const id = row.id_Rekomendacija;
      if (!id) return;

      if (!map.has(id)) {
        map.set(id, {
          id_Rekomendacija: row.id_Rekomendacija,
          Formuluote: row.Formuluote,
          Tikslas: row.Tikslas,
          Ar_universali: row.Ar_universali,
          Atitikties_lygis: row.Atitikties_lygis,
          rules: [],
        });
      }

      const recObj = map.get(id);

      if (row.KR_id) {
        recObj.rules.push({
          KR_id: String(row.KR_id).trim(),
          expected: normalizeAnswer(row.KR_reiksme),
          v1: parseFloat(row.v1_reiksme) || 0,
          v2: parseFloat(row.v2_reiksme) || 0,
          v3: parseFloat(row.v3_reiksme) || 0,
        });
      }
    });

    return map;
  }, [recs]);

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
     classifyForPA  (UPDATED)
     ✅ If ALL answers are MAYBE => return ALL recommendations as LOW
  =============================== */
  const classifyForPA = useCallback(
      (answersByKrId) => {
        let high = [];
        let medium = [];
        let low = [];

        // ✅ Detect "everything is MAYBE"
        const ansValues = Object.values(answersByKrId || {}).filter(Boolean);
        const hasAnyAnswers = ansValues.length > 0;
        const allMaybe = hasAnyAnswers && ansValues.every((v) => v === "MAYBE");

        // ✅ If ALL MAYBE => show ALL allowed recommendations as LOW
        if (allMaybe) {
          for (const rec of recMap.values()) {
            if (isUniversalValue(rec.Ar_universali)) continue;

            const recLevel = String(rec.Atitikties_lygis || "").trim().toUpperCase();
            if (!allowedLevels.includes(recLevel)) continue;

            low.push({
              ...rec,
              probability: 0.29,
              probabilityLevel: "L",
            });
          }

          const deduped = dedupeByWcagFamilies(low);
          return { high: [], medium: [], low: deduped };
        }

        // Normal logic when not "all MAYBE"
        for (const rec of recMap.values()) {
          if (isUniversalValue(rec.Ar_universali)) continue;

          const recLevel = String(rec.Atitikties_lygis || "").trim().toUpperCase();
          if (!allowedLevels.includes(recLevel)) continue;

          if (!Array.isArray(rec.rules) || rec.rules.length === 0) continue;

          // special handling for 4.1.2
          if (isRec412(rec)) {
            const matched = rec.rules.some((ru) => {
              const ans = answersByKrId[ru.KR_id];
              if (!ans) return false;
              return ru.expected ? ans === ru.expected : ans === "YES";
            });
            if (matched) high.push({ ...rec, probability: 1.0, probabilityLevel: "H" });
            continue;
          }

          const matchedPs = [];
          for (const ru of rec.rules) {
            const ans = answersByKrId[ru.KR_id];
            if (!ans) continue;
            if (!ru.expected) continue;

            if (ans !== ru.expected) continue;

            const p = computeProbability(ru);
            if (typeof p === "number" && !Number.isNaN(p)) matchedPs.push(p);
          }

          if (matchedPs.length === 0) continue;

          const finalP = matchedPs.length === 1 ? matchedPs[0] : Math.max(...matchedPs);
          const lvl = probToLevel(finalP);
          if (!lvl) continue;

          const recWithP = { ...rec, probability: finalP, probabilityLevel: lvl };

          if (lvl === "H") high.push(recWithP);
          else if (lvl === "M") medium.push(recWithP);
          else if (lvl === "L") low.push(recWithP);
        }

        const all = [...high, ...medium, ...low];
        const dedupedAll = dedupeByWcagFamilies(all);

        high = dedupedAll.filter((r) => r.probabilityLevel === "H");
        medium = dedupedAll.filter((r) => r.probabilityLevel === "M");
        low = dedupedAll.filter((r) => r.probabilityLevel === "L");

        return { high, medium, low };
      },
      [recMap, allowedLevels, dedupeByWcagFamilies, isUniversalValue, isRec412, computeProbability, probToLevel]
    );

  /* ===============================
     BUILD RESULTS
  =============================== */
  const { general, perPA } = useMemo(() => {
    let generalList = [];
    for (const rec of recMap.values()) {
      if (isUniversalValue(rec.Ar_universali)) {
        const recLevel = String(rec.Atitikties_lygis || "").trim().toUpperCase();
        if (!recLevel || recLevel === "KITA" || allowedLevels.includes(recLevel)) {
          generalList.push(rec);
        }
      }
    }
    generalList = dedupeByWcagFamilies(generalList);

    const perPAList = (Array.isArray(specs) ? specs : []).map((pa) => {
      const answersByKrId = {};
      Object.entries(pa.krValues || {}).forEach(([krId, value]) => {
        const ans = normalizeAnswer(value);
        if (ans) answersByKrId[String(krId)] = ans;
      });

      const { high, medium, low } = classifyForPA(answersByKrId);

      return {
        id_PA: pa.id_PA,
        PA_kodas: pa.PA_kodas,
        pavadinimas: pa.pavadinimas,
        charakteristika: pa.charakteristika,
        high,
        medium,
        low,
      };
    });

    return { general: generalList, perPA: perPAList };
  }, [recMap, specs, classifyForPA, allowedLevels, dedupeByWcagFamilies]);

  /* ===============================
     CONFIRM
  =============================== */
  const confirmRequirement = async ({ paId, recId, tikimybeLevel }) => {
    const key = `${paId}:${recId}`;
    setConfirmingKey(key);

    try {
      const res = await fetch("http://localhost:5000/api/requirements/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: Number(projectId),
          paId: Number(paId),
          recommendationId: Number(recId),
          tikimybe: probToDb(tikimybeLevel),
        }),
      });

      const data = await res.json();

      if (res.ok && data?.success) fetchAll();
      else {
        console.error("Confirm failed:", data);
        alert("Confirm failed. Check server logs.");
      }
    } catch (e) {
      console.error("Confirm error:", e);
      alert("Confirm error. Check server logs.");
    } finally {
      setConfirmingKey(null);
    }
  };

  const confirmAllForPA = async (pa) => {
    if (!pa?.id_PA) return;

    const paId = pa.id_PA;

    const combined = [...(pa.high || []), ...(pa.medium || []), ...(pa.low || [])];

    const toConfirm = combined.filter((r) => !confirmed[`${paId}:${r.id_Rekomendacija}`]);

    if (toConfirm.length === 0) {
      alert("Nothing to confirm — everything is already confirmed for this use case.");
      return;
    }

    const ok = window.confirm(`Confirm ${toConfirm.length} requirements for this use case?`);
    if (!ok) return;

    setConfirmingKey(`ALL:${paId}`);

    try {
      await Promise.all(
        toConfirm.map((r) =>
          fetch("http://localhost:5000/api/requirements/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: Number(projectId),
              paId: Number(paId),
              recommendationId: Number(r.id_Rekomendacija),
              tikimybe: probToDb(r.probabilityLevel || null),
            }),
          }).then(async (res) => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success) throw new Error(`Failed for recId=${r.id_Rekomendacija}`);
          })
        )
      );

      fetchAll();
    } catch (e) {
      console.error("Confirm all (PA) error:", e);
      alert("Accept all failed. Check server logs.");
    } finally {
      setConfirmingKey(null);
    }
  };

  const cancelAllForPA = async (pa) => {
  if (!pa?.id_PA) return;

  const paId = pa.id_PA;

  const combined = [...(pa.high || []), ...(pa.medium || []), ...(pa.low || [])];

  if (combined.length === 0) {
    alert("Nothing to cancel for this use case.");
    return;
  }

  const ok = window.confirm(
    `Cancel ${combined.length} recommendations for this use case?`
  );
  if (!ok) return;

  setConfirmingKey(`CANCEL:${paId}`);

  try {
    await Promise.all(
      combined.map((r) =>
        fetch("http://localhost:5000/api/requirements/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: Number(projectId),
            paId: Number(paId),
            recommendationId: Number(r.id_Rekomendacija),
            tikimybe: probToDb(r.probabilityLevel || null),
            busena: "Cancelled",
          }),
        }).then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data?.success) {
            throw new Error(`Failed to cancel recId=${r.id_Rekomendacija}`);
          }
        })
      )
    );

    fetchAll();
  } catch (e) {
    console.error("Cancel all (PA) error:", e);
    alert("Cancel failed. Check server logs.");
  } finally {
    setConfirmingKey(null);
  }
  };  

  /* ===============================
     EDIT
  =============================== */
  const openEdit = (paId, recId) => {
    const key = `${paId}:${recId}`;
    const req = reqMap.get(key);
    if (!req) return;

    setEditRow({ paId, recId, ...req });
    setEditForm({
      tenkinimo_kriterijus: req.Tenkinimo_kriterijus || "",
      prioritetas: req.Prioritetas ?? "1",
      patikslinta_formuluote: req.Patikslinta_formuluote || "",
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
    });
  };

  const saveEdit = async () => {
    if (!editRow) return;

    if (!String(editForm.tenkinimo_kriterijus || "").trim())
      return alert("Tenkinimo kriterijus is required.");
    if (String(editForm.prioritetas || "").trim() === "")
      return alert("Prioritetas is required.");
    if (!String(editForm.patikslinta_formuluote || "").trim())
      return alert("Patikslinta formuluote is required.");

    setEditForm((p) => ({ ...p, busena: "Reviewed" }));

    setSavingEdit(true);

    const payload = {
      reikalavimasId: editRow.id_Reikalavimas,
      paId: editRow.fk_id_PA,
      busena: "Reviewed",
      tenkinimo_kriterijus: editForm.tenkinimo_kriterijus,
      prioritetas: editForm.prioritetas,
      patikslinta_formuluote: editForm.patikslinta_formuluote,
    };

    try {
      const res = await fetch("http://localhost:5000/api/pa-reikalavimai/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : { raw: await res.text() };

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

  /* ===============================
     SAVE PROJECT
  =============================== */
  const saveProject = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/projects/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: Number(projectId) }),
      });

      const data = await res.json();

      if (data.success) {
        alert("Project successfully saved!");
        window.location.href = "/myprojects";
      } else {
        alert("Saving failed.");
      }
    } catch (err) {
      console.error("SAVE error:", err);
      alert("Error saving project.");
    }
  };

  /* ===============================
     TABLE UI
  =============================== */
const renderTable = (list, showProbability = true, paId = null, variant = "") => (
  <div className="rec-table-wrap">
    <table className={`rec-table ${variant ? `rec-table--${variant}` : ""}`}>
      <thead>
        <tr>
          <th>Recommendation</th>
          <th>Goal</th>
          {showProbability ? <th>Probability</th> : null}
          {paId ? <th>Status</th> : null}
          {paId ? <th>Action</th> : null}
        </tr>
      </thead>
      <tbody>
        {sortByWcagCode(list, (r) => r.Formuluote).map((r) => {
          const key = paId ? `${paId}:${r.id_Rekomendacija}` : null;
          const req = key ? reqMap.get(key) : null;

          const isDone = key ? !!confirmed[key] : false;
          const isLoading = key ? confirmingKey === key || confirmingKey === `ALL:${paId}` : false;

          const status = req?.Busena || (isDone ? "To review" : "-");

          return (
            <tr key={r.id_Rekomendacija}>
              <td>{r.Formuluote}</td>
              <td>{r.Tikslas}</td>

              {showProbability ? (
                <td>
                  {r.probabilityLevel || "-"} |{" "}
                  {typeof r.probability === "number" ? r.probability.toFixed(2) : "-"}
                </td>
              ) : null}

              {paId ? <td>{status}</td> : null}

              {paId ? (
                <td>
                  {!isDone ? (
                    <button
                      className="confirm-btn"
                      disabled={isLoading}
                      onClick={() =>
                        confirmRequirement({
                          paId,
                          recId: r.id_Rekomendacija,
                          tikimybeLevel: r.probabilityLevel || null,
                        })
                      }
                    >
                      {isLoading ? "Confirming..." : "Confirm"}
                    </button>
                  ) : (
                    <button
                      className="confirm-btn"
                      onClick={() => openEdit(paId, r.id_Rekomendacija)}
                    >
                      Edit
                    </button>
                  )}
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);


  /* ===============================
     PAGE RENDER
  =============================== */
  return (
    <div className="recommendations-wrapper">
      <h2 className="project-title">Accessibility Recommendations</h2>
      <h3>Project name: {projectName}</h3>
      <h3>Project ID: {projectId}</h3>
      <h4>Conformance level: {projectLevel}</h4>

      <p className="method-note">
        Classification is performed at the individual use-case level. Each use case is evaluated independently based on
        functional behavior, content type, interaction patterns, and technical implementation.
      </p>

      {loading ? (
        <p>Loading recommendations...</p>
      ) : (
        <>
          <section>
            <h2>General</h2>
              {general.length === 0 ? <p>No general recommendations.</p> : renderTable(general, false, null, "general")}
          </section>

          {perPA.length === 0 ? (
            <p>No use cases (PA) found for this project.</p>
          ) : (
            perPA.map((pa) => (
              <section key={pa.id_PA} className="pa-section">
                <div
                  className="pa-collapse-header"
                  role="button"
                  tabIndex={0}
                  onClick={() => togglePA(pa.id_PA)}
                  onKeyDown={(e) => e.key === "Enter" && togglePA(pa.id_PA)}
                >
                  <div className="pa-collapse-title">
                    Use case: {pa.PA_kodas ? `${pa.PA_kodas} – ` : ""}
                    {pa.pavadinimas || `PA #${pa.id_PA}`}
                  </div>

                  <div className="pa-collapse-meta">
                    <span className="pa-counts">
                      H: {pa.high.length} · M: {pa.medium.length} · L: {pa.low.length}
                    </span>
                    <span className="pa-collapse-icon">{isPACollapsed(pa.id_PA) ? "+" : "–"}</span>
                  </div>
                </div>

                  {!isPACollapsed(pa.id_PA) && (
                    <>
                      {pa.charakteristika ? <p className="pa-desc">Description: {pa.charakteristika}</p> : null}

                        <div className="pa-probability-header">
                          <h3>High probability (H)</h3>

                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              className="accept-all-pa-btn"
                              disabled={confirmingKey === `ALL:${pa.id_PA}`}
                              onClick={() => confirmAllForPA(pa)}
                              title="Confirm all recommendations for this use case (H+M+L)"
                            >
                              {confirmingKey === `ALL:${pa.id_PA}` ? "Accepting..." : "Accept all"}
                            </button>

                            <button
                              type="button"
                              className="cancel-all-pa-btn"
                              disabled={confirmingKey === `CANCEL:${pa.id_PA}`}
                              onClick={() => cancelAllForPA(pa)}
                              title="Cancel all recommendations for this use case"
                            >
                              {confirmingKey === `CANCEL:${pa.id_PA}` ? "Cancelling..." : "Cancel all"}
                            </button>
                          </div>
                        </div>

                      {pa.high.length === 0
                        ? <p>No high-probability recommendations.</p>
                        : renderTable(pa.high, true, pa.id_PA, "equal")}

                      <h3>High probability (H)</h3>
                      {pa.high.length === 0 ? <p>No high-probability recommendations.</p> : renderTable(pa.high, true, pa.id_PA, "equal")}

                      <h3>Medium probability (M)</h3>
                      {pa.medium.length === 0 ? <p>No medium-probability recommendations.</p> : renderTable(pa.medium, true, pa.id_PA, "equal")}

                      <h3>Low probability (L)</h3>
                      {pa.low.length === 0 ? <p>No low-probability recommendations.</p> : renderTable(pa.low, true, pa.id_PA, "equal")}
                    </>
                  )}
              </section>
            ))
          )}

          <div className="save-actions">
            <button className="save-btn" onClick={saveProject}>
              Save
            </button>
          </div>
        </>
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
            <label className="modal-label">
              Conformance <span className="req">*</span>
              <textarea
                className="modal-textarea"
                value={editForm.tenkinimo_kriterijus}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, tenkinimo_kriterijus: e.target.value }))
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
                  setEditForm((p) => ({ ...p, patikslinta_formuluote: e.target.value }))
                }
                rows={4}
              />
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="modal-btn modal-btn--ghost" onClick={closeEdit} disabled={savingEdit}>
              Cancel
            </button>
            <button type="button" className="modal-btn modal-btn--primary" onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </div>
  );
}

export default Recommendations;
