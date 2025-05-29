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
let datosOriginalesInforme = null; // Almacena los datos del informe actualmente cargado
let idInformeCargado = null; // Almacena el ID del informe actualmente cargado
let currentSelectedBox = null; // Para almacenar el box actualmente seleccionado por el botón

// Array de IDs de campos que contienen los datos del informe
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

// Función para verificar si hay cambios en los campos respecto al informe original cargado
function hayCambiosRespectoAlOriginal() {
  if (!datosOriginalesInforme) return true; // Si no hay datos originales, siempre es un "nuevo" informe

  return campos.some((campo) => {
    const actual = document.getElementById(campo).value || "";
    const original = datosOriginalesInforme[campo] || "";
    return actual.trim() !== original.trim(); // Usar trim para ignorar espacios en blanco al inicio/final
  });
}

auth.onAuthStateChanged(async (user) => {
  const contenidoApp = document.getElementById("contenidoApp");

  if (!user) {
    console.warn("Acceso denegado: Usuario no autenticado.");
    window.location.href = "index.html"; // Redirige al login
  } else {
    currentUserId = user.uid;
    contenidoApp.style.display = "block"; // Muestra la aplicación

    // Inicializar la interfaz después de la autenticación
    generarBotonesBox(); // Generar los botones de Box
    const savedBox = localStorage.getItem("selectedBox");
    if (savedBox) {
      // Si hay un box guardado, "hacer clic" en el botón correspondiente
      simularClickBotonBox(savedBox);
    } else {
      deshabilitarCampos();
      document.getElementById("numero-box-seleccionado").textContent =
        "No seleccionado";
      // Si no hay box seleccionado, asegurarse de que el dropdown de informes esté vacío
      document.getElementById("informesGuardados").innerHTML =
        '<option value="">-- Seleccionar Informe Guardado --</option>';
    }
    actualizarContadorGlobal(); // Asegurar que el contador de caracteres funcione
  }
});

// Función para simular el click en un botón de box (útil al cargar la página)
function simularClickBotonBox(boxId) {
  const boxButton = document.getElementById(boxId);
  if (boxButton) {
    boxButton.click(); // Disparar el evento click
  } else {
    console.warn(`Botón para ${boxId} no encontrado.`);
  }
}

// Función para obtener la fecha y hora actual en formato local
function getFechaHoraActual() {
  const now = new Date();
  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false, // Formato 24 horas
  };
  return now.toLocaleString("es-ES", options);
}

// Función para mostrar mensajes temporales al usuario
function mostrarMensaje(mensaje, tipo = "exito") {
  const mensajeDiv = document.createElement("div");
  mensajeDiv.textContent = mensaje;
  mensajeDiv.classList.add("mensaje", tipo);
  document.body.appendChild(mensajeDiv);

  setTimeout(() => {
    mensajeDiv.remove();
  }, 3000);
}

// Función para deshabilitar campos de entrada
function deshabilitarCampos() {
  campos.forEach((campo) => {
    document.getElementById(campo).disabled = true;
  });
  document.getElementById("copiarInformeBtn").style.display = "none"; // Ocultar el botón de copiar
}

// Función para habilitar campos de entrada
function habilitarCampos() {
  campos.forEach((campo) => {
    document.getElementById(campo).disabled = false;
  });
}

// Función para generar los botones de box dinámicamente (REVISADA Y CORRECTA)
function generarBotonesBox() {
  const boxSelectorDiv = document.getElementById("boxSelector");
  boxSelectorDiv.innerHTML = ""; // Limpiar botones existentes

  for (let i = 1; i <= 12; i++) {
    // Solo 12 boxes
    const button = document.createElement("button");
    button.id = `box${i}`; // Asignar un ID único al botón (ej. "box1", "box2")
    button.classList.add("box-button"); // Puedes añadir una clase para estilos CSS
    button.textContent = `Box ${i}`;
    button.addEventListener("click", () => {
      // Desactivar botón previamente activo
      const activeBtn = document.querySelector(".box-button.active");
      if (activeBtn) {
        activeBtn.classList.remove("active");
      }
      // Activar el botón clicado
      button.classList.add("active");

      currentSelectedBox = `box${i}`; // Actualizar el box seleccionado globalmente
      localStorage.setItem("selectedBox", currentSelectedBox);
      cargarInformesGuardados(currentSelectedBox);
      habilitarCampos();
      // Actualizar el mensaje de box seleccionado
      document.getElementById("numero-box-seleccionado").textContent = i;

      // Limpiar todos los campos y el resultado al cambiar de box
      campos.forEach((campo) => (document.getElementById(campo).value = ""));
      document.getElementById("resultado").innerHTML = "";
      document.getElementById("copiarInformeBtn").style.display = "none";
      datosOriginalesInforme = null; // Limpiar datos originales
      idInformeCargado = null; // Limpiar ID de informe cargado
      actualizarContadorGlobal(); // Resetear contador al cambiar de box
    });
    boxSelectorDiv.appendChild(button);
  }
}

// Event listener para el cambio de selección de box (ahora gestionado por los clics de botones)
document.addEventListener("DOMContentLoaded", () => {
  // La llamada a generarBotonesBox() se hace en auth.onAuthStateChanged
  // para asegurar que los boxes se generen solo cuando el usuario está autenticado.

  // Event listener para actualizar el contador global al escribir en los campos
  campos.forEach((campo) => {
    const element = document.getElementById(campo);
    if (element) {
      element.addEventListener("input", actualizarContadorGlobal);
    }
  });

  // El onchange de informesGuardados se asigna en el HTML: onchange="cargarInformeDesdeLista(this.value)"
});

// Función para cargar informes guardados en el selector
async function cargarInformesGuardados(box) {
  if (!currentUserId) {
    console.warn("No hay usuario autenticado para cargar informes.");
    return;
  }
  const informesGuardadosSelect = document.getElementById("informesGuardados");
  informesGuardadosSelect.innerHTML =
    '<option value="">-- Seleccionar Informe Guardado --</option>';

  try {
    const informesSnapshot = await db
      .collection("users")
      .doc(currentUserId)
      .collection("boxes")
      .doc(box)
      .collection("informes")
      .orderBy("timestamp", "desc") // Ordenar por timestamp descendente
      .get();

    informesSnapshot.forEach((doc) => {
      const informe = doc.data();
      const option = document.createElement("option");
      option.value = doc.id; // Usar el ID del documento como valor
      option.textContent = `Informe del ${informe.fechaHora}`; // Mostrar fecha y hora
      informesGuardadosSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error al cargar informes guardados:", error);
    mostrarMensaje("Error al cargar informes guardados.", "error");
  }
}

// Función para generar el informe
async function generarInforme() {
  const selectedBox = currentSelectedBox; // Usar el box seleccionado por el botón
  if (!selectedBox) {
    mostrarMensaje("Por favor, selecciona un Box primero.", "error");
    return;
  }

  // Recopilar datos de los campos
  const datosInforme = {};
  campos.forEach((campo) => {
    datosInforme[campo] = document.getElementById(campo).value || "";
  });

  // Generar el texto del informe
  let informeTexto = `**INFORME DE EVOLUCIÓN DE ENFERMERÍA**\n\n`;
  const fechaHoraGeneracion = getFechaHoraActual();
  informeTexto += `**Fecha y Hora del informe:** ${fechaHoraGeneracion}\n`;
  informeTexto += `**Box:** ${selectedBox
    .toUpperCase()
    .replace("BOX", "Box ")}\n\n`; // Mostrar el box seleccionado

  // Añadir todos los campos al informe con sus etiquetas
  campos.forEach((campo) => {
    const labelElement = document.querySelector(`label[for='${campo}']`);
    const labelText = labelElement
      ? labelElement.textContent
      : campo.toUpperCase(); // Fallback a ID si no hay label
    if (datosInforme[campo]) {
      informeTexto += `**${labelText}:** ${datosInforme[campo]}\n\n`; // Añadimos un salto de línea extra para mejor legibilidad
    }
  });

  const resultadoDiv = document.getElementById("resultado");
  resultadoDiv.innerHTML = `<pre>${informeTexto}</pre>`; // Mostrar en texto pre-formateado

  // Determinar si se debe guardar un nuevo informe o si solo se actualiza la pantalla
  if (idInformeCargado && !hayCambiosRespectoAlOriginal()) {
    // Si un informe fue cargado Y NO se hicieron cambios, solo actualizamos la pantalla, no guardamos uno nuevo.
    mostrarMensaje(
      "Informe actualizado en pantalla. No se guardó un nuevo informe ya que no hubo modificaciones.",
      "info"
    );
    document.getElementById("copiarInformeBtn").style.display = "block"; // Asegurar que el botón de copiar esté visible
    return;
  }

  // Añadir timestamp y ID de usuario
  datosInforme.timestamp = firebase.firestore.FieldValue.serverTimestamp();
  datosInforme.fechaHora = fechaHoraGeneracion; // Añadir fecha/hora legible
  datosInforme.userId = currentUserId; // Asociar con el usuario actual

  try {
    let docRef;
    if (idInformeCargado && hayCambiosRespectoAlOriginal()) {
      // Si un informe estaba cargado Y se hicieron cambios, guardar como informe NUEVO
      docRef = await db
        .collection("users")
        .doc(currentUserId)
        .collection("boxes")
        .doc(selectedBox)
        .collection("informes")
        .add(datosInforme);
      mostrarMensaje("¡Informe generado y guardado como nuevo!", "exito");
      idInformeCargado = docRef.id; // Actualizar el ID del informe cargado al nuevo
    } else {
      // No había informe cargado o se ha vaciado el formulario, guardar como nuevo
      docRef = await db
        .collection("users")
        .doc(currentUserId)
        .collection("boxes")
        .doc(selectedBox)
        .collection("informes")
        .add(datosInforme);
      mostrarMensaje("¡Informe generado y guardado!", "exito");
      idInformeCargado = docRef.id; // Establecer el ID del informe cargado al nuevo
    }

    // Refrescar la lista de informes guardados
    await cargarInformesGuardados(selectedBox);
    document.getElementById("informesGuardados").value = idInformeCargado; // Seleccionar el informe recién guardado
    datosOriginalesInforme = { ...datosInforme }; // Actualizar datos originales con los datos del nuevo informe
    document.getElementById("copiarInformeBtn").style.display = "block"; // Mostrar botón de copiar
  } catch (error) {
    console.error("Error al guardar el informe:", error);
    mostrarMensaje("Error al guardar el informe. Inténtalo de nuevo.", "error");
  }
}

// Función para cargar un informe guardado desde la lista desplegable
async function cargarInformeDesdeLista(informeId) {
  const selectedBox = currentSelectedBox; // Usar el box actualmente activo
  if (!selectedBox || !currentUserId) {
    mostrarMensaje(
      "Selecciona un Box y asegúrate de estar autenticado.",
      "error"
    );
    return;
  }

  if (!informeId) {
    // Si se ha seleccionado la opción "-- Seleccionar Informe Guardado --"
    campos.forEach((campo) => (document.getElementById(campo).value = ""));
    document.getElementById("resultado").innerHTML = "";
    document.getElementById("copiarInformeBtn").style.display = "none";
    datosOriginalesInforme = null;
    idInformeCargado = null;
    actualizarContadorGlobal(); // Actualizar contador al limpiar campos
    return;
  }

  try {
    const doc = await db
      .collection("users")
      .doc(currentUserId)
      .collection("boxes")
      .doc(selectedBox)
      .collection("informes")
      .doc(informeId)
      .get();

    if (doc.exists) {
      const informeData = doc.data();
      datosOriginalesInforme = { ...informeData }; // Almacenar los datos originales
      idInformeCargado = doc.id; // Almacenar el ID del informe cargado

      // Rellenar los campos de texto con los datos cargados
      campos.forEach((campo) => {
        document.getElementById(campo).value = informeData[campo] || "";
      });

      // Mostrar el informe en el div de resultados
      let informeTexto = `**INFORME DE EVOLUCIÓN DE ENFERMERÍA**\n\n`;
      informeTexto += `**Fecha y Hora del informe:** ${informeData.fechaHora}\n`;
      informeTexto += `**Box:** ${selectedBox
        .toUpperCase()
        .replace("BOX", "Box ")}\n\n`;

      campos.forEach((campo) => {
        const labelElement = document.querySelector(`label[for='${campo}']`);
        const labelText = labelElement
          ? labelElement.textContent
          : campo.toUpperCase();
        if (informeData[campo]) {
          informeTexto += `**${labelText}:** ${informeData[campo]}\n\n`;
        }
      });
      document.getElementById(
        "resultado"
      ).innerHTML = `<pre>${informeTexto}</pre>`;
      document.getElementById("copiarInformeBtn").style.display = "block"; // Mostrar botón de copiar
      actualizarContadorGlobal(); // Actualizar contador al cargar informe

      mostrarMensaje("Informe cargado exitosamente.", "exito");
    } else {
      mostrarMensaje("El informe seleccionado no existe.", "error");
      // Limpiar campos si el informe no se encuentra
      campos.forEach((campo) => (document.getElementById(campo).value = ""));
      document.getElementById("resultado").innerHTML = "";
      document.getElementById("copiarInformeBtn").style.display = "none";
      datosOriginalesInforme = null;
      idInformeCargado = null;
      actualizarContadorGlobal(); // Actualizar contador
    }
  } catch (error) {
    console.error("Error al cargar el informe:", error);
    mostrarMensaje("Error al cargar el informe. Inténtalo de nuevo.", "error");
  }
}

// Función para copiar el informe mostrado al portapapeles
function copiarInforme() {
  const resultadoDiv = document.getElementById("resultado");
  const informeTexto = resultadoDiv.textContent; // Obtener el contenido de texto

  if (informeTexto.trim() === "") {
    mostrarMensaje("No hay ningún informe para copiar.", "info");
    return;
  }

  navigator.clipboard
    .writeText(informeTexto)
    .then(() => {
      mostrarMensaje("Informe copiado al portapapeles.", "exito");
    })
    .catch((err) => {
      console.error("Error al copiar el informe:", err);
      mostrarMensaje(
        "Error al copiar el informe. Permiso denegado o navegador no compatible.",
        "error"
      );
    });
}

// Función para eliminar un informe seleccionado
async function eliminarInforme() {
  const selectedBox = currentSelectedBox; // Usar el box actualmente activo
  const informeId = document.getElementById("informesGuardados").value;

  if (!selectedBox) {
    mostrarMensaje("Por favor, selecciona un Box.", "error");
    return;
  }
  if (!informeId) {
    mostrarMensaje("Por favor, selecciona un informe para eliminar.", "error");
    return;
  }

  if (!confirm("¿Estás seguro de que quieres eliminar este informe?")) {
    return;
  }

  try {
    await db
      .collection("users")
      .doc(currentUserId)
      .collection("boxes")
      .doc(selectedBox)
      .collection("informes")
      .doc(informeId)
      .delete();

    mostrarMensaje("Informe eliminado exitosamente.", "exito");
    // Recargar la lista de informes y limpiar los campos
    await cargarInformesGuardados(selectedBox);
    campos.forEach((campo) => (document.getElementById(campo).value = ""));
    document.getElementById("resultado").innerHTML = "";
    document.getElementById("copiarInformeBtn").style.display = "none";
    datosOriginalesInforme = null;
    idInformeCargado = null;
    actualizarContadorGlobal(); // Actualizar contador al eliminar
  } catch (error) {
    console.error("Error al eliminar informe:", error);
    mostrarMensaje(
      "Error al eliminar el informe. Inténtalo de nuevo.",
      "error"
    );
  }
}

// Función para eliminar todos los informes de un box
async function eliminarInformesDeBox() {
  const selectedBox = currentSelectedBox; // Usar el box actualmente activo
  if (!selectedBox) {
    mostrarMensaje("Por favor, selecciona un Box.", "error");
    return;
  }

  if (
    !confirm(
      `¿Estás seguro de que quieres eliminar TODOS los informes del ${selectedBox.replace(
        "box",
        "Box "
      )}? Esta acción es irreversible.`
    )
  ) {
    return;
  }

  try {
    const informesSnapshot = await db
      .collection("users")
      .doc(currentUserId)
      .collection("boxes")
      .doc(selectedBox)
      .collection("informes")
      .get();

    const batch = db.batch();
    informesSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    mostrarMensaje(
      `Todos los informes del ${selectedBox.replace(
        "box",
        "Box "
      )} eliminados.`,
      "exito"
    );
    await cargarInformesGuardados(selectedBox); // Recargar la lista de informes
    campos.forEach((campo) => (document.getElementById(campo).value = "")); // Limpiar campos
    document.getElementById("resultado").innerHTML = ""; // Limpiar resultado
    document.getElementById("copiarInformeBtn").style.display = "none";
    datosOriginalesInforme = null;
    idInformeCargado = null;
    actualizarContadorGlobal(); // Actualizar contador
  } catch (error) {
    console.error("Error al eliminar informes del Box:", error);
    mostrarMensaje(
      "Error al eliminar informes del Box. Inténtalo de nuevo.",
      "error"
    );
  }
}

// Función para actualizar el contador global de caracteres
function actualizarContadorGlobal() {
  const totalMaximo = parseInt(
    document.getElementById("total-maximo").textContent
  );
  let totalCaracteres = 0;
  campos.forEach((campoId) => {
    const textarea = document.getElementById(campoId);
    if (textarea) {
      totalCaracteres += textarea.value.length;
    }
  });

  const contadorTotalSpan = document.getElementById("contador-total");
  if (contadorTotalSpan) {
    contadorTotalSpan.textContent = totalCaracteres;
    if (totalCaracteres > totalMaximo) {
      contadorTotalSpan.style.color = "red";
    } else {
      contadorTotalSpan.style.color = "black"; // O el color original
    }
  }
}

// --- Funciones adicionales presentes en el HTML (implementación básica para evitar errores) ---

function guardarDraftDiario() {
  // Implementa aquí la lógica para guardar un borrador diario si es necesario
  // Por ahora, solo actualiza el contador al escribir.
  actualizarContadorGlobal();
}

function borrarDatos() {
  if (
    confirm(
      "¿Estás seguro de que quieres borrar todos los datos del formulario?"
    )
  ) {
    campos.forEach((campo) => {
      document.getElementById(campo).value = "";
    });
    document.getElementById("resultado").innerHTML = "";
    document.getElementById("copiarInformeBtn").style.display = "none";
    datosOriginalesInforme = null;
    idInformeCargado = null;
    actualizarContadorGlobal();
    mostrarMensaje("Datos del formulario borrados.", "info");
  }
}

function imprimirAuto() {
  mostrarMensaje("Función 'Imprimir' (automático) no implementada.", "info");
  // Aquí iría la lógica de impresión directa
}

function imprimirAlternativo() {
  mostrarMensaje(
    "Función 'Imprimir en Turno Alternativo' no implementada.",
    "info"
  );
  // Aquí iría la lógica para imprimir en turno alternativo
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

//Función de cierre de sesión en JavaScript (duplicada en tu HTML, se mantiene por si se usa en otro lugar)
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
  // El resto de la inicialización se maneja en el auth.onAuthStateChanged
  // para asegurar que el DOM esté completamente cargado y el usuario autenticado.
};
