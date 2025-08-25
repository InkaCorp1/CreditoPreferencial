let originalAmount = 0;
let hasSurcharge = false;

// =================================================================================
// INICIALIZACIÓN Y LISTENERS PRINCIPALES
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    // --- Lógica del Saludo ---
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
        let greetingText = '';
        if (hour < 12) { greetingText = 'Buenos días, Henry'; }
        else if (hour < 19) { greetingText = 'Buenas tardes, Henry'; }
        else { greetingText = 'Buenas noches, Henry'; }
        greetingEl.textContent = greetingText;
    }

    // --- Lógica de Carga de Datos Iniciales ---
    fetchDisbursementData();

    // --- Listeners de UI ---
    document.getElementById('show-form-btn').addEventListener('click', () => {
        document.getElementById('credit-details-section').classList.add('hidden');
        document.getElementById('disbursement-form-section').classList.remove('hidden');
    });

    document.getElementById('back-to-details-btn').addEventListener('click', () => {
        document.getElementById('disbursement-form-section').classList.add('hidden');
        document.getElementById('credit-details-section').classList.remove('hidden');
    });

    document.getElementById('recargo-si-btn').addEventListener('click', handleSurchargeYes);
    document.getElementById('recargo-no-btn').addEventListener('click', handleSurchargeNo);
    document.getElementById('monto_desembolsado').addEventListener('input', validateAmountColor);
    document.getElementById('comprobante_file').addEventListener('change', handleFileUpload);
    document.getElementById('desembolso-form').addEventListener('submit', handleFormSubmit);
    
    setupModal();
});

// =================================================================================
// LÓGICA DE INTERACCIÓN DEL FORMULARIO
// =================================================================================

function initializeFormState() {
    const montoInput = document.getElementById('monto_desembolsado');
    montoInput.value = originalAmount.toFixed(2);
    montoInput.disabled = true;
    montoInput.classList.remove('text-red-600');
    hasSurcharge = false;
    document.getElementById('motivo-recargo-section').classList.add('hidden');
    updateSurchargeButtonStyles();
}

function handleSurchargeYes() {
    hasSurcharge = true;
    const montoInput = document.getElementById('monto_desembolsado');
    montoInput.disabled = false;
    document.getElementById('motivo-recargo-section').classList.remove('hidden');
    updateSurchargeButtonStyles();
    validateAmountColor();
}

function handleSurchargeNo() {
    hasSurcharge = false;
    initializeFormState();
}

function updateSurchargeButtonStyles() {
    const siBtn = document.getElementById('recargo-si-btn');
    const noBtn = document.getElementById('recargo-no-btn');
    const activeClasses = ['bg-[var(--secundario-1)]', 'text-white'];
    const inactiveClasses = ['bg-gray-200', 'text-gray-800'];

    const applyStyles = (element, add, remove) => {
        element.classList.add(...add);
        element.classList.remove(...remove);
    };

    if (hasSurcharge) {
        applyStyles(siBtn, activeClasses, inactiveClasses);
        applyStyles(noBtn, inactiveClasses, activeClasses);
    } else {
        applyStyles(noBtn, activeClasses, inactiveClasses);
        applyStyles(siBtn, inactiveClasses, activeClasses);
    }
}

function validateAmountColor() {
    if (!hasSurcharge) return;
    const montoInput = document.getElementById('monto_desembolsado');
    const currentAmount = parseFloat(montoInput.value) || 0;
    if (currentAmount <= originalAmount) {
        montoInput.classList.add('text-red-600');
    } else {
        montoInput.classList.remove('text-red-600');
    }
}

function handleFormSubmit(event) {
    event.preventDefault();

    const montoDesembolsado = parseFloat(document.getElementById('monto_desembolsado').value) || 0;
    const motivoRecargoInput = document.getElementById('motivo_recargo');
    const comprobanteUrl = document.getElementById('comprobante_url').value.trim();

    if (hasSurcharge) {
        if (montoDesembolsado <= originalAmount) {
            showModal('Con recargo, el monto a desembolsar debe ser mayor que el monto original.');
            return;
        }
        if (motivoRecargoInput.value.trim() === '') {
            showModal('El motivo del recargo es obligatorio cuando hay un costo adicional.');
            return;
        }
    }
    if (!comprobanteUrl) {
        showModal('Por favor, suba una imagen del comprobante antes de confirmar.');
        return;
    }

    const today = new Date();
    const fechaDesembolso = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const submissionData = {
        idCredito: document.getElementById('id_credito').value,
        montoDesembolsado: montoDesembolsado.toFixed(2),
        fechaDesembolso: fechaDesembolso,
        comprobanteUrl: comprobanteUrl,
        motivoRecargo: hasSurcharge ? motivoRecargoInput.value.trim() : 'SIN RECARGO',
        // Datos adicionales para notificaciones
        idmensajejose: document.getElementById('id_mensaje_jose').value,
        idmensajehenry: document.getElementById('id_mensaje_henry').value,
        telefonoBeneficiario: document.getElementById('telefono_beneficiario').value,
        nombreBeneficiario: document.getElementById('beneficiary-name').textContent,
        motivo: document.getElementById('motivo_credito').value,
        montoOriginal: document.getElementById('original_amount').value,
        tipo: document.getElementById('credit-type').textContent,
        porcentaje: document.getElementById('interest_rate').value
    };

    sendDisbursementResponse(submissionData);
}

// =================================================================================
// LÓGICA DE COMUNICACIÓN CON WEBHOOKS (SUBIDA, ACTUALIZACIÓN, NOTIFICACIÓN)
// =================================================================================

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const uploadStatus = document.getElementById('upload-status');
    const submitButton = document.getElementById('submit-btn');

    submitButton.disabled = true;
    uploadStatus.textContent = 'Subiendo comprobante...';
    uploadStatus.style.color = '#6b7280';

    try {
        const beneficiaryName = document.getElementById('beneficiary-name').textContent.trim().replace(/ /g, '_').toUpperCase();
        const today = new Date();
        const dateString = `${String(today.getDate()).padStart(2, '0')}_${String(today.getMonth() + 1).padStart(2, '0')}_${today.getFullYear()}`;
        const fileExtension = file.name.split('.').pop();
        const motivo = document.getElementById('motivo_credito').value.replace(/[\s/\?%*:|"<>]/g, '_');
        const fileName = `${dateString}-${motivo}.${fileExtension}`;
        const directoryPath = `/INKA_CORP/CREDITO_PREFERENCIAL/${beneficiaryName}/`;

        const uploadWebhookUrl = 'https://lpwebhook.luispinta.com/webhook/87f1603e-86ad-4547-8a87-a5d9f9b02115';
        const formData = new FormData();
        formData.append('path', directoryPath);
        formData.append('file', file, fileName);

        const response = await fetch(uploadWebhookUrl, { method: 'POST', body: formData });
        if (!response.ok) throw new Error(`Error del servidor de subida: ${response.status}`);
        
        const result = await response.json();
        if (!result.url) throw new Error('La respuesta del webhook de subida no contiene una URL.');

        document.getElementById('comprobante_url').value = result.url;
        uploadStatus.textContent = '¡Comprobante subido con éxito!';
        uploadStatus.style.color = '#16a34a';
        submitButton.disabled = false;

    } catch (error) {
        console.error('Error al subir el archivo:', error);
        uploadStatus.textContent = `Error al subir: ${error.message}`;
        uploadStatus.style.color = '#dc2626';
        submitButton.disabled = true;
    }
}

async function fetchDisbursementData() {
    const urlParams = new URLSearchParams(window.location.search);
    const idCredito = urlParams.get('IDCRÉDITO');
    if (!idCredito) {
        showError('No se proporcionó un ID de crédito en la URL.');
        return;
    }
    showLoading();
    const queryWebhookUrl = 'https://lpn8n.luispinta.com/webhook/82cae7e9-2c79-4994-b4fa-6c6ed5c4aaa9';
    try {
        const response = await fetch(queryWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idcredito: idCredito }) });
        if (!response.ok) throw new Error(`Error del servidor al consultar datos: ${response.status}`);
        
        const creditData = await response.json();
        if (creditData && creditData.length > 0) {
            const credit = creditData[0];

            // VALIDACIÓN DE ESTADO INICIAL
            if (credit.estado !== 'APROBADO') {
                let title = 'Aviso';
                let message = '';
                switch (credit.estado) {
                    case 'PENDIENTE':
                        message = 'Aún no se puede desembolsar porque José no lo ha aprobado.';
                        break;
                    case 'RECHAZADO':
                        title = 'Crédito Rechazado';
                        message = 'Lo sentimos, no puedes desembolsar un crédito que ha sido rechazado.';
                        break;
                    case 'DESEMBOLSADO':
                        title = 'Crédito ya Procesado';
                        message = 'Nos encanta tu entusiasmo, pero no puedes desembolsar un crédito que ya ha sido procesado.';
                        break;
                    default:
                        message = `El estado actual del crédito es '${credit.estado}' y no puede ser procesado.`;
                }
                showStatusMessage(title, message);
                return; // Detener ejecución
            }
            
            document.getElementById('beneficiary-name').textContent = credit.nombrebeneficiario;
            const monto = parseFloat(credit.monto.replace(',', '.'));
            originalAmount = monto;
            document.getElementById('amount').textContent = `USD ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(monto)}`;
            document.getElementById('credit-type').textContent = credit.tipo;
            
            document.getElementById('id_credito').value = idCredito;
            document.getElementById('id_mensaje_jose').value = credit.idmensajejose;
            document.getElementById('id_mensaje_henry').value = credit.idmensajehenry;
            document.getElementById('telefono_beneficiario').value = credit.whatsappbeneficiario;
            document.getElementById('motivo_credito').value = credit.motivo;
            document.getElementById('original_amount').value = monto;
            document.getElementById('interest_rate').value = credit.porcentaje;

            initializeFormState();
        } else {
            throw new Error('La solicitud de crédito no fue encontrada o no hay datos.');
        }
        document.getElementById('main-content').classList.remove('hidden');
        document.getElementById('feedback-section').classList.add('hidden');
    } catch (error) {
        showError(error.message);
    }
}

async function sendDisbursementResponse(formData) {
    showLoading();
    const updateWebhookUrl = 'https://lpn8n.luispinta.com/webhook/19094bf4-628d-422d-98ac-2799b5751f4a';
    const webhookPayload = {
        idCredito: formData.idCredito,
        montoDesembolsado: formData.montoDesembolsado,
        fechaDesembolso: formData.fechaDesembolso,
        comprobanteUrl: formData.comprobanteUrl,
        motivoRecargo: formData.motivoRecargo,
    };
    try {
        const response = await fetch(updateWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(webhookPayload) });
        if (!response.ok) throw new Error(`Error del servidor al actualizar: ${response.status}`);
        await response.json();
        await sendDisbursementNotifications(formData);
        showSuccess();
    } catch (error) {
        showError(error.message);
    }
}

// --- Sistema de Notificaciones Mejorado ---

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendWebhookWithRetries(payload, recipientName) {
    const maxRetries = 3;
    const retryDelay = 5000; // 5 segundos
    const WEBHOOK_URL = 'https://api.luispinta.com/message/sendMedia/secreGladys';
    const API_KEY = 'ahsnjdhd4';

    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': API_KEY },
        body: JSON.stringify(payload)
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Enviando a ${recipientName}... (Intento ${attempt}/${maxRetries})`);
            const response = await fetch(WEBHOOK_URL, options);
            if (response.ok) {
                console.log(`ÉXITO: Mensaje enviado a ${recipientName}.`);
                return true;
            } else {
                console.error(`FALLO EN SERVIDOR: Webhook para ${recipientName} devolvió ${response.status}.`);
            }
        } catch (error) {
            console.error(`FALLO DE RED: No se pudo contactar al servidor para ${recipientName}. Error: ${error.toString()}`);
        }
        if (attempt < maxRetries) {
            console.log(`Reintentando en ${retryDelay / 1000} segundos...`);
            await sleep(retryDelay);
        }
    }
    console.error(`FALLO CRÍTICO: Todos los ${maxRetries} intentos para ${recipientName} han fallado.`);
    return false;
}

async function sendDisbursementNotifications(data) {
    const NUMERO_JOSE = '19175309618';
    const NUMERO_HENRY = '593960618564';
    const imageUrl = data.comprobanteUrl;

    // --- Mensajes (Captions) ---
    const captionJose = `Estimado José, te informamos que el crédito preferencial con los siguientes datos fue desembolsado exitosamente:\n\n- *Beneficiario:* ${data.nombreBeneficiario}\n- *Motivo:* ${data.motivo}\n- *Monto Final Desembolsado:* $${parseFloat(data.montoDesembolsado).toFixed(2)}`;
  
    let captionHenry = `¡Buen trabajo Henry! Has desembolsado correctamente el crédito preferencial. Aquí el resumen:\n\n- *Beneficiario:* ${data.nombreBeneficiario}\n- *Motivo:* ${data.motivo}\n- *Monto Solicitado:* $${parseFloat(data.montoOriginal).toFixed(2)}`;
    if (data.motivoRecargo && data.motivoRecargo.toUpperCase() !== 'SIN RECARGO') {
        captionHenry += `\n- *Motivo Recargo/Ajuste:* ${data.motivoRecargo}`;
    }
    captionHenry += `\n- *Monto Final Desembolsado:* $${parseFloat(data.montoDesembolsado).toFixed(2)}`;
  
    let captionBeneficiario = `¡Felicidades ${data.nombreBeneficiario}! Se ha desembolsado tu crédito preferencial con los siguientes datos:\n\n- *Tipo de Crédito:* ${data.tipo}\n- *Motivo:* ${data.motivo}\n- *Monto Solicitado:* $${parseFloat(data.montoOriginal).toFixed(2)}`;
    if (data.motivoRecargo && data.motivoRecargo.toUpperCase() !== 'SIN RECARGO') {
        captionBeneficiario += `\n- *Motivo Recargo/Ajuste:* ${data.motivoRecargo}`;
    }
    captionBeneficiario += `\n- *Monto Final Desembolsado:* $${parseFloat(data.montoDesembolsado).toFixed(2)}\n- *Tasa de Interés:* ${data.porcentaje}`;

    // --- Payloads ---
    const payloadJose = { number: NUMERO_JOSE, mediatype: "image", caption: captionJose, media: imageUrl, quoted: { key: { id: data.idmensajejose } } };
    const payloadHenry = { number: NUMERO_HENRY, mediatype: "image", caption: captionHenry, media: imageUrl, quoted: { key: { id: data.idmensajehenry } } };
    const payloadBeneficiario = { number: data.telefonoBeneficiario, mediatype: "image", caption: captionBeneficiario, media: imageUrl };

    // --- Secuencia de Envío ---
    await sendWebhookWithRetries(payloadJose, "José");
    await sleep(Math.floor(Math.random() * 5000) + 3000); // Pausa aleatoria 3-8s

    await sendWebhookWithRetries(payloadHenry, "Henry");
    await sleep(Math.floor(Math.random() * 5000) + 3000);

    if (data.telefonoBeneficiario) {
        await sendWebhookWithRetries(payloadBeneficiario, `Beneficiario (${data.nombreBeneficiario})`);
    }
}

// =================================================================================
// FUNCIONES DE UI GENÉRICAS (MODAL, FEEDBACK)
// =================================================================================

function setupModal() {
    const alertModal = document.getElementById('alert-modal');
    const modalOkBtn = document.getElementById('modal-ok-btn');
    const hideModal = () => alertModal.classList.add('hidden');
    modalOkBtn.addEventListener('click', hideModal);
    alertModal.addEventListener('click', (event) => { if (event.target === alertModal) hideModal(); });
}

window.showModal = (message) => {
    document.getElementById('modal-message').textContent = message;
    document.getElementById('alert-modal').classList.remove('hidden');
}

function showLoading() {
    document.getElementById('main-content').classList.add('hidden');
    document.getElementById('feedback-section').classList.remove('hidden');
    document.getElementById('loader').classList.remove('hidden');
    document.getElementById('success-message').classList.add('hidden');
    document.getElementById('error-message').classList.add('hidden');
}

function showSuccess() {
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('success-message').classList.remove('hidden');
    document.getElementById('success-message').classList.add('fade-in');
}

function showError(message) {
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('error-text').textContent = message || 'Ocurrió un error inesperado.';
    document.getElementById('error-message').classList.remove('hidden');
    document.getElementById('error-message').classList.add('fade-in');
}

function showStatusMessage(title, message) {
    document.getElementById('main-content').classList.add('hidden');
    const feedbackSection = document.getElementById('feedback-section');
    feedbackSection.classList.remove('hidden');

    const errorSection = document.getElementById('error-message');
    errorSection.classList.remove('hidden');
    
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('success-message').classList.add('hidden');

    errorSection.querySelector('h2').textContent = title;
    document.getElementById('error-text').textContent = message;

    const reloadButton = errorSection.querySelector('button');
    if (reloadButton) {
        reloadButton.classList.add('hidden');
    }
}
