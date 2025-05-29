// --- CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBxd0CXGNiOyKpg97Wil2EYStO_7Q6Dfak",
  authDomain: "informes-uci.firebaseapp.com",
  projectId: "informes-uci",
  storageBucket: "informes-uci.firebasestorage.app",
  messagingSenderId: "448318328600",
  appId: "1:448318328600:web:5c7d6874e487764aefd86d",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUserId = null;

auth.onAuthStateChanged(async (user) => {
  const contenidoApp = document.getElementById("contenidoApp");

  if (!user) {
    console.warn("Acceso denegado: Usuario no autenticado.");
    window.location.href = "index.html"; // Redirige al login
  } else {
    currentUserId = user.uid;
    console.log("Usuario autenticado. UID:", currentUserId);
    await cargarListadoInformesGuardados();
    contenidoApp.style.display = "block"; // Mostrar contenido seguro
  }
});
// --- FIN CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE ---

// Variables globales
const hoy = new Date().toISOString().slice(0, 10);
let selectedBox = null;
// Ya no se necesita choicesSelect como variable global para la instancia de Choices.js

const campos = [
  "neurologico",
  "cardiovascular",
  "respiratorio",
  "renal",
  "gastrointestinal",
  "nutricional",
  "termorregulacion",
  "piel",
  "otros",
  "especial",
];

const originalLabelTexts = {
  neurologico: "1. NEUROLÓGICO",
  cardiovascular: "2. CARDIOVASCULAR",
  respiratorio: "3. RESPIRATORIO",
  renal: "4. RENAL",
  gastrointestinal: "5. GASTROINTESTINAL",
  nutricional: "6. NUTRICIONAL/METABÓLICO",
  termorregulacion: "7. TERMORREGULACIÓN",
  piel: "8. PIEL",
  otros: "9. OTROS",
  especial: "10. ESPECIAL VIGILANCIA",
};

const TOTAL_CARACTERES = 1200;

// Global variable to hold the timeout ID for hiding the copy button
let hideCopyButtonTimeout;

async function guardarDraftDiario() {
  if (!selectedBox || !currentUserId || !db) {
    console.warn(
      "No se puede guardar el borrador: Box no seleccionado, usuario no autenticado, o Firebase no inicializado correctamente."
    );
    return;
  }

  const datos = {};
  campos.forEach((campo) => {
    datos[campo] = document.getElementById(campo).value || "";
  });

  datos.fecha = hoy;
  datos.timestamp = new Date().toISOString();
  datos.box = selectedBox;
  datos.userId = currentUserId;

  try {
    const userDraftsCollection = db
      .collection("users")
      .doc(currentUserId)
      .collection("drafts");
    const draftDocId = `draft_box_${selectedBox}_${hoy}`;

    await userDraftsCollection.doc(draftDocId).set(datos, { merge: true });
  } catch (e) {
    console.error("Error al guardar el borrador diario: ", e);
  }
  actualizarContadorGlobal();

  // Ocultar el botón de copiar si se modifica un textarea
  const copiarBtn = document.getElementById("copiarInformeBtn");
  if (copiarBtn) {
    copiarBtn.style.display = "none";
  }
}

async function cargarDatos() {
  if (!selectedBox || !currentUserId || !db) {
    console.warn(
      "No se pueden cargar los datos: Box no seleccionado, usuario no autenticado, o Firebase no inicializado. Limpiando campos."
    );
    campos.forEach((campo) => {
      document.getElementById(campo).value = "";
    });
    actualizarContadorGlobal();
    return;
  }

  try {
    const draftDocId = `draft_box_${selectedBox}_${hoy}`;
    const docRef = db
      .collection("users")
      .doc(currentUserId)
      .collection("drafts")
      .doc(draftDocId);
    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data();
      campos.forEach((campo) => {
        document.getElementById(campo).value = data[campo] || "";
      });
      console.log("Borrador cargado exitosamente para Box:", selectedBox);
    } else {
      console.log("No hay borrador guardado para Box:", selectedBox);
      campos.forEach((campo) => {
        document.getElementById(campo).value = "";
      });
    }
    actualizarContadorGlobal();
  } catch (e) {
    console.error("Error al cargar el borrador: ", e);
    mostrarMensaje(
      "Error al cargar los datos del borrador. Revise la consola para más detalles."
    );
    campos.forEach((campo) => {
      document.getElementById(campo).value = "";
    });
    actualizarContadorGlobal();
  }
}

async function generarInforme() {
  if (!selectedBox) {
    mostrarMensaje("Por favor, seleccione un Box antes de generar el informe.");
    return;
  }
  if (!currentUserId || !db) {
    mostrarMensaje(
      "Usuario no autenticado o Firebase no inicializado correctamente."
    );
    return;
  }

  const datos = {};
  campos.forEach((campo) => {
    datos[campo] = document.getElementById(campo).value || "";
  });

  const isAnyFieldFilled = campos.some((campo) => datos[campo].trim() !== "");
  if (!isAnyFieldFilled) {
    mostrarMensaje(
      "El informe está vacío. Por favor, rellene al menos un campo antes de generar."
    );
    return;
  }

  datos.fecha = hoy;
  datos.timestamp = new Date().toISOString();
  datos.box = selectedBox;
  datos.userId = currentUserId;

  try {
    const userInformesCollection = db
      .collection("users")
      .doc(currentUserId)
      .collection("informesEnfermeria");

    const docRef = await userInformesCollection.add(datos);
    console.log("Informe generado y guardado con ID: ", docRef.id);

    cargarListadoInformesGuardados();

    const fechaHoraGuardado = new Date(datos.timestamp).toLocaleDateString(
      "es-ES",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );
    mostrarMensajeTemporal(
      `Informe guardado: Box ${selectedBox} - ${fechaHoraGuardado}`
    );
  } catch (e) {
    console.error("Error al generar y guardar el informe: ", e);
    mostrarMensaje(
      "Error al generar y guardar el informe. Por favor, intente de nuevo."
    );
    return;
  }

  const horaActual = new Date().getHours();
  const esTurnoDiurno = horaActual >= 8 && horaActual < 20;
  const turnoTexto = esTurnoDiurno
    ? "Turno de 8 a 20 horas"
    : "Turno de 20 a 8 horas";

  const resultadoDiv = document.getElementById("resultado");
  resultadoDiv.innerHTML =
    `<p><strong>BOX ${selectedBox} - ${turnoTexto}</strong></p>` +
    campos
      .map((campo) => {
        const valor = datos[campo].trim();
        const contenido =
          valor === ""
            ? "<span class='no-especificado'>No Especificado</span>"
            : valor;
        const campoFormateado =
          campo === "especial"
            ? "ESPECIAL VIGILANCIA"
            : originalLabelTexts[campo].substring(
                originalLabelTexts[campo].indexOf(" ") + 1
              );
        return `<p><strong>${campoFormateado}:</strong> ${contenido}</p>`;
      })
      .join("");

  resultadoDiv.classList.remove("diurno-print", "nocturno-print");
  resultadoDiv.classList.add(esTurnoDiurno ? "diurno-print" : "nocturno-print");
  resultadoDiv.style.display = "block";

  document.getElementById(
    "mensaje-turno"
  ).textContent = `Turno seleccionado: ${turnoTexto}`;
  document.getElementById("mensaje-turno").style.display = "block";

  // Mostrar el botón de copiar informe
  const copiarBtn = document.getElementById("copiarInformeBtn");
  // Solo mostrar si no estamos en móvil (ya que en móvil está oculto por CSS)
  if (window.innerWidth > 768) {
    copiarBtn.style.display = "inline-block";
  }
  copiarBtn.innerHTML = '<i class="fas fa-copy"></i> Copiar Informe'; // Reset text
  copiarBtn.disabled = false;
}

function copiarInforme() {
  if (!selectedBox) return;

  const horaActual = new Date().getHours();
  const esTurnoDiurno = horaActual >= 8 && horaActual < 20;
  const turnoTexto = esTurnoDiurno
    ? "Turno de 8 a 20 horas"
    : "Turno de 20 a 8 horas";

  let texto = `BOX ${selectedBox} - ${turnoTexto}\n`;

  campos.forEach((campo) => {
    const valor =
      document.getElementById(campo).value.trim() || "No Especificado";
    const titulo =
      campo === "especial"
        ? "ESPECIAL VIGILANCIA"
        : originalLabelTexts[campo].substring(
            originalLabelTexts[campo].indexOf(" ") + 1
          );
    texto += `${titulo}: ${valor}\n`;
  });

  navigator.clipboard
    .writeText(texto)
    .then(() => {
      const boton = document.getElementById("copiarInformeBtn");
      boton.innerHTML = "✅ Copiado";
      boton.disabled = true;

      // El botón se ocultará solo si se modifica un textarea, no automáticamente
      setTimeout(() => {
        boton.innerHTML = '<i class="fas fa-copy"></i> Copiar Informe';
        boton.disabled = false;
      }, 2000); // Reset text after 2 seconds
    })
    .catch((err) => {
      console.error("Error al copiar el texto: ", err);
      // Fallback para navegadores que no soportan navigator.clipboard
      const textarea = document.createElement("textarea");
      textarea.value = texto;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);

      const boton = document.getElementById("copiarInformeBtn");
      boton.innerHTML = "✅ Copiado (fallback)";
      boton.disabled = true;

      setTimeout(() => {
        boton.innerHTML = '<i class="fas fa-copy"></i> Copiar Informe';
        boton.disabled = false;
      }, 2000); // Reset text after 2 seconds
    });
}

function imprimirAuto() {
  if (!selectedBox) {
    mostrarMensaje("Seleccione un Box antes de imprimir.");
    return;
  }
  generarInforme();
  const resultadoDiv = document.getElementById("resultado");
  resultadoDiv.style.display = "block";
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      resultadoDiv.style.display = "none";
      document.getElementById("mensaje-turno").style.display = "none";
      document.getElementById("copiarInformeBtn").style.display = "none";
    }, 500);
  }, 100);
}

function imprimirAlternativo() {
  if (!selectedBox) {
    mostrarMensaje("Seleccione un Box antes de imprimir en turno alternativo.");
    return;
  }

  const datosActuales = {};
  campos.forEach((campo) => {
    datosActuales[campo] = document.getElementById(campo).value || "";
  });

  const horaActual = new Date().getHours();
  const esTurnoDiurno = horaActual >= 8 && horaActual < 20;
  const turnoTextoActual = esTurnoDiurno
    ? "Turno de 8 a 20 horas"
    : "Turno de 20 a 8 horas";

  const resultadoDiv = document.getElementById("resultado");
  resultadoDiv.style.display = "block";

  const turnoAlternativoTexto = esTurnoDiurno
    ? "Turno de 20 a 8 horas"
    : "Turno de 8 a 20 horas";

  const encabezadoAlternativo = `<p><strong>BOX ${selectedBox} - ${turnoAlternativoTexto}</strong></p>`;
  const cuerpoAlternativo = campos
    .map((campo) => {
      const valor = datosActuales[campo].trim();
      const contenido =
        valor === ""
          ? "<span class='no-especificado'>No Especificado</span>"
          : valor;
      const campoFormateado =
        campo === "especial"
          ? "ESPECIAL VIGILANCIA"
          : originalLabelTexts[campo].substring(
              originalLabelTexts[campo].indexOf(" ") + 1
            );
      return `<p><strong>${campoFormateado}:</strong> ${contenido}</p>`;
    })
    .join("");

  resultadoDiv.innerHTML = encabezadoAlternativo + cuerpoAlternativo;

  resultadoDiv.classList.remove("diurno-print", "nocturno-print");
  resultadoDiv.classList.add(esTurnoDiurno ? "nocturno-print" : "diurno-print");

  document.getElementById(
    "mensaje-turno"
  ).textContent = `Imprimiendo para: ${turnoAlternativoTexto}`;
  document.getElementById("mensaje-turno").style.display = "block";

  setTimeout(() => {
    window.print();
    setTimeout(() => {
      resultadoDiv.style.display = "none";
      document.getElementById("mensaje-turno").style.display = "none";
      document.getElementById("copiarInformeBtn").style.display = "none";
    }, 500);
  }, 100);
}

async function borrarDatos() {
  if (!selectedBox || !currentUserId || !db) {
    mostrarMensaje(
      "Por favor, seleccione un Box y asegúrese de estar autenticado para borrar sus datos."
    );
    return;
  }

  if (
    !confirm(
      `¿Desea borrar el borrador diario del Box ${selectedBox} para HOY? Esta acción es solo para el borrador, no para los informes generados.`
    )
  )
    return;

  try {
    const userDraftsCollection = db
      .collection("users")
      .doc(currentUserId)
      .collection("drafts");
    const draftDocId = `draft_box_${selectedBox}_${hoy}`;

    await userDraftsCollection.doc(draftDocId).delete();

    mostrarMensajeTemporal("Borrador diario borrado de Firebase.");
    campos.forEach((campo) => {
      document.getElementById(campo).value = "";
    });
    actualizarContadorGlobal();
    document.getElementById("mensaje-turno").style.display = "none";
  } catch (error) {
    console.error("Error al borrar el borrador diario: ", error);
    mostrarMensaje(
      "Error al borrar el borrador diario. Por favor, intente de nuevo."
    );
  }
}

function deshabilitarCampos() {
  campos.forEach((campo) => {
    const textarea = document.getElementById(campo);
    const label = document.querySelector(`label[for="${campo}"]`);
    if (textarea) {
      textarea.disabled = true;
      textarea.placeholder = "Seleccione un Box primero";
    }
    if (label && originalLabelTexts[campo]) {
      label.textContent = originalLabelTexts[campo];
    }
  });
}

function habilitarCampos() {
  campos.forEach((campo) => {
    const textarea = document.getElementById(campo);
    const label = document.querySelector(`label[for="${campo}"]`);
    if (textarea) {
      textarea.disabled = false;
      textarea.placeholder = "";
    }
    if (label && originalLabelTexts[campo]) {
      label.textContent = `Box-${selectedBox} -- ${originalLabelTexts[campo]}`;
    }
  });
}

function actualizarContadorGlobal() {
  let total = 0;
  campos.forEach((campo) => {
    const valor = document.getElementById(campo)?.value || "";
    total += valor.length;
  });
  document.getElementById("contador-total").textContent = total;

  const div = document.querySelector(".contador-global");

  div.classList.remove("contador-aviso", "contador-alerta");

  if (total >= 1200) {
    if (!document.getElementById("aviso-1200")) {
      const aviso = document.createElement("div");
      aviso.id = "aviso-1200";
      aviso.innerHTML =
        "⚠️ <strong>ATENCIÓN:</strong> Ha rellenado la mitad del documento.";
      const contenedorBox = document.getElementById("boxSelector");
      contenedorBox.insertAdjacentElement("afterend", aviso);
    }
  } else {
    const avisoExistente = document.getElementById("aviso-1200");
    if (avisoExistente) avisoExistente.remove();
  }

  return total;
}

function mostrarMensaje(mensaje) {
  alert(mensaje);
}

function mostrarMensajeTemporal(mensaje) {
  const mensajeDiv = document.getElementById("mensajeConfirmacion");
  if (mensajeDiv) {
    mensajeDiv.textContent = mensaje;
    mensajeDiv.style.display = "block";
    setTimeout(() => {
      mensajeDiv.style.display = "none";
      mensajeDiv.textContent = "";
    }, 4000);
  }
}

function selectBox(boxNumber) {
  console.log("selectBox called for:", boxNumber);
  selectedBox = boxNumber;
  cargarDatos();

  document.querySelectorAll(".box-selector button").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.textContent === `Box ${boxNumber}`) btn.classList.add("active");
  });

  document.getElementById("numero-box-seleccionado").textContent = boxNumber;
  document.getElementById("mensaje-box-seleccionado").style.display = "block";
  habilitarCampos();
}

async function cargarListadoInformesGuardados() {
  if (!currentUserId || !db) {
    console.warn(
      "No se puede cargar el listado de informes: usuario no autenticado o Firebase no inicializado."
    );
    return;
  }

  const select = document.getElementById("informesGuardados");
  select.innerHTML =
    '<option value="">-- Seleccionar Informe Guardado --</option>'; // Limpiar opciones

  try {
    const informesRef = db
      .collection("users")
      .doc(currentUserId)
      .collection("informesEnfermeria");
    const snapshot = await informesRef.orderBy("timestamp", "desc").get();

    const informesPorBox = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const informeId = doc.id;
      const box = data.box;
      const timestamp = data.timestamp || new Date().toISOString();

      if (box && timestamp) {
        if (!informesPorBox[box]) {
          informesPorBox[box] = [];
        }
        informesPorBox[box].push({ informeId, timestamp });
      }
    });

    const boxesOrdenados = Object.keys(informesPorBox)
      .map(Number)
      .sort((a, b) => a - b);

    boxesOrdenados.forEach((box) => {
      const grupo = document.createElement("optgroup");
      grupo.label = `Box ${box}`;
      grupo.style.backgroundColor = "var(--pantone15)"; // Estilo para el optgroup
      grupo.style.color = "white"; // Estilo para el texto del optgroup
      grupo.style.fontWeight = "bold";

      informesPorBox[box].forEach(({ informeId, timestamp }) => {
        const option = document.createElement("option");
        const dateObj = new Date(timestamp);
        const fechaHoraLinda = dateObj.toLocaleDateString("es-ES", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        option.value = informeId;
        option.textContent = `Box ${box} - ${fechaHoraLinda}`;
        grupo.appendChild(option);
      });
      select.appendChild(grupo);
    });

    console.log("Listado de informes guardados cargado.");
  } catch (error) {
    console.error("Error al cargar el listado de informes guardados: ", error);
    mostrarMensaje("Error al cargar el listado de informes guardados.");
  }
}

async function cargarInformeDesdeLista(informeId) {
  if (!informeId) {
    console.log("Ningún informe seleccionado o informe vacío.");
    campos.forEach((campo) => (document.getElementById(campo).value = ""));
    actualizarContadorGlobal();
    return;
  }
  if (!currentUserId || !db) {
    mostrarMensaje(
      "Usuario no autenticado o Firebase no inicializado para cargar informe."
    );
    return;
  }

  try {
    const docRef = db
      .collection("users")
      .doc(currentUserId)
      .collection("informesEnfermeria")
      .doc(informeId);
    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data();
      if (selectedBox !== data.box) {
        selectBox(data.box);
      }

      campos.forEach((campo) => {
        document.getElementById(campo).value = data[campo] || "";
      });
      actualizarContadorGlobal();
      const selectElement = document.getElementById("informesGuardados");
      const selectedOptionText =
        selectElement.options[selectElement.selectedIndex]?.textContent;
      mostrarMensajeTemporal(`Informe "${selectedOptionText}" cargado.`);
      console.log("Informe cargado desde la lista:", data);
    } else {
      mostrarMensaje("El informe seleccionado no existe.");
      console.warn("Informe no encontrado para ID:", informeId);
    }
  } catch (error) {
    console.error("Error al cargar el informe desde la lista:", error);
    mostrarMensaje(
      "Error al cargar el informe seleccionado. Consulte la consola."
    );
  }
}

async function eliminarInforme() {
  const selectElement = document.getElementById("informesGuardados");
  const informeId = selectElement.value;
  const informeLabel =
    selectElement.options[selectElement.selectedIndex]?.textContent;

  if (!informeId) {
    mostrarMensaje("Por favor, seleccione un informe guardado para eliminar.");
    return;
  }
  if (!currentUserId || !db) {
    mostrarMensaje(
      "Usuario no autenticado o Firebase no inicializado para eliminar informe."
    );
    return;
  }

  if (
    !confirm(
      `¿Estás seguro de que quieres eliminar el informe "${informeLabel}"?`
    )
  ) {
    return;
  }

  try {
    await db
      .collection("users")
      .doc(currentUserId)
      .collection("informesEnfermeria")
      .doc(informeId)
      .delete();
    mostrarMensajeTemporal(`Informe "${informeLabel}" eliminado exitosamente.`);
    cargarListadoInformesGuardados();
  } catch (error) {
    console.error("Error al eliminar el informe:", error);
    mostrarMensaje("Error al eliminar el informe. Inténtalo de nuevo.");
  }
}

async function eliminarInformesDeBox() {
  if (!selectedBox) {
    mostrarMensaje(
      "Por favor, seleccione un Box primero para eliminar sus informes."
    );
    return;
  }
  if (!currentUserId || !db) {
    mostrarMensaje(
      "Usuario no autenticado o Firebase no inicializado para eliminar informes del Box."
    );
    return;
  }

  if (
    !confirm(
      `¿Estás seguro de que quieres eliminar TODOS los informes guardados del Box ${selectedBox}? Esta acción es irreversible.`
    )
  ) {
    return;
  }

  try {
    const informesRef = db
      .collection("users")
      .doc(currentUserId)
      .collection("informesEnfermeria");
    const snapshot = await informesRef.where("box", "==", selectedBox).get();

    if (snapshot.empty) {
      mostrarMensajeTemporal(
        `No hay informes para eliminar en el Box ${selectedBox}.`
      );
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    mostrarMensajeTemporal(
      `Todos los informes del Box ${selectedBox} han sido eliminados.`
    );
    cargarListadoInformesGuardados();

    const userDraftsCollection = db
      .collection("users")
      .doc(currentUserId)
      .collection("drafts");
    const draftDocId = `draft_box_${selectedBox}_${hoy}`;
    const draftDoc = await userDraftsCollection.doc(draftDocId).get();
    if (draftDoc.exists) {
      await userDraftsCollection.doc(draftDocId).delete();
      console.log("Borrador diario del Box eliminado también.");
    }
    campos.forEach((campo) => (document.getElementById(campo).value = ""));
    actualizarContadorGlobal();
  } catch (error) {
    console.error("Error al eliminar informes del Box:", error);
    mostrarMensaje("Error al eliminar informes del Box. Inténtalo de nuevo.");
  }
}
// CERRAR SESION
// Cerrar sesión
document.getElementById("logoutBtn").addEventListener("click", () => {
  firebase
    .auth()
    .signOut()
    .then(() => {
      console.log("Usuario cerró sesión");
      window.location.href = "index.html"; // Redirigir al login
    })
    .catch((error) => {
      alert("Error al cerrar sesión: " + error.message);
    });
});

//Función de cierre de sesión en JavaScript
function cerrarSesion() {
  firebase
    .auth()
    .signOut()
    .then(() => {
      console.log("Usuario ha cerrado sesión.");
      window.location.href = "index.html"; // Redirige al login
    })
    .catch((error) => {
      console.error("Error al cerrar sesión:", error);
      alert("Error al cerrar sesión. Inténtalo de nuevo.");
    });
}

window.onload = () => {
  deshabilitarCampos();

  const boxSelector = document.getElementById("boxSelector");
  if (!boxSelector) {
    console.error("No se encontró el selector de Boxes.");
    return;
  }

  for (let i = 1; i <= 12; i++) {
    const btn = document.createElement("button");
    btn.textContent = `Box ${i}`;
    btn.onclick = () => selectBox(i);
    boxSelector.appendChild(btn);
  }
};
