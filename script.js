// ================= B1: MENÚ DESPLEGABLE EN CELULARES =================
const menuToggle = document.getElementById('menu-toggle');
const navLinks = document.getElementById('nav-links');

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
}

// ================= B3: MOTOR FÍSICO 3D DEL GAFETE Y REFLEJO DE LUZ REALISTA =================
(function initLanyardPhysics() {
  const stage = document.getElementById('id-stage');
  const pivot = document.getElementById('id-pivot');
  const inner = document.getElementById('id-card-inner');
  const canvas = document.getElementById('lanyard-canvas');
  const glareFront = document.getElementById('glare-front');
  const glareBack = document.getElementById('glare-back');
  if (!stage || !pivot || !inner || !canvas) return;

  const ctx = canvas.getContext('2d');
  const cardWidth = 270;
  const offsetX = 200;
  const offsetY = 350;

  function resizeCanvas() {
    canvas.width = stage.offsetWidth + 400;
    canvas.height = stage.offsetHeight + 500;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const numNodes = 20;
  const anchorY = -350;
  const restCardY = 115;
  const ropeLength = (restCardY - 36) - anchorY;
  const segLen = ropeLength / (numNodes - 1);
  const nodes = [];

  let anchorX = stage.offsetWidth / 2;

  for (let i = 0; i < numNodes; i++) {
    const x = anchorX + (i / numNodes) * 25;
    const y = anchorY + i * segLen;
    nodes.push({ x, y, oldX: x, oldY: y });
  }

  let rotY = 0;
  let velRotY = 0;
  let rotZ = 0;
  let velRotZ = 0;
  let rotX = 0;
  let velRotX = 0;

  let isDragging = false;
  let dragTarget = { x: 0, y: 0 };
  let grabOffset = { x: 0, y: 0 };
  let prevMouse = { x: 0, y: 0 };
  let smoothMouseVel = { x: 0, y: 0 };

  function startDrag(clientX, clientY) {
    isDragging = true;
    const endNode = nodes[numNodes - 1];
    const rect = stage.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    grabOffset.x = localX - endNode.x;
    grabOffset.y = localY - endNode.y;
    dragTarget.x = endNode.x;
    dragTarget.y = endNode.y;

    prevMouse = { x: clientX, y: clientY };
    smoothMouseVel = { x: 0, y: 0 };
  }

  function moveDrag(clientX, clientY) {
    if (!isDragging) return;
    const rect = stage.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    const vx = clientX - prevMouse.x;
    const vy = clientY - prevMouse.y;
    smoothMouseVel.x = smoothMouseVel.x * 0.7 + vx * 0.3;
    smoothMouseVel.y = smoothMouseVel.y * 0.7 + vy * 0.3;

    const desiredX = localX - grabOffset.x;
    const desiredY = localY - grabOffset.y;
    const dx = desiredX - anchorX;
    const dy = desiredY - anchorY;
    const dist = Math.hypot(dx, dy);

    if (dist > ropeLength) {
      const extra = (dist - ropeLength) * 0.42;
      const angle = Math.atan2(dy, dx);
      dragTarget.x = anchorX + Math.cos(angle) * (ropeLength + extra);
      dragTarget.y = anchorY + Math.sin(angle) * (ropeLength + extra);
    } else {
      dragTarget.x = desiredX;
      dragTarget.y = desiredY;
    }

    prevMouse = { x: clientX, y: clientY };
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;

    const endNode = nodes[numNodes - 1];
    endNode.oldX = endNode.x - smoothMouseVel.x * 0.3;
    endNode.oldY = endNode.y - smoothMouseVel.y * 0.3;

    const pullDist = Math.hypot(endNode.x - anchorX, endNode.y - (anchorY + ropeLength));
    const dir = (endNode.x - anchorX) >= 0 ? -1 : 1;

    const gentleSpin = Math.min(3.0, pullDist * 0.016);
    velRotY = gentleSpin * dir;
  }

  pivot.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  });
  window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
  window.addEventListener('mouseup', endDrag);

  pivot.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const t = e.touches[0];
    moveDrag(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener('touchend', endDrag);

  function animate() {
    anchorX = stage.offsetWidth / 2;

    for (let i = 1; i < numNodes; i++) {
      const n = nodes[i];
      const isCardNode = (i === numNodes - 1);

      if (isCardNode && isDragging) {
        n.oldX = n.x;
        n.oldY = n.y;
        n.x += (dragTarget.x - n.x) * 0.35;
        n.y += (dragTarget.y - n.y) * 0.35;
        continue;
      }

      const damping = isCardNode ? 0.982 : 0.965;
      const vx = (n.x - n.oldX) * damping;
      const vy = (n.y - n.oldY) * damping;

      n.oldX = n.x;
      n.oldY = n.y;

      const gravity = isCardNode ? 0.42 : 0.22;
      n.x += vx;
      n.y += vy + gravity;
    }

    const endNode = nodes[numNodes - 1];
    const currentDist = Math.hypot(endNode.x - anchorX, endNode.y - anchorY);
    const dynamicSegLen = Math.max(segLen, currentDist / (numNodes - 1));
    const targetSeg = isDragging ? dynamicSegLen : segLen;

    for (let iter = 0; iter < 14; iter++) {
      nodes[0].x = anchorX;
      nodes[0].y = anchorY;

      for (let i = 0; i < numNodes - 1; i++) {
        const n1 = nodes[i];
        const n2 = nodes[i + 1];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const diff = (dist - targetSeg) / dist;
        const stiffness = 0.38;

        if (i === 0) {
          n2.x -= dx * diff * (stiffness * 2);
          n2.y -= dy * diff * (stiffness * 2);
        } else if (i === numNodes - 2 && isDragging) {
          n1.x += dx * diff * (stiffness * 2);
          n1.y += dy * diff * (stiffness * 2);
        } else if (i === numNodes - 2) {
          n1.x += dx * diff * 0.75;
          n1.y += dy * diff * 0.75;
          n2.x -= dx * diff * 0.25;
          n2.y -= dy * diff * 0.25;
        } else {
          n1.x += dx * diff * stiffness;
          n1.y += dy * diff * stiffness;
          n2.x -= dx * diff * stiffness;
          n2.y -= dy * diff * stiffness;
        }
      }
    }

    const cardVx = endNode.x - endNode.oldX;
    const cardVy = endNode.y - endNode.oldY;
    const prevNode = nodes[numNodes - 4];
    const ropeAngle = Math.atan2(endNode.x - prevNode.x, Math.max(20, endNode.y - prevNode.y)) * (180 / Math.PI);

    if (isDragging) {
      const targetZ = Math.max(-25, Math.min(25, -ropeAngle * 0.45));
      rotZ += (targetZ - rotZ) * 0.12;
      rotX += (Math.max(-18, Math.min(18, cardVy * 0.7)) - rotX) * 0.12;

      velRotY = 0;
      rotY += (0 - rotY) * 0.08;
    } else {
      const desiredRotZ = Math.max(-30, Math.min(30, -ropeAngle * 0.55 - cardVx * 0.65));
      velRotZ = (velRotZ + (desiredRotZ - rotZ) * 0.04) * 0.88;
      rotZ += velRotZ;

      const desiredRotX = Math.max(-18, Math.min(18, cardVy * 0.8));
      velRotX = (velRotX + (desiredRotX - rotX) * 0.04) * 0.88;
      rotX += velRotX;

      velRotY += (-rotY * 0.0028) + (cardVx * 0.022);
      velRotY *= 0.94;
      velRotY = Math.max(-3.2, Math.min(3.2, velRotY));
      rotY += velRotY;
    }

    const radZ = rotZ * Math.PI / 180;
    const cardTopX = endNode.x - Math.sin(radZ) * 36;
    const cardTopY = endNode.y + Math.cos(radZ) * 36;

    pivot.style.left = `${cardTopX - cardWidth / 2}px`;
    pivot.style.top = `${cardTopY}px`;
    inner.style.transform = `rotateZ(${rotZ.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;

    const tiltMagnitude = Math.hypot(rotY * 1.3, rotX * 1.6, rotZ * 0.9);
    const glareOpacity = Math.min(0.78, Math.max(0, (tiltMagnitude - 1.5) / 26));
    const lightPosX = 50 + (rotY * 1.8) + (rotZ * 0.9);

    const dynamicLightBg = `linear-gradient(${115 + rotZ}deg, 
      rgba(255,255,255,0) ${Math.max(0, lightPosX - 45)}%, 
      rgba(255,255,255,0.68) ${lightPosX}%, 
      rgba(235,248,255,0.85) ${lightPosX + 6}%, 
      rgba(255,255,255,0) ${Math.min(100, lightPosX + 45)}%)`;

    if (glareFront) {
      glareFront.style.opacity = glareOpacity.toFixed(3);
      glareFront.style.background = dynamicLightBg;
    }
    if (glareBack) {
      glareBack.style.opacity = glareOpacity.toFixed(3);
      glareBack.style.background = dynamicLightBg;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(nodes[0].x + offsetX, nodes[0].y + offsetY);

    for (let i = 1; i < numNodes - 1; i++) {
      const xc = (nodes[i].x + nodes[i + 1].x) / 2 + offsetX;
      const yc = (nodes[i].y + nodes[i + 1].y) / 2 + offsetY;
      ctx.quadraticCurveTo(nodes[i].x + offsetX, nodes[i].y + offsetY, xc, yc);
    }

    ctx.lineTo(endNode.x + offsetX, endNode.y + offsetY);

    ctx.lineWidth = 24;
    ctx.strokeStyle = '#141218';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.lineWidth = 18;
    ctx.strokeStyle = '#1e1b24';
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const labelNodes = [10, 13, 16, 18];
    for (const idx of labelNodes) {
      const p1 = nodes[idx - 1];
      const p2 = nodes[idx + 1];
      const n = nodes[idx];
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

      ctx.save();
      ctx.translate(n.x + offsetX, n.y + offsetY);
      ctx.rotate(angle);
      ctx.fillText('ID CARD', 0, 0);
      ctx.restore();
    }
    ctx.restore();

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();

// ================= C3: FILTRADO DINÁMICO DE SKILLS & HERRAMIENTAS =================
const filterBtns = document.querySelectorAll('.filter-btn');
const skillCards = document.querySelectorAll('.skill-card');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filterValue = btn.getAttribute('data-filter');

    skillCards.forEach(card => {
      const category = card.getAttribute('data-category');
      if (filterValue === 'all' || filterValue === category) {
        card.classList.remove('hide');
      } else {
        card.classList.add('hide');
      }
    });
  });
});

// ================= D1: FILTRADO DINÁMICO DE CATEGORÍAS DEL PORTAFOLIO =================
const portFilterBtns = document.querySelectorAll('.port-filter-btn');
const projectCards = document.querySelectorAll('.project-card');

portFilterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    portFilterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.getAttribute('data-port-filter');

    projectCards.forEach(card => {
      const category = card.getAttribute('data-port-category');
      if (filter === 'all' || filter === category) {
        card.classList.remove('hide');
      } else {
        card.classList.add('hide');
      }
    });
  });
});

// ================= D5: VENTANA EMERGENTE (MODAL) DE DETALLE DE PROYECTOS =================
const projectsData = {
  uiux: {
    category: "DISEÑO UI/UX & PROTOTIPADO",
    title: "Plantillas & Sistemas de Diseño en Figma",
    desc: "Diseño de interfaces intuitivas, prototipos interactivos y experiencia de usuario (UI/UX).",
    overview: "Proyectos de diseño de interfaces enfocados en usabilidad, estética limpia y arquitectura de información.",
    problem: "Crear flujos digitales claros y atractivos antes de la etapa de programación.",
    solution: "Prototipado en Figma con componentes reutilizables y guías de estilo modernas.",
    tools: ["Figma", "UI/UX Design", "Wireframing", "Prototyping"],
    downloadHtml: `<a href="#contacto" onclick="closeProjectModal()" class="btn primary"><i class="ri-layout-masonry-line"></i> Solicitar Acceso a Prototipos</a>`,
    gallery: []
  },
  web: {
    category: "DESARROLLO WEB & CMS",
    title: "Creación de Sitios Web (WordPress & VS Code)",
    desc: "Páginas web responsivas, modernas y optimizadas.",
    overview: "Desarrollo de portales web combinando gestores de contenido como WordPress y código propio en Visual Studio Code.",
    problem: "Lograr presencia web profesional adaptable a móviles y fácil de administrar.",
    solution: "Maquetación estructurada con HTML5, CSS3, JavaScript y WordPress.",
    tools: ["WordPress", "Visual Studio Code", "HTML5", "CSS3", "JavaScript"],
    downloadHtml: `<a href="https://github.com/Aleja-robles" target="_blank" class="btn primary"><i class="ri-github-line"></i> Ver Código en GitHub</a>`,
    gallery: []
  },
  app1: {
    category: "APLICACIÓN MÓVIL ANDROID #1",
    title: "Kivys App — Aplicación Nativa Android",
    desc: "Aplicación móvil completamente funcional desarrollada en Android Studio, lista para descargar e instalar.",
    overview: "Kivys es una aplicación nativa compilada en Android Studio con interfaz móvil intuitiva.",
    problem: "Ofrecer una experiencia móvil fluida y funcional directamente en dispositivos Android.",
    solution: "Desarrollo íntegro en Android Studio y empaquetado en instalador directo .APK.",
    tools: ["Android Studio", "Android APK", "UI Mobile"],
    downloadHtml: `<a href="assets/files/apk/kivys.apk" download class="btn primary"><i class="ri-android-fill"></i> Descargar kivys.apk</a>`,
    gallery: []
  },
  app2: {
    category: "APLICACIÓN MÓVIL ANDROID #2",
    title: "Segunda Aplicación Móvil (Android Studio)",
    desc: "Segunda aplicación funcional desarrollada en Android Studio.",
    overview: "Aplicación nativa con arquitectura optimizada y pantallas diseñadas para una navegación sencilla.",
    problem: "Resolver necesidades prácticas desde el teléfono con rapidez y buen diseño.",
    solution: "Implementación de vistas e interacción en Android Studio con archivo .APK instalable.",
    tools: ["Android Studio", "Kotlin / Java", "Mobile UX"],
    downloadHtml: `<a href="assets/files/apk/app-debug.apk" download class="btn primary"><i class="ri-android-fill"></i> Descargar Segunda App (.APK)</a>`,
    gallery: []
  },
  blender: {
    category: "MODELADO, RIGGING Y ANIMACIÓN 3D",
    title: "Colección de Proyectos 3D en Blender",
    desc: "Modelado 3D, rigging facial y corporal, ciclos de caminata y secuencias de animación descargables en formato nativo .blend.",
    overview: "Repertorio completo de modelos y animaciones creadas en Blender: desde rigging facial y personajes (Rapunzel, Mujer Caras) hasta ciclos de movimiento y combate zombie.",
    problem: "Dar vida, estructura ósea (rigging) y movimiento fluido a modelos tridimensionales.",
    solution: "Modelado, texturizado, rigging avanzado y animación por keyframes en Blender.",
    tools: ["Blender 3D", "Rigging Facial", "Animación 3D", "Render JPG/MP4"],
    downloadHtml: `
      <a href="assets/files/blender/Aleja_presentacion.blend" download class="btn primary btn-sm"><i class="ri-download-2-line"></i> Presentación.blend</a>
      <a href="assets/files/blender/base_rigging_facial.blend" download class="btn secondary btn-sm"><i class="ri-download-2-line"></i> Rigging Facial.blend</a>
      <a href="assets/files/blender/rapunzel.blend" download class="btn secondary btn-sm"><i class="ri-download-2-line"></i> Rapunzel.blend</a>
      <a href="assets/files/blender/Mujer_caras.blend" download class="btn secondary btn-sm"><i class="ri-download-2-line"></i> Mujer Caras.blend</a>
      <a href="assets/files/blender/martillo.blend" download class="btn secondary btn-sm"><i class="ri-download-2-line"></i> Martillo.blend</a>
      <a href="assets/files/blender/ball_legs.blend" download class="btn secondary btn-sm"><i class="ri-download-2-line"></i> Ball Legs.blend</a>
      <a href="assets/files/blender/caminata_aleja_robles.blend" download class="btn secondary btn-sm"><i class="ri-download-2-line"></i> Caminata Aleja.blend</a>
      <a href="assets/files/blender/Caminata_zombie_aleja.blend" download class="btn secondary btn-sm"><i class="ri-download-2-line"></i> Caminata Zombie.blend</a>
      <a href="assets/files/blender/Correr_zombie_aleja.blend" download class="btn secondary btn-sm"><i class="ri-download-2-line"></i> Correr Zombie.blend</a>
      <a href="assets/files/blender/Saltar_zombie_aleja.blend" download class="btn secondary btn-sm"><i class="ri-download-2-line"></i> Saltar Zombie.blend</a>
      <a href="assets/files/blender/Pelea_zombie_aleja.blend" download class="btn secondary btn-sm"><i class="ri-download-2-line"></i> Pelea Zombie.blend</a>
      <a href="assets/files/blender/Muerte_zombie_aleja.blend" download class="btn secondary btn-sm"><i class="ri-download-2-line"></i> Muerte Zombie.blend</a>
      <a href="assets/files/blender/stand_zombie_aleja.blend" download class="btn secondary btn-sm"><i class="ri-download-2-line"></i> Stand Zombie.blend</a>
    `,
    gallery: [
      "assets/img/blender/modelado.jpg",
    ]
  },
  marketing: {
    category: "MARKETING DIGITAL, FLYERS & MODELAJE",
    title: "Publicidad Comercial & Book de Modelaje (Vestidos Jessi)",
    desc: "Diseño de flyers promocionales para empresa de carrozas y sesiones fotográficas como modelo comercial.",
    overview: "Combinación de diseño gráfico publicitario para marcas y modelaje comercial frente a cámara.",
    problem: "Comunicar visualmente la esencia de cada marca y evento con piezas gráficas llamativas.",
    solution: "Creación de flyers en Photoshop, Illustrator y Canva, y dirección de modelaje editorial y comercial.",
    tools: ["Photoshop", "Illustrator", "Canva", "Marketing Digital", "Modelaje"],
    downloadHtml: ``,
    gallery: [
      "assets/img/flyers/flayer.png",
      "assets/img/flyers/flayer2.png",
      "assets/img/flyers/flayer3.png",
      "assets/img/flyers/flayer4.png",
      "assets/img/flyers/flayer5.png",
      "assets/img/flyers/flayer6.png",
      "assets/img/modelaje/modelaje.jpg",
      "assets/img/modelaje/modelaje2.jpg",
      "assets/img/modelaje/modelaje3.jpg",
      "assets/img/modelaje/Vestidosjessi_1.jpg",
      "assets/img/modelaje/Vestidosjessi_2.jpg",
      "assets/img/modelaje/Vestidosjessi_6.jpg",
      "assets/img/modelaje/Vestidosjessi_13.jpg",
      "assets/img/modelaje/Vestidosjessi_16.jpg",
      "assets/img/modelaje/Vestidosjessi_24.jpg",
      "assets/img/modelaje/Vestidosjessi_28.jpg",
      "assets/img/modelaje/Vestidosjessi_29.jpg",
    ]
  },
  audiovisual: {
    category: "FOTOGRAFÍA COMERCIAL, EDICIÓN & CORTOMETRAJE",
    title: "Dirección Fotográfica, Edición & Cortometraje",
    desc: "Sesiones fotográficas y edición profesional (Calzado Bela, Fisioterapia, Producto, Conceptual) y producción de cortometraje.",
    overview: "Muestra de fotografía comercial de producto, sesiones de fisioterapia, fotografía conceptual y realización audiovisual.",
    problem: "Resaltar las cualidades de cada producto y transmitir emociones a través de la iluminación y el retoque digital.",
    solution: "Captura fotográfica cuidada y posproducción en Photoshop, Premiere Pro, After Effects y CapCut.",
    tools: ["Fotografía", "Photoshop", "Premiere Pro", "After Effects", "CapCut"],
    downloadHtml: ``,
    gallery: [
      "assets/img/fotografia/bela.jpg",
      "assets/img/fotografia/bela2.jpg",
      "assets/img/fotografia/bela3.jpg",
      "assets/img/fotografia/bela4.jpg",
      "assets/img/fotografia/bela5.jpg",
      "assets/img/fotografia/bela6.jpg",
      "assets/img/fotografia/fisio.jpg",
      "assets/img/fotografia/fisio2.jpg",
      "assets/img/fotografia/fisio3.jpg",
      "assets/img/fotografia/fisio4.jpg",
      "assets/img/fotografia/fisio5.jpg",
      "assets/img/fotografia/fisio6.jpg",
      "assets/img/fotografia/fisio7.jpg",
      "assets/img/fotografia/cafe.jpg",
      "assets/img/fotografia/producto.jpg",
      "assets/img/fotografia/soda.jpg",
      "assets/img/fotografia/soda2.jpg",
      "assets/img/fotografia/emocion1.jpg",
      "assets/img/fotografia/emocion2.jpg",
      "assets/img/fotografia/Atropos.jpg",
      "assets/img/blender/calabera.jpg"
    ]
  }
};

function openProjectModal(projectId) {
  const data = projectsData[projectId];
  const modal = document.getElementById('project-modal');
  const body = document.getElementById('modal-dynamic-body');

  if (!data || !modal || !body) return;

  const galleryHtml = data.gallery && data.gallery.length > 0
    ? `<h4 style="margin: 1.5rem 0 0.6rem; color:var(--text-primary);">Galería Visual (${data.gallery.length} archivos):</h4>
       <div class="modal-gallery">
         ${data.gallery.map(img => `<a href="${img}" target="_blank"><img src="${img}" alt="Vista previa" loading="lazy"></a>`).join('')}
       </div>`
    : '';

  body.innerHTML = `
    <span class="section-subtitle">${data.category}</span>
    <h2 class="section-title" style="margin-bottom:0.5rem;">${data.title}</h2>
    <p style="color:var(--text-secondary); margin-bottom:1.2rem;">${data.desc}</p>
    <div style="display:flex; gap:0.6rem; flex-wrap:wrap; margin-bottom:1.5rem;">
      ${data.downloadHtml}
    </div>
    <div class="modal-grid-boxes">
      <div class="modal-info-box">
        <h4><i class="ri-eye-line"></i> Overview</h4>
        <p>${data.overview}</p>
      </div>
      <div class="modal-info-box">
        <h4><i class="ri-error-warning-line"></i> El Reto</h4>
        <p>${data.problem}</p>
      </div>
      <div class="modal-info-box">
        <h4><i class="ri-lightbulb-flash-line"></i> Solución</h4>
        <p>${data.solution}</p>
      </div>
    </div>
    <h4 style="margin: 1.2rem 0 0.6rem; color:var(--text-primary);">Herramientas utilizadas:</h4>
    <div class="project-tags">
      ${data.tools.map(t => `<span>${t}</span>`).join('')}
    </div>
    ${galleryHtml}
  `;

  modal.classList.add('open');
}

function closeProjectModal() {
  const modal = document.getElementById('project-modal');
  if (modal) {
    modal.classList.remove('open');
  }
}

// Cerrar el modal si el usuario hace clic en el fondo oscuro fuera de la tarjeta
const projectModalOverlay = document.getElementById('project-modal');
if (projectModalOverlay) {
  projectModalOverlay.addEventListener('click', (e) => {
    if (e.target === projectModalOverlay) {
      closeProjectModal();
    }
  });
}