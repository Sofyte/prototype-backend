import React, { useMemo, useState, useCallback } from "react";
import "./About.css";

function About() {
  const [openSet, setOpenSet] = useState(() => new Set());

  const isOpen = useCallback((key) => openSet.has(key), [openSet]);

  const toggle = useCallback((key) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const sections = useMemo(
    () => [
      {
        key: "about",
        title: "About REQFA",
        content: (
          <>
            <p>
             REQFA aims to support the systematic identification, evaluation, and specification of accessibility requirements based on the WCAG 2.2 standard, with a strong emphasis on real-world use cases rather than abstract compliance checklists.
            </p>
            <p>
              Instead of treating accessibility as a final verification step, REQFA integrates accessibility considerations into early design and requirement analysis stages, where architectural and interaction decisions have the greatest long-term impact.
            </p>
          </>
        ),
      },
      {
        key: "why",
        title: "Why this prototype exists",
        content: (
          <>
            <p>
              Accessibility standards are comprehensive but often difficult to apply consistently in early design stages. REQFA explores whether a semi-automated, probability-based approach can:
            </p>
            <div className="bullet-list">
              <p className="bullet-item">
                <span className="bullet-dot" aria-hidden="true">•</span>
                Reduce cognitive load when working with WCAG
              </p>
              <p className="bullet-item">
                <span className="bullet-dot" aria-hidden="true">•</span>
                Support informed decision-making
              </p>
              <p className="bullet-item">
                <span className="bullet-dot" aria-hidden="true">•</span>
                Improve traceability between use cases and accessibility requirements
              </p>
            </div>
            <p className="padding-top">
              Each recommendation is evaluated independently per use case,reflecting real system behavior and user interaction patterns.
            </p>
          </>
        ),
      },
      {
        key: "contact",
        title: "Research participation and Contacts",
        content: (
          <>
            <p>
              If you have explored this prototype and would like to contribute to the research, you are invited to complete a short questionnaire.
            </p>

            <p>Keep in mind:</p>

            <div className="bullet-list">
              <p className="bullet-item">
                <span className="bullet-dot" aria-hidden="true">•</span>
                Responses are anonymous
              </p>
              <p className="bullet-item">
                <span className="bullet-dot" aria-hidden="true">•</span>
                Participation is voluntary
              </p>
              <p className="bullet-item">
                <span className="bullet-dot" aria-hidden="true">•</span>
                Data is used exclusively for academic research
              </p>
            </div>

            <p className="padding-top">
              For participation please contact the creator Sofija Sokolovaite: sofija.sokolovaite@ktu.edu
            </p>
          </>
        ),
      },
    ],
    []
  );

  return (
    <div className="about-container">
      <div className="about-content">
        <div className="about-image">
          <img src={require("../img/img-3.jpg")} alt="About Us" />
        </div>

        <div className="about-text">
          <h2>Accessibility Requirements, Made Practical</h2>
          <p className="padding-top">REQFA is a semi-automated research prototype developed as part of a Master’s thesis project at Kaunas University of Technology (KTU) within the Digital Transformation and System Architectures study program.</p>
          {sections.map((s) => (
            <div key={s.key} className={`accordion ${isOpen(s.key) ? "open" : ""}`}>
              <button
                type="button"
                className="accordion-header"
                onClick={() => toggle(s.key)}
                aria-expanded={isOpen(s.key)}
              >
                <span className="accordion-title">{s.title}</span>
                <span className="accordion-icon" aria-hidden="true" />
              </button>

              <div className="accordion-panel">
                <div className="accordion-inner">{s.content}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default About;
