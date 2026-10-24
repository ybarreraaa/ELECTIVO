/**
 * MÓDULO DE INTERACTIVIDAD ACADÉMICA Y AUDIOVISUAL (Secciones 8 y 9)
 * Fotografías interactivas (Lightbox), Información desplegable, Líneas de tiempo,
 * Entrevistas reales del documento, Cuestionarios con puntaje y reintento,
 * Infografías de datos reales y Reproductor de YouTube con pausa automática de música.
 */
(function () {
  const quizState = {};

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* 1. Renderizador de Línea de Tiempo Interactiva */
  function renderTimelineWidget(timelineId, data) {
    const tl = data.timelines && data.timelines[timelineId];
    if (!tl || !tl.events || !tl.events.length) return "";
    const first = tl.events[0];
    const buttonsHtml = tl.events
      .map(
        (ev, idx) =>
          `<button type="button" class="timeline-step-btn ${idx === 0 ? "active" : ""}" data-timeline-id="${escapeHtml(timelineId)}" data-step-index="${idx}">${escapeHtml(ev.period)}</button>`
      )
      .join("");

    return `
      <div class="interactive-widget timeline-widget" data-widget-timeline="${escapeHtml(timelineId)}">
        <div class="widget-header">
          <span class="widget-tag">CRONOLOGÍA INTERACTIVA</span>
          <span class="widget-tag">${tl.events.length} HITOS DOCUMENTADOS</span>
        </div>
        <div class="widget-title" style="margin-bottom:6px;">${escapeHtml(tl.title)}</div>
        <div class="timeline-tabs">${buttonsHtml}</div>
        <div class="timeline-detail-box" id="tl-detail-${escapeHtml(timelineId)}">
          <div class="ed-kicker" style="margin-bottom:2px;">${escapeHtml(first.period)}</div>
          <div class="figure-caption-title" style="margin-top:0;margin-bottom:4px;">${escapeHtml(first.title)}</div>
          <p class="ed-paragraph" style="margin-bottom:0;font-size:0.76rem;">${escapeHtml(first.description)}</p>
        </div>
      </div>
    `;
  }

  /* 2. Renderizador de Entrevistas Reales del Documento */
  function renderInterviewWidget(interviewId, data) {
    const iv = data.interviews && data.interviews[interviewId];
    if (!iv) return "";
    const qaHtml = iv.qa
      .map(
        (item, idx) => `
        <div class="interview-item">
          <button type="button" class="interview-q-btn ${idx === 0 ? "active" : ""}" data-interview-toggle="${escapeHtml(interviewId)}-${idx}">
            <span>P${idx + 1}. ${escapeHtml(item.q)}</span>
            <span>${idx === 0 ? "−" : "+"}</span>
          </button>
          <div class="interview-a-panel ${idx === 0 ? "open" : ""}" id="iv-panel-${escapeHtml(interviewId)}-${idx}">
            ${escapeHtml(item.a)}
          </div>
        </div>
      `
      )
      .join("");

    return `
      <div class="interactive-widget interview-widget">
        <div class="widget-header">
          <span class="widget-tag">ENTREVISTA DE INVESTIGACIÓN</span>
          <button type="button" class="editorial-action-btn secondary" style="padding:2px 8px;font-size:0.58rem;" data-open-interview-modal="${escapeHtml(interviewId)}">VER ENTREVISTA COMPLETA</button>
        </div>
        <div class="widget-title">${escapeHtml(iv.title)}</div>
        <div class="ed-caption" style="margin-bottom:8px;"><strong>Especialista(s):</strong> ${escapeHtml(iv.interviewee)} — <em>${escapeHtml(iv.role)}</em></div>
        ${qaHtml}
      </div>
    `;
  }

  /* 3. Renderizador de Infografías Interactivas basadas en los datos del Word */
  function renderInfographicWidget(infographicId) {
    if (infographicId === "pandemicStats") {
      return `
        <div class="interactive-widget">
          <div class="widget-header">
            <span class="widget-tag">INFOGRAFÍA DE DATOS · CAPÍTULOS 2.1 Y 2.2</span>
            <span class="widget-tag">EDUCACIÓN 2020 & UDD</span>
          </div>
          <div class="widget-title" style="margin-bottom:8px;">Impacto emocional en pandemia (#EstamosConectados) y Jornada Escolar Completa</div>
          <div class="stat-bar-row">
            <div class="stat-bar-label"><span>Estudiantes en Jornada Escolar Completa (31,5 hrs/sem)</span><span>83%</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width:83%"></div></div>
          </div>
          <div class="stat-bar-row">
            <div class="stat-bar-label"><span>Sensación de aburrimiento durante aislamiento (#EstamosConectados)</span><span>63%</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width:63%"></div></div>
          </div>
          <div class="stat-bar-row">
            <div class="stat-bar-label"><span>Desmotivación para estudiar en confinamiento</span><span>41%</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width:41%"></div></div>
          </div>
          <div class="stat-bar-row">
            <div class="stat-bar-label"><span>Sentimientos frecuentes de tristeza o desánimo (&gt;36%)</span><span>36%</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width:36%"></div></div>
          </div>
        </div>
      `;
    }

    if (infographicId === "psychopathyComparison") {
      return `
        <div class="interactive-widget">
          <div class="widget-header">
            <span class="widget-tag">ESQUEMA COMPARATIVO FORENSE · CAPÍTULO 3.1</span>
            <span class="widget-tag">KARPMan (1941) · KIEHL & HOFFMAN (2011)</span>
          </div>
          <div class="widget-title" style="margin-bottom:8px;">Prevalencia estimada y diferenciación clínica de subtipos</div>
          <div class="stat-bar-row">
            <div class="stat-bar-label"><span>Prevalencia estimada en población general (Kiehl y Hoffman, 2011)</span><span>~1%</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width:8%"></div></div>
          </div>
          <div class="stat-bar-row">
            <div class="stat-bar-label"><span>Prevalencia estimada en población penitenciaria</span><span>15% – 25%</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width:25%"></div></div>
          </div>
          <div class="secondary-figures-grid" style="margin-top:8px;">
            <div class="pillar-card">
              <span class="pillar-code">PSICOPATÍA PRIMARIA</span>
              <div class="pillar-name">Factores Constitucionales</div>
              <p class="ed-caption">Menor nivel de ansiedad, frialdad afectiva marcada, cálculo instrumental y déficit en procesamiento emocional amigdalino.</p>
            </div>
            <div class="pillar-card">
              <span class="pillar-code">PSICOPATÍA SECUNDARIA</span>
              <div class="pillar-name">Entorno y Adversidad Temprana</div>
              <p class="ed-caption">Asociada a traumas infantiles, violencia intrafamiliar o negligencia; mayor impulsividad, ansiedad y agresión reactiva.</p>
            </div>
          </div>
        </div>
      `;
    }

    if (infographicId === "bronfenbrennerModel") {
      return `
        <div class="interactive-widget">
          <div class="widget-header">
            <span class="widget-tag">MODELO ECOLÓGICO INTERACTIVO · CAPÍTULO 4.3</span>
            <span class="widget-tag">URIE BRONFENBRENNER (1979)</span>
          </div>
          <div class="widget-title" style="margin-bottom:6px;">Los 5 Sistemas Ecológicos que rodean al Cuidador de Demencia (84,8% Mujeres en Chile)</div>
          <div class="timeline-tabs">
            <button type="button" class="timeline-step-btn active" data-bronf-level="micro">1. Microsistema</button>
            <button type="button" class="timeline-step-btn" data-bronf-level="meso">2. Mesosistema</button>
            <button type="button" class="timeline-step-btn" data-bronf-level="exo">3. Exosistema</button>
            <button type="button" class="timeline-step-btn" data-bronf-level="macro">4. Macrosistema</button>
            <button type="button" class="timeline-step-btn" data-bronf-level="crono">5. Cronosistema</button>
          </div>
          <div class="timeline-detail-box" id="bronf-detail-box">
            <div class="figure-caption-title" style="margin-top:0;">1. Microsistema (Entorno inmediato y hogar)</div>
            <p class="ed-paragraph" style="margin-bottom:0;font-size:0.75rem;">Relaciones y espacios que rodean directamente al cuidador: el vínculo diario con la persona con demencia, la convivencia en el núcleo familiar y las tareas directas de asistencia e higiene.</p>
          </div>
        </div>
      `;
    }

    if (infographicId === "youthFinanceChart") {
      return `
        <div class="interactive-widget">
          <div class="widget-header">
            <span class="widget-tag">RADIOGRAFÍA FINANCIERA JUVENIL · CAPÍTULOS 5.2 Y 5.3</span>
            <span class="widget-tag">INJUV · SERNAC · CMF (2023–2025)</span>
          </div>
          <div class="widget-title" style="margin-bottom:8px;">Brecha entre tenencia de productos bancarios y educación financiera en Chile</div>
          <div class="stat-bar-row">
            <div class="stat-bar-label"><span>Jóvenes (18–29 años) que poseen algún producto financiero (INJUV)</span><span>73%</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width:73%"></div></div>
          </div>
          <div class="stat-bar-row">
            <div class="stat-bar-label"><span>Declaran NO tener conocimientos de educación financiera (SERNAC)</span><span>53%</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width:53%"></div></div>
          </div>
          <div class="stat-bar-row">
            <div class="stat-bar-label"><span>Jóvenes que logran ahorrar regularmente (SERNAC)</span><span>44%</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width:44%"></div></div>
          </div>
          <div class="stat-bar-row">
            <div class="stat-bar-label"><span>Gastan más dinero del que perciben mensualmente</span><span>35%</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width:35%"></div></div>
          </div>
          <div class="stat-bar-row">
            <div class="stat-bar-label"><span>Han mantenido deudas o créditos activos (Sondeo INJUV)</span><span>30,1%</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width:30.1%"></div></div>
          </div>
          <div class="stat-bar-row">
            <div class="stat-bar-label"><span>Jóvenes de 18–24 años con deuda morosa (Informe CMF, junio 2025)</span><span>14,3%</span></div>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width:14.3%"></div></div>
          </div>
        </div>
      `;
    }

    if (infographicId === "cyberDefenseMatrix") {
      return `
        <div class="interactive-widget">
          <div class="widget-header">
            <span class="widget-tag">LABORATORIO DE CIBERAMENAZAS · CAPÍTULO 6.4</span>
            <span class="widget-tag">IBM (2024) · WEF (2025) · ESET</span>
          </div>
          <div class="widget-title" style="margin-bottom:6px;">Explorador de vectores de ataque e impacto corporativo</div>
          <div class="timeline-tabs">
            <button type="button" class="timeline-step-btn active" data-cyber-tab="social">Phishing / Vishing / Smishing</button>
            <button type="button" class="timeline-step-btn" data-cyber-tab="deepfake">IA & Deepfakes (Arup USD 25M)</button>
            <button type="button" class="timeline-step-btn" data-cyber-tab="malware">Ransomware (USD 4,91M) & Spyware</button>
            <button type="button" class="timeline-step-btn" data-cyber-tab="defense">Defensa: SOC, Firewall y OSINT</button>
          </div>
          <div class="timeline-detail-box" id="cyber-matrix-box">
            <div class="figure-caption-title" style="margin-top:0;">Ingeniería Social y Factor Humano</div>
            <p class="ed-paragraph" style="margin-bottom:0;font-size:0.75rem;">El factor humano es explotado mediante correos engañosos (<strong>Phishing</strong>), llamadas telefónicas fraudulentas (<strong>Vishing</strong>) y mensajes SMS con enlaces maliciosos (<strong>Smishing</strong>). La capacitación continua del personal es la primera barrera preventiva.</p>
          </div>
        </div>
      `;
    }

    return "";
  }

  /* 4. Renderizador de Cuestionario de Comprensión (Quiz) */
  function renderQuizWidget(quizId, data) {
    const qz = data.quizzes && data.quizzes[quizId];
    if (!qz) return "";
    if (!quizState[quizId]) {
      quizState[quizId] = { answers: {}, completed: false };
    }
    const st = quizState[quizId];

    const questionsHtml = qz.questions
      .map((qObj, qIdx) => {
        const chosen = st.answers[qIdx];
        const answered = typeof chosen === "number";
        const optsHtml = qObj.options
          .map((optText, oIdx) => {
            let cls = "quiz-opt-btn";
            if (answered) {
              if (oIdx === qObj.correct) cls += " correct-choice";
              else if (oIdx === chosen && chosen !== qObj.correct) cls += " wrong-choice";
            }
            return `<button type="button" class="${cls}" data-quiz-id="${escapeHtml(quizId)}" data-q-idx="${qIdx}" data-o-idx="${oIdx}" ${answered ? "disabled" : ""}>${escapeHtml(optText)}</button>`;
          })
          .join("");

        return `
          <div class="quiz-question-block">
            <div class="quiz-q-text">${qIdx + 1}. ${escapeHtml(qObj.q)}</div>
            ${optsHtml}
            <div class="quiz-feedback ${answered ? "visible" : ""}" id="qf-${escapeHtml(quizId)}-${qIdx}">
              ${answered ? `<strong>Fundamentación:</strong> ${escapeHtml(qObj.explanation)}` : ""}
            </div>
          </div>
        `;
      })
      .join("");

    const totalQ = qz.questions.length;
    const answeredCount = Object.keys(st.answers).length;
    let correctCount = 0;
    Object.keys(st.answers).forEach((k) => {
      const qi = parseInt(k, 10);
      if (st.answers[qi] === qz.questions[qi].correct) correctCount++;
    });

    return `
      <div class="interactive-widget quiz-widget" id="quiz-box-${escapeHtml(quizId)}">
        <div class="widget-header">
          <span class="widget-tag">CUESTIONARIO DE COMPRENSIÓN LECTORA</span>
          <span class="widget-tag">${escapeHtml(qz.articleTitle)}</span>
        </div>
        <div class="widget-title" style="margin-bottom:8px;">Verifica tu comprensión académica del artículo</div>
        ${questionsHtml}
        <div class="quiz-score-bar">
          <span>Puntaje: ${correctCount} / ${totalQ} (${answeredCount}/${totalQ} respondidas)</span>
          <button type="button" class="editorial-action-btn secondary" data-quiz-reset="${escapeHtml(quizId)}" style="padding:4px 10px;">REINTENTAR CUESTIONARIO</button>
        </div>
      </div>
    `;
  }

  /* 5. Lightbox de Imágenes Ampliadas */
  function openImageLightbox(src, title, caption) {
    const modal = document.getElementById("lightbox-modal");
    const img = document.getElementById("lightbox-img");
    const ttl = document.getElementById("lightbox-title");
    const cap = document.getElementById("lightbox-caption");
    if (!modal || !img) return;
    img.src = src;
    if (ttl) ttl.textContent = title || "Fotografía / Elemento Gráfico del Documento Original";
    if (cap) cap.textContent = caption || "";
    modal.classList.add("open");
  }

  /* 6. Modal de Video de YouTube con Pausa Automática de Música Ambiental */
  function openVideoModal(config) {
    const modal = document.getElementById("video-modal");
    const container = document.getElementById("video-iframe-container");
    const titleEl = document.getElementById("video-modal-title");
    const descEl = document.getElementById("video-modal-desc");
    const extLink = document.getElementById("video-modal-ext-link");

    if (!modal || !container) return;

    // Pausar automáticamente la música ambiental al abrir un video
    if (window.EditorialAudio) {
      window.EditorialAudio.pauseForVideo();
    }

    if (titleEl) titleEl.textContent = config.title || "Recurso Audiovisual";
    if (descEl) descEl.textContent = config.description || "";

    const ytId = config.youtubeId || "";
    const externalUrl =
      config.link ||
      config.searchUrl ||
      (ytId ? `https://www.youtube.com/watch?v=${ytId}` : "https://www.youtube.com");

    if (extLink) {
      extLink.href = externalUrl;
    }

    if (ytId) {
      container.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(ytId)}?autoplay=1&rel=0" title="${escapeHtml(config.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    } else {
      container.innerHTML = `
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;color:#F5F3EE;">
          <p style="margin-bottom:14px;font-size:0.9rem;">Este recurso documental o cinematográfico puede abrirse directamente en su fuente verificada o vincularse mediante ID de YouTube en el Modo Editor.</p>
          <a href="${escapeHtml(externalUrl)}" target="_blank" rel="noopener noreferrer" class="editorial-action-btn" style="background:#D4A359;color:#0E3047;border-color:#D4A359;">ABRIR EN YOUTUBE / FUENTE OFICIAL</a>
        </div>
      `;
    }

    modal.classList.add("open");
  }

  function closeVideoModal() {
    const modal = document.getElementById("video-modal");
    const container = document.getElementById("video-iframe-container");
    if (container) container.innerHTML = "";
    if (modal) modal.classList.remove("open");
    if (window.EditorialAudio) {
      window.EditorialAudio.resumeAfterVideo();
    }
  }

  /* 7. Delegación global de eventos para elementos interactivos dentro de las páginas */
  function attachGlobalInteractionListeners(getDataFn, reRenderFn) {
    document.addEventListener("click", (e) => {
      const data = getDataFn();

      // A. Lightbox en imágenes editoriales
      const figTrigger = e.target.closest("[data-lightbox-src]");
      if (figTrigger && !e.target.closest(".figure-replace-btn")) {
        const src = figTrigger.getAttribute("data-lightbox-src");
        const title = figTrigger.getAttribute("data-lightbox-title") || "";
        const caption = figTrigger.getAttribute("data-lightbox-caption") || "";
        openImageLightbox(src, title, caption);
        return;
      }

      // B. Pestañas Resumen / Abstract bilingüe
      const absBtn = e.target.closest("[data-abstract-lang]");
      if (absBtn) {
        const box = absBtn.closest(".abstract-box");
        if (box) {
          const lang = absBtn.getAttribute("data-abstract-lang");
          box.querySelectorAll("[data-abstract-lang]").forEach((b) => b.classList.toggle("active", b === absBtn));
          const esPane = box.querySelector(".abstract-pane-es");
          const enPane = box.querySelector(".abstract-pane-en");
          if (esPane && enPane) {
            esPane.style.display = lang === "es" ? "block" : "none";
            enPane.style.display = lang === "en" ? "block" : "none";
          }
        }
        return;
      }

      // C. Desplegables "LEER MÁS / DESCUBRIR MÁS"
      const drawerBtn = e.target.closest(".drawer-toggle-btn");
      if (drawerBtn) {
        const drawer = drawerBtn.closest(".expandable-drawer");
        if (drawer) {
          const isOpen = drawer.classList.toggle("open");
          const indicator = drawerBtn.querySelector(".drawer-icon");
          if (indicator) indicator.textContent = isOpen ? "OCULTAR SECCIÓN −" : "LEER MÁS / DESCUBRIR MÁS +";
        }
        return;
      }

      // D. Líneas de tiempo
      const tlBtn = e.target.closest("[data-timeline-id]");
      if (tlBtn) {
        const tlId = tlBtn.getAttribute("data-timeline-id");
        const idx = parseInt(tlBtn.getAttribute("data-step-index"), 10);
        const tl = data.timelines && data.timelines[tlId];
        if (tl && tl.events[idx]) {
          const ev = tl.events[idx];
          const widget = tlBtn.closest(".timeline-widget");
          if (widget) {
            widget.querySelectorAll(".timeline-step-btn").forEach((b) => b.classList.toggle("active", b === tlBtn));
          }
          const detail = document.getElementById("tl-detail-" + tlId);
          if (detail) {
            detail.innerHTML = `
              <div class="ed-kicker" style="margin-bottom:2px;">${escapeHtml(ev.period)}</div>
              <div class="figure-caption-title" style="margin-top:0;margin-bottom:4px;">${escapeHtml(ev.title)}</div>
              <p class="ed-paragraph" style="margin-bottom:0;font-size:0.76rem;">${escapeHtml(ev.description)}</p>
            `;
          }
        }
        return;
      }

      // E. Modelo Ecológico de Bronfenbrenner
      const bronfBtn = e.target.closest("[data-bronf-level]");
      if (bronfBtn) {
        const level = bronfBtn.getAttribute("data-bronf-level");
        const map = {
          micro: {
            t: "1. Microsistema (Entorno inmediato y hogar)",
            d: "Relaciones y espacios que rodean activamente al cuidador: el trato diario con el familiar con demencia, la convivencia en el hogar y el desgaste físico y emocional directo."
          },
          meso: {
            t: "2. Mesosistema (Interacción entre entornos cercanos)",
            d: "Vínculo entre la familia, los centros de salud, los profesionales médicos y el lugar de trabajo del cuidador. Una buena coordinación reduce la sobrecarga."
          },
          exo: {
            t: "3. Exosistema (Entornos indirectos e institucionales)",
            d: "Condiciones que afectan al cuidador sin que participe directamente en su diseño: disponibilidad de farmacias populares, programas municipales, licencias y redes comunitarias."
          },
          macro: {
            t: "4. Macrosistema (Cultura, género y políticas públicas)",
            d: "Valores sociales y normas culturales en Chile, incluyendo el estigma de que «la mujer debe dedicarse a cuidar» (84,8% de cuidadoras mujeres) y leyes como el Plan Nacional de Apoyos y Cuidados."
          },
          crono: {
            t: "5. Cronosistema (Evolución temporal y envejecimiento)",
            d: "Cambios a lo largo del tiempo: el avance progresivo del deterioro cognitivo del paciente y la transición demográfica de Chile (duplicación de mayores de 65 años entre 1992 y 2024)."
          }
        };
        const parent = bronfBtn.closest(".interactive-widget");
        if (parent) {
          parent.querySelectorAll("[data-bronf-level]").forEach((b) => b.classList.toggle("active", b === bronfBtn));
        }
        const box = document.getElementById("bronf-detail-box");
        if (box && map[level]) {
          box.innerHTML = `
            <div class="figure-caption-title" style="margin-top:0;">${escapeHtml(map[level].t)}</div>
            <p class="ed-paragraph" style="margin-bottom:0;font-size:0.75rem;">${map[level].d}</p>
          `;
        }
        return;
      }

      // F. Matriz de Ciberseguridad
      const cyberBtn = e.target.closest("[data-cyber-tab]");
      if (cyberBtn) {
        const tab = cyberBtn.getAttribute("data-cyber-tab");
        const map = {
          social: {
            t: "Ingeniería Social y Factor Humano (Phishing, Vishing y Smishing)",
            d: "Aprovecha la falta de capacitación mediante correos fraudulentos (Phishing), llamadas telefónicas suplantando identidades (Vishing) y mensajes SMS con enlaces maliciosos (Smishing)."
          },
          deepfake: {
            t: "Inteligencia Artificial y Deepfakes (Casos Zelenski, Arup y Ferrari)",
            d: "En marzo de 2022 circuló un deepfake del presidente Zelenski; a inicios de 2024, la firma Arup en Hong Kong sufrió un fraude de USD 25 millones mediante una videollamada con deepfakes corporativos."
          },
          malware: {
            t: "Malware, Ransomware (IBM: USD 4,91M) y Spyware (BonziBuddy)",
            d: "El ransomware cifra sistemas exigiendo rescate (como el ataque a BancoEstado en septiembre de 2020; costo medio global de USD 4,91 millones según IBM 2024), mientras que el spyware recopila datos ocultamente."
          },
          defense: {
            t: "Arquitectura de Defensa: SOC, Firewall, Antivirus, Hacking Ético y OSINT",
            d: "Combina monitoreo continuo mediante un Centro de Operaciones de Seguridad (SOC), filtrado de red (Firewall), pruebas autorizadas (Hacking Ético) e inteligencia de fuentes abiertas (OSINT)."
          }
        };
        const parent = cyberBtn.closest(".interactive-widget");
        if (parent) {
          parent.querySelectorAll("[data-cyber-tab]").forEach((b) => b.classList.toggle("active", b === cyberBtn));
        }
        const box = document.getElementById("cyber-matrix-box");
        if (box && map[tab]) {
          box.innerHTML = `
            <div class="figure-caption-title" style="margin-top:0;">${escapeHtml(map[tab].t)}</div>
            <p class="ed-paragraph" style="margin-bottom:0;font-size:0.75rem;">${escapeHtml(map[tab].d)}</p>
          `;
        }
        return;
      }

      // G. Preguntas de Entrevistas
      const ivBtn = e.target.closest("[data-interview-toggle]");
      if (ivBtn) {
        const key = ivBtn.getAttribute("data-interview-toggle");
        const panel = document.getElementById("iv-panel-" + key);
        if (panel) {
          const isOpen = panel.classList.toggle("open");
          ivBtn.classList.toggle("active", isOpen);
          const sign = ivBtn.querySelector("span:last-child");
          if (sign) sign.textContent = isOpen ? "−" : "+";
        }
        return;
      }

      // Modal de Entrevista Completa
      const ivModalBtn = e.target.closest("[data-open-interview-modal]");
      if (ivModalBtn) {
        const ivId = ivModalBtn.getAttribute("data-open-interview-modal");
        const iv = data.interviews && data.interviews[ivId];
        if (iv) {
          const modal = document.getElementById("generic-info-modal");
          const body = document.getElementById("generic-modal-body");
          if (modal && body) {
            body.innerHTML = `
              <span class="ed-kicker" style="color:#D4A359;">REGISTRO DOCUMENTAL DE ENTREVISTA</span>
              <h3 style="font-family:'Playfair Display',serif;font-size:1.3rem;margin:6px 0;">${escapeHtml(iv.title)}</h3>
              <p style="font-size:0.82rem;color:#B8C7D6;margin-bottom:10px;"><strong>Entrevistado(s):</strong> ${escapeHtml(iv.interviewee)} · ${escapeHtml(iv.role)}</p>
              <p style="font-size:0.8rem;color:#DFD8C8;margin-bottom:16px;">${escapeHtml(iv.context)}</p>
              ${iv.qa
                .map(
                  (item, i) => `
                <div style="background:rgba(255,255,255,0.05);border-left:3px solid #D4A359;padding:12px 14px;margin-bottom:12px;">
                  <div style="font-weight:700;margin-bottom:6px;color:#FFFFFF;">Pregunta ${i + 1}: ${escapeHtml(item.q)}</div>
                  <div style="font-size:0.85rem;line-height:1.6;color:#E6E1D6;">${escapeHtml(item.a)}</div>
                </div>
              `
                )
                .join("")}
            `;
            modal.classList.add("open");
          }
        }
        return;
      }

      // H. Opciones de Cuestionario (Quiz)
      const qOpt = e.target.closest("[data-quiz-id]");
      if (qOpt) {
        const quizId = qOpt.getAttribute("data-quiz-id");
        const qIdx = parseInt(qOpt.getAttribute("data-q-idx"), 10);
        const oIdx = parseInt(qOpt.getAttribute("data-o-idx"), 10);
        if (!quizState[quizId]) quizState[quizId] = { answers: {} };
        quizState[quizId].answers[qIdx] = oIdx;
        const container = document.getElementById("quiz-box-" + quizId);
        if (container) {
          container.outerHTML = renderQuizWidget(quizId, data);
        }
        return;
      }

      // Reiniciar Cuestionario
      const qReset = e.target.closest("[data-quiz-reset]");
      if (qReset) {
        const quizId = qReset.getAttribute("data-quiz-reset");
        quizState[quizId] = { answers: {} };
        const container = document.getElementById("quiz-box-" + quizId);
        if (container) {
          container.outerHTML = renderQuizWidget(quizId, data);
        }
        return;
      }

      // I. Botones de Video de YouTube / Documental
      const vidBtn = e.target.closest("[data-open-video]");
      if (vidBtn) {
        const payload = {
          youtubeId: vidBtn.getAttribute("data-yt-id") || "",
          title: vidBtn.getAttribute("data-vid-title") || "Recurso Audiovisual",
          description: vidBtn.getAttribute("data-vid-desc") || "",
          link: vidBtn.getAttribute("data-vid-link") || ""
        };
        openVideoModal(payload);
        return;
      }
    });

    // Buscador en vivo para el Glosario (63 términos) y Bibliografía APA
    document.addEventListener("input", (e) => {
      if (e.target.matches("[data-glossary-search]")) {
        const query = e.target.value.trim().toLowerCase();
        const pageEl = e.target.closest(".interior-page");
        if (!pageEl) return;
        const data = getDataFn();
        const listEl = pageEl.querySelector(".glossary-list");
        if (!listEl) return;

        // Si el usuario escribe en el buscador, busca en los 63 conceptos completos del glosario
        const pool = query
          ? data.glossary.filter(
              (g) =>
                g.term.toLowerCase().includes(query) ||
                g.definition.toLowerCase().includes(query) ||
                g.category.toLowerCase().includes(query)
            )
          : data.glossary.filter((g) => {
              const start = parseInt(e.target.getAttribute("data-range-start") || "1", 10);
              const end = parseInt(e.target.getAttribute("data-range-end") || "63", 10);
              return g.num >= start && g.num <= end;
            });

        listEl.innerHTML = pool.length
          ? pool
              .map(
                (g) => `
              <div class="glossary-entry">
                <div>
                  <span class="glossary-term">${g.num}. ${escapeHtml(g.term)}</span>
                  <span class="glossary-cat-badge">${escapeHtml(g.category)}</span>
                </div>
                <p class="ed-paragraph" style="margin-bottom:0;font-size:0.74rem;">${escapeHtml(g.definition)}</p>
              </div>
            `
              )
              .join("")
          : `<p class="ed-caption">No se encontraron términos que coincidan con «${escapeHtml(e.target.value)}».</p>`;
      }

      if (e.target.matches("[data-bib-search]")) {
        const query = e.target.value.trim().toLowerCase();
        const pageEl = e.target.closest(".interior-page");
        if (!pageEl) return;
        pageEl.querySelectorAll(".bib-item").forEach((item) => {
          const match = item.textContent.toLowerCase().includes(query);
          item.style.display = match ? "block" : "none";
        });
      }
    });
  }

  window.EditorialInteractions = {
    renderTimelineWidget,
    renderInterviewWidget,
    renderInfographicWidget,
    renderQuizWidget,
    openImageLightbox,
    openVideoModal,
    closeVideoModal,
    attachGlobalInteractionListeners
  };
})();
