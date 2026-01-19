import React from "react";
import "./App.css";
import Navbar from "./Components/Navbar";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

import Home from "./Components/Home";
import About from "./Components/About";
import ProjectCreate from "./Components/ProjectCreate";
import MyProjects from "./Components/MyProjects";
import Specifications from "./Components/Pages/Specifications";
import Recommendations from "./Components/Recommendations";
import Requirements from "./Components/Requirements"; // ✅ ČIA PATAISYTA

import "./Components/ProjectCreate.css";

function ProjectsLayout({ children }) {
  return (
    <div className="projects-layout">
      {/* LEFT MENU */}
      <aside className="projects-sidebar">
        <h3 className="menu-title">Choose your action</h3>
        <p className="menu-subtitle">MENU</p>

        <ul className="menu-list">
          <li>
            <Link
              to="/create"
              className={window.location.pathname === "/create" ? "active" : ""}
            >
              Create new
              <span className="menu-desc">Creation of new projects</span>
            </Link>
          </li>

          <li>
            <Link
              to="/myprojects"
              className={window.location.pathname === "/myprojects" ? "active" : ""}
            >
              My projects
              <span className="menu-desc">Already specified projects</span>
            </Link>
          </li>
        </ul>
      </aside>

      {/* RIGHT WHITE CARD */}
      <main className="projects-main-card">{children}</main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />

        <Route
          path="/create"
          element={
            <ProjectsLayout>
              <ProjectCreate />
            </ProjectsLayout>
          }
        />

        <Route
          path="/myprojects"
          element={
            <ProjectsLayout>
              <MyProjects />
            </ProjectsLayout>
          }
        />

        <Route
          path="/specifications/:projectId"
          element={
            <ProjectsLayout>
              <Specifications />
            </ProjectsLayout>
          }
        />

        <Route
          path="/recommendations/:projectId"
          element={
            <ProjectsLayout>
              <Recommendations />
            </ProjectsLayout>
          }
        />

        {/* ✅ REQUIREMENTS ROUTE */}
        <Route
          path="/requirements/:projectId"
          element={
            <ProjectsLayout>
              <Requirements />
            </ProjectsLayout>
          }
        />

        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
