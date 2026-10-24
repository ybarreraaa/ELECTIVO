/**
 * MÓDULO DE INTERACTIVIDAD WEB CONTEMPORÁNEA (Secciones 10 y 11)
 * - Galerías fotográficas con vista ampliada y navegación Anterior / Siguiente
 * - Información desplegable ("LEER MÁS / DESCUBRIR MÁS") y Resumen/Abstract bilingüe
 * - Entrevistas interactivas reales del documento Word
 * - Líneas de tiempo interactivas (Historia del Arte y Ciberseguridad/Legislación)
 * - Infografías interactivas y Evaluador de las 4 Preguntas de Crédito Juvenil
 * - 6 Cuestionarios de comprensión con retroalimentación, puntaje y reintento
 * - 6 Encuestas temáticas con resultados demostrativos identificados y voto persistente
 * - Reproductor de YouTube integrado con pausa automática de música ambiental
 */
(function () {
  const POLL_STORAGE_KEY = "revista_web_v1_polls";
  const quizState = {};
  let pollVotes = {};
  let currentGalleryList = [];
  let currentGalleryIndex = 0;

  try {
    const savedPolls = localStorage.getItem(POLL_STORAGE_KEY);
    if (savedPolls) pollVotes = JSON.parse(savedPolls);
  } catch (e) {}

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
    const pillsHtml = tl.events
      .map(
        (ev, idx) =>
          `<button type="button" class="timeline-pill-btn ${idx === 0 ? "active" : ""}" data-timeline-id="${escapeHtml(timelineId)}" data-step-index="${idx}">${escapeHtml(ev.period)}</button>`
      )
      .join("");

    return `
      <div class="interactive-panel timeline-widget" data-widget-timeline="${escapeHtml(timelineId)}">
        <div class="panel-header-row">
          <span class="panel-badge">LÍNEA DE TIEMPO INTERACTIVA</span>
          <span class="panel-badge">${tl.events.length} HITOS DOCUMENTADOS</span>
        </div>
        <h4 class="panel-title">${escapeHtml(tl.title)}</h4>
        <p class="ed-caption" style="margin-bottom:14px;">Selecciona cada período histórico para explorar su contexto y análisis:</p>
        <div class="timeline-pills">${pillsHtml}</div>
        <div class="timeline-stage-box" id="tl-detail-${escapeHtml(timelineId)}">
          <span class="ed-kicker" style="margin-bottom:4px;">${escapeHtml(first.period)}</span>
          <h5 style="font-family:var(--font-title);font-size:1.05rem;color:var(--brown-dark);margin-bottom:6px;">${escapeHtml(first.title)}</h5>
          <p class="ed-paragraph" style="margin-bottom:0;font-size:0.93rem;">${escapeHtml(first.description)}</p>
        </div>
      </div>
    `;
  }

  /* 2. Renderizador de Entrevistas Interactivas */
  function renderInterviewWidget(interviewId, data) {
    const iv = data.interviews && data.interviews[interviewId];
    if (!iv) return "";
    const qaHtml = iv.qa
      .map(
        (item, idx) => `
        <div class="interview-acc-item">
          <button type="button" class="interview-q-button ${idx === 0 ? "active" : ""}" data-interview-toggle="${escapeHtml(interviewId)}-${idx}">
            <span>${idx + 1}. ${escapeHtml(item.q)}</span>
            <span class="acc-sign">${idx === 0 ? "−" : "+"}</span>
          </button>
          <div class="interview-a-box ${idx === 0 ? "open" : ""}" id="iv-panel-${escapeHtml(interviewId)}-${idx}">
            ${escapeHtml(item.a)}
          </div>
        </div>
      `
      )
      .join("");

    return `
      <div class="interactive-panel interview-widget">
        <div class="panel-header-row">
          <span class="panel-badge">ENTREVISTAS DE LA INVESTIGACIÓN</span>
          <button type="button" class="btn-editorial btn-outline btn-sm" data-open-interview-modal="${escapeHtml(interviewId)}">VER FICHA COMPLETA</button>
        </div>
        <h4 class="panel-title">${escapeHtml(iv.title)}</h4>
        <p class="ed-caption" style="margin-bottom:14px;"><strong>Especialista(s):</strong> ${escapeHtml(iv.interviewee)} — <em>${escapeHtml(iv.role)}</em></p>
        ${qaHtml}
      </div>
    `;
  }

  /* 3. Renderizador de Infografías Interactivas (Datos Reales del Word) */
  function renderInfographicWidget(infographicId) {
    if (infographicId === "pandemicStats") {
      return `
        <div class="interactive-panel">
          <div class="panel-header-row">
            <span class="panel-badge">INFOGRAFÍA INTERACTIVA · CAPÍTULOS 2.1 Y 2.2</span>
            <span class="panel-badge">EDUCACIÓN 2020 & UDD</span>
          </div>
          <h4 class="panel-title">Impacto socioemocional en pandemia (#EstamosConectados) y Jornada Escolar Completa</h4>
          <p class="ed-caption" style="margin-bottom:14px;">Datos empíricos citados en la Monografía 2 sobre el tiempo de permanencia escolar y el estado anímico estudiantil:</p>
          <div class="metric-bar-item">
            <div class="metric-bar-head"><span>Adolescentes en Jornada Escolar Completa en Chile (31,5 hrs semanales)</span><span>83%</span></div>
            <div class="metric-bar-track"><div class="metric-bar-fill" style="width:83%"></div></div>
          </div>
          <div class="metric-bar-item">
            <div class="metric-bar-head"><span>Estudiantes que reportaron aburrimiento en aislamiento (#EstamosConectados)</span><span>63%</span></div>
            <div class="metric-bar-track"><div class="metric-bar-fill" style="width:63%"></div></div>
          </div>
          <div class="metric-bar-item">
            <div class="metric-bar-head"><span>Desmotivación para estudiar durante el confinamiento</span><span>41%</span></div>
            <div class="metric-bar-track"><div class="metric-bar-fill" style="width:41%"></div></div>
          </div>
          <div class="metric-bar-item">
            <div class="metric-bar-head"><span>Sentimientos frecuentes de tristeza o desánimo (&gt;36%)</span><span>36%</span></div>
            <div class="metric-bar-track"><div class="metric-bar-fill" style="width:36%"></div></div>
          </div>
        </div>
      `;
    }

    if (infographicId === "psychopathyComparison") {
      return `
        <div class="interactive-panel">
          <div class="panel-header-row">
            <span class="panel-badge">ESQUEMA CLÍNICO Y FORENSE · CAPÍTULOS 3.1 Y 3.3</span>
            <span class="panel-badge">KARPMAN (1941) · HARE (PCL-R)</span>
          </div>
          <h4 class="panel-title">Prevalencia estimada y dimensiones clínicas de la psicopatía</h4>
          <div class="metric-bar-item">
            <div class="metric-bar-head"><span>Prevalencia estimada en población general (Kiehl y Hoffman, 2011)</span><span>~1%</span></div>
            <div class="metric-bar-track"><div class="metric-bar-fill" style="width:9%"></div></div>
          </div>
          <div class="metric-bar-item">
            <div class="metric-bar-head"><span>Prevalencia estimada en población penitenciaria</span><span>15% – 25%</span></div>
            <div class="metric-bar-track"><div class="metric-bar-fill" style="width:25%"></div></div>
          </div>
          <div class="timeline-pills" style="margin-top:14px;">
            <button type="button" class="timeline-pill-btn active" data-psych-tab="subtipos">Primaria vs. Secundaria</button>
            <button type="button" class="timeline-pill-btn" data-psych-tab="empatia">Empatía Cognitiva vs. Afectiva</button>
            <button type="button" class="timeline-pill-btn" data-psych-tab="agresion">Agresión Instrumental vs. Reactiva</button>
          </div>
          <div class="timeline-stage-box" id="psych-detail-box">
            <h5 style="font-family:var(--font-title);font-size:1rem;color:var(--brown-dark);margin-bottom:6px;">Psicopatía Primaria vs. Secundaria (Karpman, 1941)</h5>
            <p class="ed-paragraph" style="margin-bottom:0;font-size:0.9rem;">La <strong>psicopatía primaria</strong> se asocia a factores constitucionales, menor ansiedad y frialdad afectiva; la <strong>psicopatía secundaria</strong> se vincula a experiencias traumáticas tempranas, entorno familiar adverso y mayor reactividad emocional.</p>
          </div>
        </div>
      `;
    }

    if (infographicId === "bronfenbrennerModel") {
      return `
        <div class="interactive-panel">
          <div class="panel-header-row">
            <span class="panel-badge">DIAGRAMA ECOLÓGICO INTERACTIVO · CAPÍTULO 4.3</span>
            <span class="panel-badge">URIE BRONFENBRENNER (1979)</span>
          </div>
          <h4 class="panel-title">Los 5 Sistemas Ecológicos en el Entorno del Cuidador (84,8% Mujeres en Chile)</h4>
          <p class="ed-caption" style="margin-bottom:12px;">Explora cómo cada anillo del entorno impacta en la sobrecarga o protección de la persona cuidadora:</p>
          <div class="timeline-pills">
            <button type="button" class="timeline-pill-btn active" data-bronf-level="micro">1. Microsistema</button>
            <button type="button" class="timeline-pill-btn" data-bronf-level="meso">2. Mesosistema</button>
            <button type="button" class="timeline-pill-btn" data-bronf-level="exo">3. Exosistema</button>
            <button type="button" class="timeline-pill-btn" data-bronf-level="macro">4. Macrosistema</button>
            <button type="button" class="timeline-pill-btn" data-bronf-level="crono">5. Cronosistema</button>
          </div>
          <div class="timeline-stage-box" id="bronf-detail-box">
            <h5 style="font-family:var(--font-title);font-size:1.02rem;color:var(--brown-dark);margin-bottom:6px;">1. Microsistema (Hogar y núcleo directo)</h5>
            <p class="ed-paragraph" style="margin-bottom:0;font-size:0.92rem;">Relaciones y espacios que rodean activamente al cuidador: el trato diario con la persona con demencia, la distribución de tareas en el hogar y el desgaste físico y emocional directo.</p>
          </div>
        </div>
      `;
    }

    if (infographicId === "youthFinanceChart") {
      return `
        <div class="interactive-panel">
          <div class="panel-header-row">
            <span class="panel-badge">INFOGRAFÍA Y EVALUADOR FINANCIERO · CAPÍTULOS 5.2 Y 5.3</span>
            <span class="panel-badge">INJUV · SERNAC · CMF (2023–2025)</span>
          </div>
          <h4 class="panel-title">Indicadores de inclusión y comportamiento financiero juvenil en Chile</h4>
          <div class="metric-bar-item">
            <div class="metric-bar-head"><span>Jóvenes (18–29 años) que poseen algún producto financiero (INJUV)</span><span>73%</span></div>
            <div class="metric-bar-track"><div class="metric-bar-fill" style="width:73%"></div></div>
          </div>
          <div class="metric-bar-item">
            <div class="metric-bar-head"><span>Declaran NO tener conocimientos de educación financiera (SERNAC)</span><span>53%</span></div>
            <div class="metric-bar-track"><div class="metric-bar-fill" style="width:53%"></div></div>
          </div>
          <div class="metric-bar-item">
            <div class="metric-bar-head"><span>Jóvenes que logran ahorrar regularmente (SERNAC)</span><span>44%</span></div>
            <div class="metric-bar-track"><div class="metric-bar-fill" style="width:44%"></div></div>
          </div>
          <div class="metric-bar-item">
            <div class="metric-bar-head"><span>Gastan más dinero del que perciben mensualmente</span><span>35%</span></div>
            <div class="metric-bar-track"><div class="metric-bar-fill" style="width:35%"></div></div>
          </div>
          <div class="metric-bar-item">
            <div class="metric-bar-head"><span>Han mantenido deudas o créditos activos (Sondeo INJUV)</span><span>30,1%</span></div>
            <div class="metric-bar-track"><div class="metric-bar-fill" style="width:30.1%"></div></div>
          </div>
          <div class="metric-bar-item">
            <div class="metric-bar-head"><span>Jóvenes de 18–24 años con deuda morosa (Informe CMF, junio 2025)</span><span>14,3%</span></div>
            <div class="metric-bar-track"><div class="metric-bar-fill" style="width:14.3%"></div></div>
          </div>
          <div class="timeline-stage-box" style="margin-top:16px;">
            <span class="ed-kicker" style="margin-bottom:4px;">PAUTA PRÁCTICA DEL ARTÍCULO (ENTREVISTA Y. WASAFF)</span>
            <h5 style="font-family:var(--font-title);font-size:0.98rem;color:var(--brown-dark);margin-bottom:6px;">Las 4 preguntas clave antes de utilizar una tarjeta o pedir un crédito:</h5>
            <p class="ed-caption" style="color:var(--ink-body);">1. ¿Realmente lo necesito? · 2. ¿Puedo pagarlo al contado? · 3. ¿Cuál será el costo total considerando intereses y CAE? · 4. ¿Podré pagar la cuota mensual sin afectar mis gastos básicos?</p>
          </div>
        </div>
      `;
    }

    if (infographicId === "cyberDefenseMatrix") {
      return `
        <div class="interactive-panel">
          <div class="panel-header-row">
            <span class="panel-badge">ESQUEMA INTERACTIVO DE CIBERSEGURIDAD · CAPÍTULOS 6.3 Y 6.4</span>
            <span class="panel-badge">IBM (2024) · WEF (2025) · ESET</span>
          </div>
          <h4 class="panel-title">Explorador de Amenazas Digitales y Herramientas de Protección</h4>
          <div class="timeline-pills">
            <button type="button" class="timeline-pill-btn active" data-cyber-tab="social">Ingeniería Social (Phishing / Vishing / Smishing)</button>
            <button type="button" class="timeline-pill-btn" data-cyber-tab="deepfake">IA y Deepfakes (Caso Arup USD 25M)</button>
            <button type="button" class="timeline-pill-btn" data-cyber-tab="malware">Ransomware (USD 4,91M) y Spyware</button>
            <button type="button" class="timeline-pill-btn" data-cyber-tab="defense">Defensa: SOC, Firewall, OSINT y Hacking Ético</button>
          </div>
          <div class="timeline-stage-box" id="cyber-matrix-box">
            <h5 style="font-family:var(--font-title);font-size:1.02rem;color:var(--brown-dark);margin-bottom:6px;">Ingeniería Social y Factor Humano</h5>
            <p class="ed-paragraph" style="margin-bottom:0;font-size:0.92rem;">El factor humano puede ser vulnerado mediante correos electrónicos engañosos (<strong>Phishing</strong>), llamadas telefónicas fraudulentas (<strong>Vishing</strong>) y mensajes de texto SMS con enlaces maliciosos (<strong>Smishing</strong>). La concientización del personal es indispensable.</p>
          </div>
        </div>
      `;
    }

    return "";
  }

  /* 4. Renderizador de Cuestionarios de Comprensión (Sección 11.E) */
  function renderQuizWidget(quizId, data) {
    const qz = data.quizzes && data.quizzes[quizId];
    if (!qz) return "";
    if (!quizState[quizId]) {
      quizState[quizId] = { answers: {} };
    }
    const st = quizState[quizId];

    const questionsHtml = qz.questions
      .map((qObj, qIdx) => {
        const chosen = st.answers[qIdx];
        const answered = typeof chosen === "number";
        const optsHtml = qObj.options
          .map((optText, oIdx) => {
            let cls = "quiz-option-btn";
            if (answered) {
              if (oIdx === qObj.correct) cls += " correct-choice";
              else if (oIdx === chosen && chosen !== qObj.correct) cls += " wrong-choice";
            }
            return `<button type="button" class="${cls}" data-quiz-id="${escapeHtml(quizId)}" data-q-idx="${qIdx}" data-o-idx="${oIdx}" ${answered ? "disabled" : ""}>${escapeHtml(optText)}</button>`;
          })
          .join("");

        return `
          <div class="quiz-q-card">
            <div class="quiz-q-title">${qIdx + 1}. ${escapeHtml(qObj.q)}</div>
            ${optsHtml}
            <div class="quiz-exp-box ${answered ? "visible" : ""}">
              ${answered ? `<strong>Retroalimentación académica:</strong> ${escapeHtml(qObj.explanation)}` : ""}
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
      <div class="interactive-panel quiz-widget" id="quiz-box-${escapeHtml(quizId)}">
        <div class="panel-header-row">
          <span class="panel-badge">CUESTIONARIO DE COMPRENSIÓN</span>
          <span class="panel-badge">${escapeHtml(qz.articleTitle)}</span>
        </div>
        <h4 class="panel-title">Actividad de Autoevaluación Académica</h4>
        ${questionsHtml}
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:16px;padding-top:12px;">
          <span style="font-family:var(--font-ui);font-size:0.86rem;font-weight:700;color:var(--brown-dark);">
            Resultado: ${correctCount} de ${totalQ} correctas (${answeredCount}/${totalQ} respondidas)
          </span>
          <button type="button" class="btn-editorial btn-outline btn-sm" data-quiz-reset="${escapeHtml(quizId)}">Reintentar cuestionario</button>
        </div>
      </div>
    `;
  }

  /* 5. Renderizador de Encuestas Temáticas (Sección 11.G) */
  function renderPollWidget(pollId, data) {
    const poll = data.polls && data.polls[pollId];
    if (!poll) return "";
    const userChoice = typeof pollVotes[pollId] === "number" ? pollVotes[pollId] : null;
    const hasVoted = userChoice !== null;

    const totalVotes =
      poll.options.reduce((acc, o) => acc + o.votes, 0) + (hasVoted ? 1 : 0);

    const optsHtml = poll.options
      .map((opt, idx) => {
        const vCount = opt.votes + (userChoice === idx ? 1 : 0);
        const pct = totalVotes > 0 ? Math.round((vCount / totalVotes) * 100) : 0;
        const isSel = userChoice === idx;
        return `
          <button type="button" class="poll-opt-btn ${isSel ? "selected" : ""}" data-poll-id="${escapeHtml(pollId)}" data-poll-opt="${idx}">
            <div class="poll-bar-bg" style="width:${hasVoted ? pct : 0}%"></div>
            <div class="poll-opt-content">
              <span>${escapeHtml(opt.label)} ${isSel ? "(Tu elección)" : ""}</span>
              <span style="font-weight:700;white-space:nowrap;">${hasVoted ? `${pct}% (${vCount})` : "Votar"}</span>
            </div>
          </button>
        `;
      })
      .join("");

    return `
      <div class="interactive-panel poll-widget" id="poll-box-${escapeHtml(pollId)}">
        <div class="panel-header-row">
          <span class="panel-badge">ENCUESTA DE REFLEXIÓN</span>
          <span class="panel-badge">${escapeHtml(poll.monograph)}</span>
        </div>
        <h4 class="panel-title">${escapeHtml(poll.question)}</h4>
        <div style="margin:12px 0;">${optsHtml}</div>
        <p class="ed-caption" style="font-size:0.76rem;margin-top:8px;">
          <em>Nota metodológica: ${escapeHtml(poll.note)}</em>
        </p>
      </div>
    `;
  }

  /* 6. Lightbox de Galería Fotográfica con Navegación Anterior / Siguiente */
  function openImageLightbox(src, title, caption, galleryArray) {
    const modal = document.getElementById("lightbox-modal");
    const img = document.getElementById("lightbox-img");
    const ttl = document.getElementById("lightbox-title");
    const cap = document.getElementById("lightbox-caption");
    const counter = document.getElementById("lightbox-counter");
    if (!modal || !img) return;

    if (Array.isArray(galleryArray) && galleryArray.length) {
      currentGalleryList = galleryArray;
      const foundIdx = galleryArray.findIndex((g) => g.src === src);
      currentGalleryIndex = foundIdx >= 0 ? foundIdx : 0;
    } else if (window.WebApp && window.WebApp.getData().gallery) {
      currentGalleryList = window.WebApp.getData().gallery;
      const foundIdx = currentGalleryList.findIndex((g) => g.src === src);
      if (foundIdx >= 0) {
        currentGalleryIndex = foundIdx;
      } else {
        currentGalleryList = [{ src, title: title || "Fotografía", caption: caption || "" }];
        currentGalleryIndex = 0;
      }
    }

    updateLightboxSlide();
    modal.classList.add("open");
  }

  function updateLightboxSlide() {
    if (!currentGalleryList.length) return;
    const item = currentGalleryList[currentGalleryIndex];
    const img = document.getElementById("lightbox-img");
    const ttl = document.getElementById("lightbox-title");
    const cap = document.getElementById("lightbox-caption");
    const counter = document.getElementById("lightbox-counter");
    if (img) img.src = item.src;
    if (ttl) ttl.textContent = item.title || "Fotografía del Documento Original";
    if (cap) cap.textContent = item.caption || "";
    if (counter) {
      counter.textContent = `${currentGalleryIndex + 1} / ${currentGalleryList.length}`;
    }
  }

  function stepLightbox(dir) {
    if (!currentGalleryList.length) return;
    currentGalleryIndex =
      (currentGalleryIndex + dir + currentGalleryList.length) % currentGalleryList.length;
    updateLightboxSlide();
  }

  /* 7. Modal de Video de YouTube con Pausa Automática de Música Ambiental */
  function openVideoModal(config) {
    const modal = document.getElementById("video-modal");
    const container = document.getElementById("video-iframe-container");
    const titleEl = document.getElementById("video-modal-title");
    const descEl = document.getElementById("video-modal-desc");
    const extLink = document.getElementById("video-modal-ext-link");

    if (!modal || !container) return;

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

    if (extLink) extLink.href = externalUrl;

    if (ytId) {
      container.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(ytId)}?autoplay=1&rel=0" title="${escapeHtml(config.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    } else {
      container.innerHTML = `
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px;text-align:center;color:#FCFAF7;">
          <p style="margin-bottom:16px;font-size:0.95rem;">Este recurso audiovisual puede visualizarse directamente en su fuente verificada o vincularse mediante ID de YouTube desde el Modo Editor.</p>
          <a href="${escapeHtml(externalUrl)}" target="_blank" rel="noopener noreferrer" class="btn-editorial btn-light">ABRIR EN YOUTUBE / FUENTE OFICIAL</a>
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

  /* 8. Listeners globales de interacción */
  function attachGlobalInteractionListeners(getDataFn) {
    document.addEventListener("click", (e) => {
      const data = getDataFn();

      // Lightbox de fotografías
      const figTrigger = e.target.closest("[data-lightbox-src]");
      if (figTrigger && !e.target.closest(".replace-img-btn")) {
        const src = figTrigger.getAttribute("data-lightbox-src");
        const title = figTrigger.getAttribute("data-lightbox-title") || "";
        const caption = figTrigger.getAttribute("data-lightbox-caption") || "";
        openImageLightbox(src, title, caption, data.gallery);
        return;
      }

      if (e.target.closest("#lightbox-prev-btn")) {
        stepLightbox(-1);
        return;
      }
      if (e.target.closest("#lightbox-next-btn")) {
        stepLightbox(1);
        return;
      }

      // Pestañas Resumen / Abstract bilingüe
      const absBtn = e.target.closest("[data-abstract-lang]");
      if (absBtn) {
        const card = absBtn.closest(".bilingual-abstract-card");
        if (card) {
          const lang = absBtn.getAttribute("data-abstract-lang");
          card.querySelectorAll("[data-abstract-lang]").forEach((b) => b.classList.toggle("active", b === absBtn));
          const esPane = card.querySelector(".abstract-pane-es");
          const enPane = card.querySelector(".abstract-pane-en");
          if (esPane && enPane) {
            esPane.style.display = lang === "es" ? "block" : "none";
            enPane.style.display = lang === "en" ? "block" : "none";
          }
        }
        return;
      }

      // Desplegables "LEER MÁS / DESCUBRIR MÁS"
      const expBtn = e.target.closest(".expandable-trigger");
      if (expBtn) {
        const sec = expBtn.closest(".expandable-section");
        if (sec) {
          const isOpen = sec.classList.toggle("open");
          const labelSpan = expBtn.querySelector(".exp-action-label");
          if (labelSpan) {
            labelSpan.textContent = isOpen ? "OCULTAR INFORMACIÓN −" : "LEER MÁS / DESCUBRIR MÁS +";
          }
        }
        return;
      }

      // Líneas de tiempo
      const tlBtn = e.target.closest("[data-timeline-id]");
      if (tlBtn) {
        const tlId = tlBtn.getAttribute("data-timeline-id");
        const idx = parseInt(tlBtn.getAttribute("data-step-index"), 10);
        const tl = data.timelines && data.timelines[tlId];
        if (tl && tl.events[idx]) {
          const ev = tl.events[idx];
          const widget = tlBtn.closest(".timeline-widget");
          if (widget) {
            widget.querySelectorAll(".timeline-pill-btn").forEach((b) => b.classList.toggle("active", b === tlBtn));
          }
          const detail = document.getElementById("tl-detail-" + tlId);
          if (detail) {
            detail.innerHTML = `
              <span class="ed-kicker" style="margin-bottom:4px;">${escapeHtml(ev.period)}</span>
              <h5 style="font-family:var(--font-title);font-size:1.05rem;color:var(--brown-dark);margin-bottom:6px;">${escapeHtml(ev.title)}</h5>
              <p class="ed-paragraph" style="margin-bottom:0;font-size:0.93rem;">${escapeHtml(ev.description)}</p>
            `;
          }
        }
        return;
      }

      // Esquema clínico de Psicopatía
      const psychBtn = e.target.closest("[data-psych-tab]");
      if (psychBtn) {
        const tab = psychBtn.getAttribute("data-psych-tab");
        const map = {
          subtipos: {
            t: "Psicopatía Primaria vs. Secundaria (Karpman, 1941)",
            d: "La <strong>psicopatía primaria</strong> se vincula a factores constitucionales, baja ansiedad y frialdad afectiva; la <strong>psicopatía secundaria</strong> se relaciona con traumas infantiles, adversidad familiar y mayor impulsividad."
          },
          empatia: {
            t: "Empatía Cognitiva vs. Empatía Afectiva (Cap. 3.3)",
            d: "Las personas con rasgos psicopáticos suelen conservar la <strong>empatía cognitiva</strong> (comprenden intelectualmente qué piensa otro, lo que facilita la manipulación), pero presentan déficits en la <strong>empatía afectiva</strong> (no resuenan emocionalmente con el sufrimiento ajeno)."
          },
          agresion: {
            t: "Agresión Instrumental vs. Agresión Reactiva (Cap. 3.2)",
            d: "La <strong>agresión instrumental</strong> es fría, planificada y orientada a un objetivo específico; la <strong>agresión reactiva</strong> surge como respuesta impulsiva inmediata ante una provocación o amenaza percibida."
          }
        };
        const parent = psychBtn.closest(".interactive-panel");
        if (parent) {
          parent.querySelectorAll("[data-psych-tab]").forEach((b) => b.classList.toggle("active", b === psychBtn));
        }
        const box = document.getElementById("psych-detail-box");
        if (box && map[tab]) {
          box.innerHTML = `
            <h5 style="font-family:var(--font-title);font-size:1rem;color:var(--brown-dark);margin-bottom:6px;">${escapeHtml(map[tab].t)}</h5>
            <p class="ed-paragraph" style="margin-bottom:0;font-size:0.9rem;">${map[tab].d}</p>
          `;
        }
        return;
      }

      // Modelo Ecológico de Bronfenbrenner
      const bronfBtn = e.target.closest("[data-bronf-level]");
      if (bronfBtn) {
        const level = bronfBtn.getAttribute("data-bronf-level");
        const map = {
          micro: {
            t: "1. Microsistema (Entorno inmediato y hogar)",
            d: "Relaciones y espacios que rodean activamente al cuidador: el trato diario con la persona con demencia, la convivencia en el núcleo familiar y las tareas directas de asistencia."
          },
          meso: {
            t: "2. Mesosistema (Interacción entre entornos cercanos)",
            d: "Relación entre la familia, los centros de salud, los profesionales médicos y el espacio laboral del cuidador. La corresponsabilidad familiar actúa como factor protector."
          },
          exo: {
            t: "3. Exosistema (Entornos indirectos e institucionales)",
            d: "Condiciones que afectan al cuidador aunque no participe directamente en ellas: acceso a farmacias populares, programas de apoyo municipal y servicios de salud."
          },
          macro: {
            t: "4. Macrosistema (Cultura, género y políticas públicas)",
            d: "Valores sociales y normas culturales en Chile, incluyendo la feminización del cuidado (84,8% de cuidadoras mujeres) y políticas como el Plan Nacional de Apoyos y Cuidados."
          },
          crono: {
            t: "5. Cronosistema (Evolución temporal y envejecimiento)",
            d: "Transformaciones con el paso del tiempo: el avance progresivo del deterioro cognitivo del paciente y el envejecimiento demográfico de Chile (Censo 1992–2024)."
          }
        };
        const parent = bronfBtn.closest(".interactive-panel");
        if (parent) {
          parent.querySelectorAll("[data-bronf-level]").forEach((b) => b.classList.toggle("active", b === bronfBtn));
        }
        const box = document.getElementById("bronf-detail-box");
        if (box && map[level]) {
          box.innerHTML = `
            <h5 style="font-family:var(--font-title);font-size:1.02rem;color:var(--brown-dark);margin-bottom:6px;">${escapeHtml(map[level].t)}</h5>
            <p class="ed-paragraph" style="margin-bottom:0;font-size:0.92rem;">${escapeHtml(map[level].d)}</p>
          `;
        }
        return;
      }

      // Matriz de Ciberseguridad
      const cyberBtn = e.target.closest("[data-cyber-tab]");
      if (cyberBtn) {
        const tab = cyberBtn.getAttribute("data-cyber-tab");
        const map = {
          social: {
            t: "Ingeniería Social y Factor Humano (Phishing, Vishing y Smishing)",
            d: "Explota el factor humano mediante correos fraudulentos (Phishing), llamadas telefónicas suplantando identidades (Vishing) y mensajes SMS con enlaces maliciosos (Smishing)."
          },
          deepfake: {
            t: "Inteligencia Artificial y Deepfakes (Casos Zelenski, Arup y Ferrari)",
            d: "En marzo de 2022 circuló un deepfake del presidente Zelenski; a comienzos de 2024, la firma Arup en Hong Kong sufrió un fraude de USD 25 millones mediante una videollamada con deepfakes."
          },
          malware: {
            t: "Malware, Ransomware (IBM: USD 4,91M) y Spyware (BonziBuddy)",
            d: "El ransomware cifra archivos o bloquea sistemas (como en BancoEstado en 2020; costo medio global de USD 4,91 millones según IBM 2024), mientras que el spyware recopila datos sin permiso."
          },
          defense: {
            t: "Arquitectura de Defensa: SOC, Firewall, Antivirus, Hacking Ético y OSINT",
            d: "Articula monitoreo mediante un Centro de Operaciones de Seguridad (SOC), filtrado de red (Firewall), pruebas autorizadas (Hacking Ético) e inteligencia de fuentes abiertas (OSINT)."
          }
        };
        const parent = cyberBtn.closest(".interactive-panel");
        if (parent) {
          parent.querySelectorAll("[data-cyber-tab]").forEach((b) => b.classList.toggle("active", b === cyberBtn));
        }
        const box = document.getElementById("cyber-matrix-box");
        if (box && map[tab]) {
          box.innerHTML = `
            <h5 style="font-family:var(--font-title);font-size:1.02rem;color:var(--brown-dark);margin-bottom:6px;">${escapeHtml(map[tab].t)}</h5>
            <p class="ed-paragraph" style="margin-bottom:0;font-size:0.92rem;">${escapeHtml(map[tab].d)}</p>
          `;
        }
        return;
      }

      // Entrevistas desplegables
      const ivBtn = e.target.closest("[data-interview-toggle]");
      if (ivBtn) {
        const key = ivBtn.getAttribute("data-interview-toggle");
        const panel = document.getElementById("iv-panel-" + key);
        if (panel) {
          const isOpen = panel.classList.toggle("open");
          ivBtn.classList.toggle("active", isOpen);
          const sign = ivBtn.querySelector(".acc-sign");
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
              <span class="ed-kicker">REGISTRO DOCUMENTAL DE ENTREVISTA</span>
              <h3 class="ed-title" style="font-size:1.5rem;margin-bottom:8px;">${escapeHtml(iv.title)}</h3>
              <p class="ed-caption" style="margin-bottom:8px;"><strong>Entrevistado(s):</strong> ${escapeHtml(iv.interviewee)} · ${escapeHtml(iv.role)}</p>
              <p class="ed-paragraph" style="font-size:0.92rem;margin-bottom:18px;">${escapeHtml(iv.context)}</p>
              ${iv.qa
                .map(
                  (item, i) => `
                <div style="background:var(--cream);border-left:4px solid var(--brown-medium);padding:14px 18px;margin-bottom:12px;border-radius:0 8px 8px 0;">
                  <div style="font-family:var(--font-title);font-weight:700;margin-bottom:6px;color:var(--brown-dark);">Pregunta ${i + 1}: ${escapeHtml(item.q)}</div>
                  <div style="font-size:0.93rem;line-height:1.65;color:var(--ink-body);">${escapeHtml(item.a)}</div>
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

      // Cuestionarios de comprensión
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

      // Encuestas interactivas (Polls)
      const pollBtn = e.target.closest("[data-poll-id]");
      if (pollBtn) {
        const pollId = pollBtn.getAttribute("data-poll-id");
        const optIdx = parseInt(pollBtn.getAttribute("data-poll-opt"), 10);
        pollVotes[pollId] = optIdx;
        try {
          localStorage.setItem(POLL_STORAGE_KEY, JSON.stringify(pollVotes));
        } catch (err) {}
        const container = document.getElementById("poll-box-" + pollId);
        if (container) {
          container.outerHTML = renderPollWidget(pollId, data);
        }
        return;
      }

      // Videos de YouTube
      const vidBtn = e.target.closest("[data-open-video]");
      if (vidBtn) {
        openVideoModal({
          youtubeId: vidBtn.getAttribute("data-yt-id") || "",
          title: vidBtn.getAttribute("data-vid-title") || "Recurso Audiovisual",
          description: vidBtn.getAttribute("data-vid-desc") || "",
          link: vidBtn.getAttribute("data-vid-link") || ""
        });
        return;
      }
    });
  }

  window.EditorialInteractions = {
    renderTimelineWidget,
    renderInterviewWidget,
    renderInfographicWidget,
    renderQuizWidget,
    renderPollWidget,
    openImageLightbox,
    stepLightbox,
    openVideoModal,
    closeVideoModal,
    attachGlobalInteractionListeners
  };
})();
