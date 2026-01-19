import express from "express";
import mysql from "mysql2";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 📦 Prisijungimas prie MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

db.connect((err) => {
  if (err) {
    console.error("❌ Nepavyko prisijungti prie DB:", err);
    return;
  }
  console.log("✅ Prisijungta prie MySQL duomenų bazės!");
});

// 🌐 Testinis endpoint
app.get("/", (req, res) => {
  res.send("Serveris veikia!");
});

/* ============================================================
    🟦 1. GAUTI VISUS KR + REIKŠMES  (/api/kr)
============================================================ */
app.get("/api/kr", (req, res) => {
  const sql = `
    SELECT 
        kr.id_KR,
        kr.Klausimas,
        val.id_KR_Reiksme,
        val.Reiksme
    FROM kr
    LEFT JOIN kr_reiksme val ON kr.id_KR = val.fk_id_KR
    ORDER BY kr.id_KR, val.id_KR_Reiksme
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("❌ KR užklausos klaida:", err);
      return res.status(500).json({ error: "DB klaida" });
    }

    // Suformuojam struktūrą: KR -> masyvas su reikšmėmis
    const grouped = {};

    rows.forEach((r) => {
      if (!grouped[r.id_KR]) {
        grouped[r.id_KR] = {
          id_KR: r.id_KR,
          Klausimas: r.Klausimas,
          reiksmes: [],
        };
      }
      if (r.id_KR_Reiksme) {
        grouped[r.id_KR].reiksmes.push({
          id_KR_Reiksme: r.id_KR_Reiksme,
          Reiksme: r.Reiksme,
        });
      }
    });

    res.json(Object.values(grouped));
  });
});

/* ============================================================
    🟩 2. SUKURTI PA  (/api/pa/create)
============================================================ */
app.post("/api/pa/create", (req, res) => {
  const { pavadinimas, charakteristika, projektas_id } = req.body;

  if (!pavadinimas || !projektas_id) {
    return res.status(400).json({ error: "Trūksta duomenų" });
  }

  const sql = `
    INSERT INTO projektas_aspektas (Pavadinimas, Charakteristika, fk_id_Projektas)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [pavadinimas, charakteristika, projektas_id], (err, result) => {
    if (err) {
      console.error("❌ PA kūrimo klaida:", err);
      return res.status(500).json({ error: "Nepavyko sukurti PA" });
    }

    res.json({
      message: "PA sukurta!",
      id_PA: result.insertId,
    });
  });
});

/* ============================================================
    🟧 3. IŠSAUGOTI PA KR REIKŠMES  (/api/pa/kr/save)
============================================================ */
app.post("/api/pa/kr/save", (req, res) => {
  const { paId, krValues } = req.body;

  if (!paId || !Array.isArray(krValues)) {
    return res.status(400).json({ error: "Neteisingi duomenys" });
  }

  const sql = `
    INSERT INTO pa_kr_reiksmes (fk_id_PA, fk_id_KR_Reiksme)
    VALUES ?
  `;

  // masyvas: [[paId, krValue], [paId, krValue], ...]
  const values = krValues.map((v) => [paId, v.kr_reiksme_id]);

  db.query(sql, [values], (err) => {
    if (err) {
      console.error("❌ KR reikšmių saugojimo klaida:", err);
      return res.status(500).json({ error: "Nepavyko išsaugoti" });
    }

    res.json({ message: "KR reikšmės išsaugotos!" });
  });
});

/* ============================================================
    EXISTING PROJECT ENDPOINTS
============================================================ */

// 🧩 GAUTI VISUS PROJEKTUS
app.get("/projektai", (req, res) => {
  const sql = "SELECT * FROM projektas";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Klaida vykdant SQL:", err);
      return res.status(500).json({ error: "Serverio klaida" });
    }
    res.json(results);
  });
});

// 🧩 PRIDĖTI PROJEKTĄ
app.post("/projektai", (req, res) => {
  const { pavadinimas, aprasymas, sukurimo_data, prieinamumo_lygis } = req.body;

  const sql = `
    INSERT INTO projektas (pavadinimas, aprasymas, sukurimo_data, prieinamumo_lygis)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [pavadinimas, aprasymas, sukurimo_data, prieinamumo_lygis], (err, result) => {
    if (err) {
      console.error("❌ Klaida saugant projektą:", err);
      return res.status(500).json({ error: "Nepavyko sukurti projekto" });
    }
    res.json({ message: "Projektas sukurtas!", id: result.insertId });
  });
});

// 🚀 Paleidžiam serverį
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveris veikia: http://localhost:${PORT}`);
});
