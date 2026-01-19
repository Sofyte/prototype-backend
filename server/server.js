// server/server.js
import express from "express";
import cors from "cors";
import mysql from "mysql2";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

/* -----------------------------
   ✅ JSON
------------------------------ */
app.use(express.json());

/* -----------------------------
   ✅ CORS
   For uni deploy we can allow all, OR restrict.
   If you serve React from the same Express app, CORS is mostly irrelevant.
------------------------------ */
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.options(/\/api\/.*/, cors());

/* -----------------------------
   ✅ LOG EVERY REQUEST
------------------------------ */
app.use((req, res, next) => {
  console.log("➡️", req.method, req.originalUrl);
  next();
});

/* -----------------------------
   ✅ HEALTH CHECK
------------------------------ */
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    server: "magistrinis-api",
    time: new Date().toISOString(),
  });
});

/* -----------------------------
   DB CONNECTION (from .env)
------------------------------ */
const db = mysql.createConnection({
  host: process.env.DB_HOST || process.env.MYSQLHOST,
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER,
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME || process.env.MYSQLDATABASE,
  multipleStatements: true,
});

db.connect((err) => {
  if (err) console.error("❌ DB ERROR:", err);
  else console.log("✅ DB connected");
});

/* -----------------------------
   YOUR ROUTES (unchanged)
------------------------------ */

// CREATE PROJECT
app.post("/projektai", (req, res) => {
  const { pavadinimas, aprasymas, sukurimo_data, atitikties_lygis } = req.body;

  if (!pavadinimas || !sukurimo_data || !atitikties_lygis) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const query = `
    INSERT INTO Projektas (Pavadinimas, Aprasymas, Sukurimo_data, Atitikties_lygis)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    query,
    [pavadinimas, aprasymas || null, sukurimo_data, atitikties_lygis],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ success: true, projectId: result.insertId });
    }
  );
});

// GET PROJECT BY ID
app.get("/api/project/:id", (req, res) => {
  db.query(
    "SELECT * FROM Projektas WHERE id_Projektas = ?",
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err });
      if (!rows.length) return res.status(404).json({ error: "Not found" });
      res.json(rows[0]);
    }
  );
});

// GET KR + VALUES
app.get("/api/kr", (req, res) => {
  const query = `
    SELECT KR.id_KR, KR.Klausimas, KR.Paaiskinimas,
           GKR.id_GKR, GKR.Reiksme
    FROM KR
    LEFT JOIN galima_kr_reiksme GKR ON KR.id_KR = GKR.fk_id_KR
    ORDER BY KR.id_KR, GKR.id_GKR
  `;

  db.query(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err });

    const grouped = {};
    rows.forEach((r) => {
      if (!grouped[r.id_KR]) {
        grouped[r.id_KR] = {
          id_KR: r.id_KR,
          Klausimas: r.Klausimas,
          Paaiskinimas: r.Paaiskinimas,
          reiksmes: [],
        };
      }
      if (r.id_GKR) {
        grouped[r.id_KR].reiksmes.push({
          id_GKR: r.id_GKR,
          Reiksme: r.Reiksme,
        });
      }
    });

    res.json(Object.values(grouped));
  });
});

// CREATE PA
app.post("/api/pa/create", (req, res) => {
  const { PA_kodas, pavadinimas, charakteristika, projektas_id } = req.body;

  if (!PA_kodas || !pavadinimas || !projektas_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.query(
    "INSERT INTO PA (PA_kodas, Pavadinimas, Charakteristika, fk_id_Projektas) VALUES (?, ?, ?, ?)",
    [PA_kodas, pavadinimas, charakteristika || null, projektas_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ success: true, id_PA: result.insertId });
    }
  );
});

// SAVE KR VALUES (per PA)
app.post("/api/pa/kr/save", (req, res) => {
  const { paId, krValues } = req.body;

  if (!paId) return res.status(400).json({ error: "Missing paId" });

  if (!Array.isArray(krValues) || krValues.length === 0) {
    return db.query(
      "DELETE FROM kr_reiksme WHERE fk_id_PA = ?",
      [paId],
      (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ success: true });
      }
    );
  }

  const values = krValues.map((k) => [paId, k.id_GKR]);

  const query = `
    DELETE FROM kr_reiksme WHERE fk_id_PA = ?;
    INSERT INTO kr_reiksme (fk_id_PA, fk_id_GKR) VALUES ?;
  `;

  db.query(query, [paId, values], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

// GET SPECIFICATIONS FOR PROJECT
app.get("/api/specifications/:projectId", (req, res) => {
  const query = `
    SELECT 
      PA.id_PA,
      PA.PA_kodas,
      PA.Pavadinimas AS PA_pavadinimas,
      PA.Charakteristika,

      KR.id_KR,
      GKR.Reiksme
    FROM PA
    LEFT JOIN kr_reiksme KRR ON KRR.fk_id_PA = PA.id_PA
    LEFT JOIN galima_kr_reiksme GKR ON GKR.id_GKR = KRR.fk_id_GKR
    LEFT JOIN KR ON KR.id_KR = GKR.fk_id_KR
    WHERE PA.fk_id_Projektas = ?
    ORDER BY PA.id_PA, KR.id_KR
  `;

  db.query(query, [req.params.projectId], (err, rows) => {
    if (err) return res.status(500).json({ error: err });

    const grouped = {};
    rows.forEach((r) => {
      if (!grouped[r.id_PA]) {
        grouped[r.id_PA] = {
          id_PA: r.id_PA,
          PA_kodas: r.PA_kodas,
          pavadinimas: r.PA_pavadinimas,
          charakteristika: r.Charakteristika,
          krValues: {},
        };
      }
      if (r.id_KR) grouped[r.id_PA].krValues[String(r.id_KR)] = r.Reiksme;
    });

    res.json(Object.values(grouped));
  });
});

// GET RECOMMENDATIONS
app.get("/api/rekomendacijos", (req, res) => {
  const query = `
    SELECT 
      r.id_Rekomendacija,
      r.Formuluote,
      r.Tikslas,
      (r.Ar_universali + 0) AS Ar_universali,
      r.Atitikties_lygis,

      pt.v1_reiksme,
      pt.v2_reiksme,
      pt.v3_reiksme,

      gkr.id_GKR,
      gkr.Reiksme AS KR_reiksme,
      gkr.fk_id_KR AS KR_id

    FROM rekomendacija r
    LEFT JOIN priskyrimo_taisykle pt ON pt.fk_id_Rekomendacija = r.id_Rekomendacija
    LEFT JOIN galima_kr_reiksme gkr ON gkr.id_GKR = pt.fk_id_GKR
    ORDER BY r.id_Rekomendacija
  `;

  db.query(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
});

// GET REQUIREMENTS FOR PROJECT
app.get("/api/requirements/:projectId", (req, res) => {
  const query = `
    SELECT
      par.Busena,
      par.AtmEtimo_priezastis,
      par.AtmEtimo_data,
      par.Patvirtinimo_data,
      par.Koregavimo_data,
      par.Tenkinimo_kriterijus,
      par.Prioritetas,
      par.Patikslinta_formuluote,
      par.fk_id_Reikalavimas,
      par.fk_id_PA,

      req.id_Reikalavimas,
      req.Priskyrimo_data,
      req.Tikimybe,
      req.fk_id_Projektas,
      req.fk_id_Rekomendacija,

      pa.PA_kodas,
      pa.Pavadinimas AS PA_pavadinimas,

      r.Formuluote,
      r.Tikslas,
      r.Atitikties_lygis,
      (r.Ar_universali + 0) AS Ar_universali

    FROM pa_reikalavimas par
    INNER JOIN reikalavimas req
      ON req.id_Reikalavimas = par.fk_id_Reikalavimas
      AND req.fk_id_PA = par.fk_id_PA
    LEFT JOIN pa ON pa.id_PA = req.fk_id_PA
    LEFT JOIN rekomendacija r ON r.id_Rekomendacija = req.fk_id_Rekomendacija
    WHERE req.fk_id_Projektas = ?
    ORDER BY req.fk_id_PA, req.id_Reikalavimas DESC
  `;

  db.query(query, [req.params.projectId], (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
});

// CREATE REQUIREMENT (CONFIRM)
app.post("/api/requirements/create", (req, res) => {
  const { projectId, paId, recommendationId, tikimybe, busena } = req.body;

  if (!projectId || !paId || !recommendationId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const normalizedBusena = String(busena || "").trim();
  const allowed = new Set(["To review", "Reviewed", "Cancelled"]);
  const safeBusena = allowed.has(normalizedBusena) ? normalizedBusena : "To review";

  const checkQuery = `
    SELECT id_Reikalavimas
    FROM reikalavimas
    WHERE fk_id_Projektas = ? AND fk_id_PA = ? AND fk_id_Rekomendacija = ?
    LIMIT 1
  `;

  db.query(checkQuery, [projectId, paId, recommendationId], (err, exists) => {
    if (err) return res.status(500).json({ error: err });

    if (Array.isArray(exists) && exists.length > 0) {
      const existingId = exists[0].id_Reikalavimas;

      const ensureRow = `
        INSERT INTO pa_reikalavimas (Busena, Koregavimo_data, fk_id_Reikalavimas, fk_id_PA)
        SELECT ?, NOW(), ?, ?
        WHERE NOT EXISTS (
          SELECT 1 FROM pa_reikalavimas
          WHERE fk_id_Reikalavimas = ? AND fk_id_PA = ?
        )
      `;

      const updateStatus = `
        UPDATE pa_reikalavimas
        SET
          Busena = ?,
          Koregavimo_data = NOW(),
          Atmetimo_data = CASE
            WHEN ? = 'Cancelled' THEN NOW()
            WHEN ? = 'To review' THEN NULL
            ELSE Atmetimo_data
          END,
          Patvirtinimo_data = CASE
            WHEN ? = 'Reviewed' THEN NOW()
            WHEN ? = 'To review' THEN NULL
            ELSE Patvirtinimo_data
          END
        WHERE fk_id_Reikalavimas = ? AND fk_id_PA = ?
      `;

      return db.query(
        ensureRow,
        [safeBusena, existingId, paId, existingId, paId],
        (err2) => {
          if (err2) return res.status(500).json({ error: err2 });

          db.query(
            updateStatus,
            [
              safeBusena,
              safeBusena,
              safeBusena,
              safeBusena,
              safeBusena,
              existingId,
              paId,
            ],
            (err3) => {
              if (err3) return res.status(500).json({ error: err3 });

              return res.json({
                success: true,
                message: "Updated existing requirement",
                id_Reikalavimas: existingId,
                busena: safeBusena,
              });
            }
          );
        }
      );
    }

    const insertReq = `
      INSERT INTO reikalavimas
        (Priskyrimo_data, Tikimybe, fk_id_Rekomendacija, fk_id_Projektas, fk_id_PA)
      VALUES
        (NOW(), ?, ?, ?, ?)
    `;

    db.query(
      insertReq,
      [tikimybe ?? null, recommendationId, projectId, paId],
      (err2, result) => {
        if (err2) return res.status(500).json({ error: err2 });

        const newReqId = result.insertId;

        const insertPAReq = `
          INSERT INTO pa_reikalavimas
            (Busena, Koregavimo_data, fk_id_Reikalavimas, fk_id_PA)
          VALUES
            (?, NOW(), ?, ?)
        `;

        db.query(insertPAReq, [safeBusena, newReqId, paId], (err3) => {
          if (err3) return res.status(500).json({ error: err3 });

          res.json({
            success: true,
            message: "Created new requirement",
            id_Reikalavimas: newReqId,
            busena: safeBusena,
          });
        });
      }
    );
  });
});

// UPDATE PA_REIKALAVIMAS (EDIT SAVE) -> UPSERT
const updatePaReikalavimasHandler = (req, res) => {
  const {
    reikalavimasId,
    paId,
    busena,
    tenkinimo_kriterijus,
    prioritetas,
    patikslinta_formuluote,
    atmetimo_priezastis,
  } = req.body;

  if (!reikalavimasId || !paId || !busena) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const setApproved = busena === "Reviewed";
  const setRejected = busena === "Cancelled";
  const setToReview = busena === "To review";

  const updateQuery = `
    UPDATE pa_reikalavimas
    SET
      Busena = ?,
      Tenkinimo_kriterijus = ?,
      Prioritetas = ?,
      Patikslinta_formuluote = ?,
      Atmetimo_priezastis = ?,
      Koregavimo_data = NOW(),
      Patvirtinimo_data = CASE 
        WHEN ? THEN NOW()
        WHEN ? THEN NULL
        ELSE Patvirtinimo_data
      END,
      Atmetimo_data = CASE
        WHEN ? THEN NOW()
        WHEN ? THEN NULL
        ELSE Atmetimo_data
      END
    WHERE fk_id_Reikalavimas = ? AND fk_id_PA = ?
  `;

  db.query(
    updateQuery,
    [
      busena,
      tenkinimo_kriterijus ?? null,
      prioritetas ?? null,
      patikslinta_formuluote ?? null,
      atmetimo_priezastis ?? null,
      setApproved,
      setToReview,
      setRejected,
      setToReview,
      reikalavimasId,
      paId,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });

      if (result.affectedRows === 0) {
        const insertQuery = `
          INSERT INTO pa_reikalavimas
            (Busena, Tenkinimo_kriterijus, Prioritetas, Patikslinta_formuluote,
             Atmetimo_priezastis, Koregavimo_data, Patvirtinimo_data, Atmetimo_data,
             fk_id_Reikalavimas, fk_id_PA)
          VALUES
            (?, ?, ?, ?, ?, NOW(),
             CASE WHEN ? THEN NOW() ELSE NULL END,
             CASE WHEN ? THEN NOW() ELSE NULL END,
             ?, ?)
        `;

        return db.query(
          insertQuery,
          [
            busena,
            tenkinimo_kriterijus ?? null,
            prioritetas ?? null,
            patikslinta_formuluote ?? null,
            atmetimo_priezastis ?? null,
            setApproved,
            setRejected,
            reikalavimasId,
            paId,
          ],
          (err2, ins) => {
            if (err2) return res.status(500).json({ error: err2 });
            return res.json({
              success: true,
              inserted: true,
              affectedRows: ins.affectedRows,
            });
          }
        );
      }

      res.json({
        success: true,
        inserted: false,
        affectedRows: result.affectedRows,
      });
    }
  );
};

app.post(/^\/api\/pa[-_]reikalavim(?:as|ai)\/update\/?$/, updatePaReikalavimasHandler);

// SAVE PROJECT
app.post("/api/projects/save", (req, res) => {
  const { projectId } = req.body;
  if (!projectId) return res.status(400).json({ error: "Missing projectId" });

  db.query(
    "UPDATE Projektas SET IsSaved = 1 WHERE id_Projektas = ?",
    [projectId],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ success: true, message: "Project saved successfully." });
    }
  );
});

// GET SAVED PROJECTS
app.get("/api/myprojects", (req, res) => {
  const query = `
    SELECT 
      id_Projektas,
      Pavadinimas,
      Aprasymas,
      Sukurimo_data,
      Atitikties_lygis,
      IsSaved
    FROM Projektas
    WHERE IsSaved = 1
    ORDER BY id_Projektas DESC
  `;

  db.query(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
});

// (Optional) DELETE REQUIREMENT
app.delete("/api/requirements/:id", (req, res) => {
  db.query(
    "DELETE FROM reikalavimas WHERE id_Reikalavimas = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ success: true });
    }
  );
});

/* -----------------------------
   ✅ Serve React build (production)
------------------------------ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CRA build output is at project_root/build
app.use(express.static(path.join(__dirname, "..", "build")));

// send React for any non-API routes (Express 5 safe)
app.get(/.*/, (req, res, next) => {
  if (req.originalUrl.startsWith("/api") || req.originalUrl.startsWith("/projektai")) return next();
  res.sendFile(path.join(__dirname, "..", "build", "index.html"));
});

/* -----------------------------
   404 handler (last)
------------------------------ */
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    method: req.method,
    path: req.originalUrl,
  });
});

/* -----------------------------
   START SERVER
------------------------------ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("🚀 Server running on port", PORT));
