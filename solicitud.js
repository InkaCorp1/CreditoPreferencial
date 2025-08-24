
let idMensajeJose, idMensajeHenry;

document.addEventListener('DOMContentLoaded', () => {
    // --- Lógica del Saludo ---
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('greeting');
    let greetingText = '';
    if (hour < 12) { greetingText = 'Buenos días, José Nishve'; }
    else if (hour < 19) { greetingText = 'Buenas tardes, José Nishve'; }
    else { greetingText = 'Buenas noches, José Nishve'; }
    greetingEl.textContent = greetingText;

    // --- Lógica de Navegación de Vistas ---
    document.getElementById('show-response-buttons').addEventListener('click', () => {
        document.getElementById('details-view').classList.add('fade-out');
        setTimeout(() => {
            document.getElementById('details-view').classList.add('hidden');
            document.getElementById('response-buttons').classList.remove('hidden');
            document.getElementById('response-buttons').classList.add('fade-in');
        }, 400);
    });

    // Cuando el usuario hace clic en el botón inicial de "Rechazar"
    document.getElementById('reject-btn').addEventListener('click', () => {
        // Mostramos el formulario de motivo de rechazo
        document.getElementById('response-buttons').style.display = 'none';
        document.getElementById('rejection-reason').classList.remove('hidden');
    });

    // Cuando el usuario hace clic en el botón final de "Enviar Respuesta"
    document.getElementById('send-rejection-btn').addEventListener('click', function() {
        const motivo = document.getElementById('motivo-rechazo').value.trim();
        if (motivo === '') {
            showModal('Por favor, ingrese el motivo del rechazo.');
            document.getElementById('motivo-rechazo').focus();
            return;
        }
        // Leemos el ID directamente desde el campo oculto
        const idCreditoParaRechazar = document.getElementById('id_credito_hidden').value;

        sendResponse(idCreditoParaRechazar, 'RECHAZADO', 'RECHAZADO', '0%', motivo);
    });

    // --- Lógica del Modal ---
    const alertModal = document.getElementById('alert-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalOkBtn = document.getElementById('modal-ok-btn');

    window.showModal = (message) => {
        modalMessage.textContent = message;
        alertModal.classList.remove('hidden');
    }

    const hideModal = () => {
        alertModal.classList.add('hidden');
    }

    modalOkBtn.addEventListener('click', hideModal);
    alertModal.addEventListener('click', (event) => {
        if (event.target === alertModal) {
            hideModal();
        }
    });

    fetchCreditData();
});

// --- Funciones de Feedback (Carga, Éxito, Error) ---
function showLoading() {
    document.getElementById('content-section').classList.add('hidden');
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

async function fetchCreditData() {
    const urlParams = new URLSearchParams(window.location.search);
    const idCredito = urlParams.get('IDCRÉDITO');

    if (!idCredito) {
        showError('No se proporcionó un ID de crédito.');
        return;
    }

    showLoading();

    try {
        const response = await fetch('https://lpwebhook.luispinta.com/webhook/4e7366d3-d532-42e9-b786-7501a15bded8', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idcredito: idCredito })
        });

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const creditData = await response.json();

        if (creditData && creditData.length > 0) {
            const credit = creditData[0];
            idMensajeJose = credit.idmensajejose;
            idMensajeHenry = credit.idmensajehenry;

            document.getElementById('id_credito_hidden').value = idCredito;
            document.querySelector('#beneficiary-name').textContent = credit.nombrebeneficiario;
            const monto = parseFloat(credit.monto.replace(',', '.'));
            document.querySelector('#amount').textContent = `USD ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(monto)}`;
            document.querySelector('#reason').textContent = credit.motivo;
        }

        
        document.querySelectorAll('.response-btn').forEach(button => {
            const estado = button.id === 'reject-btn' ? 'RECHAZADO' : 'APROBADO';
            let tipo = 'RECHAZADO';
            let porcentaje = '0%';

            if (estado === 'APROBADO') {
                const text = button.textContent.trim();
                if (text.includes('Preferencial')) {
                    tipo = 'PREFERENCIAL';
                    porcentaje = '1,5%';
                } else if (text.includes('Salud')) {
                    tipo = 'SALUD';
                    porcentaje = '1,0%';
                } else if (text.includes('Estudiantil')) {
                    tipo = 'ESTUDIANTIL';
                    porcentaje = '0,5%';
                }
            }
            
            if (button.id !== 'reject-btn') {
                button.onclick = () => sendResponse(idCredito, estado, tipo, porcentaje);
            }
        });


        document.getElementById('content-section').classList.remove('hidden');
        document.getElementById('feedback-section').classList.add('hidden');


    } catch (error) {
        showError(error.message);
    }
}


// --- Función Principal de Envío de Datos ---
async function sendResponse(id, estado, tipo, porcentaje, motivoRechazo = '') {
    showLoading();

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    const year = today.getFullYear();
    const fecharespuesta = `${day}/${month}/${year}`;

    const responseData = {
        idCredito: id,
        estado: estado,
        tipo: tipo,
        porcentaje: porcentaje,
        motivoRespuesta: estado === 'APROBADO' ? 'Aprobado por José Nishve' : motivoRechazo,
        fotografia: estado === 'APROBADO' 
            ? 'https://lh3.googleusercontent.com/d/1h8LqgCtqFpa6LHmEU9XkaSXvBNCOsx2f=w2048?name=cartel_credito_aprobado_inka.png' 
            : 'https://lh3.googleusercontent.com/d/1TS8kS8_XccXt-ETzIYWsJqZcRpa35DnS=w2048?name=cartel_credito_rechazado_inka.png',
        fecharespuesta: fecharespuesta
    };

    
    const secondWebhookUrl = 'https://lpwebhook.luispinta.com/webhook/84ac5fb1-4d6a-4c0b-8332-f97aa1ceaad0';

    try {
        const response = await fetch(secondWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(responseData)
        });

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const result = await response.json();

        if (result && result.length > 0) {
            // Assuming success if we get a response with data
            await sendEvolutionWebhookNotification(estado, id, motivoRechazo, idMensajeJose, idMensajeHenry);
            showSuccess();
        } else {
            showError('La respuesta del segundo webhook no fue exitosa.');
        }

    } catch (error) {
        showError(error.message);
    }
}

async function sendEvolutionWebhookNotification(status, idCredito, motivoRechazo, idMensajeJose, idMensajeHenry) {
    const WEBHOOK_URL = 'https://api.luispinta.com/message/sendText/secreGladys';
    const API_KEY = 'ahsnjdhd4';
    const NUMERO_JOSE = '1963160804';
    const NUMERO_HENRY = '593960618564';

    const mensajeJose = "Muchas gracias por tu tiempo José, hemos comunicado tu respuesta a Henry.";
    const payloadJose = {
        number: NUMERO_JOSE,
        text: mensajeJose,
        delay: 1500,
        quoted: {
            key: {
                id: idMensajeJose
            }
        }
    };

    let mensajeHenry;
    if (status === 'APROBADO') {
        mensajeHenry = `Henry queremos comunicarte que José ha aprobado el crédito por lo que ya puedes proceder al desembolso en el siguiente enlace: https://creditopref.inkacorp.net/desembolso.html?IDCRÉDITO=${idCredito}`;
    } else { // RECHAZADO
        mensajeHenry = `Henry lamentamos informarte que esta solicitud fue rechazada, por el motivo de: ${motivoRechazo}`;
    }

    const payloadHenry = {
        number: NUMERO_HENRY,
        text: mensajeHenry,
        delay: 2000,
        quoted: {
            key: {
                id: idMensajeHenry
            }
        }
    };

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': API_KEY
        }
    };

    try {
        // Para José
        await fetch(WEBHOOK_URL, { ...options, body: JSON.stringify(payloadJose) });
        console.log("Notificación enviada a José.");

        // Para Henry
        await fetch(WEBHOOK_URL, { ...options, body: JSON.stringify(payloadHenry) });
        console.log("Notificación enviada a Henry.");

    } catch (error) {
        console.error('Error al enviar notificaciones por webhook de Evolution: ' + error.toString());
        // Optionally, you can show an error to the user, but for now, we just log it.
    }
}


// --- Estilos dinámicos para botones ---
document.querySelectorAll('.response-btn').forEach(button => {
    button.classList.add(
        'w-full', 'text-white', 'font-bold', 'py-4', 'px-2', 'rounded-lg',
        'hover:opacity-90', 'transition-all', 'duration-300', 'shadow-md',
        'transform', 'hover:scale-105', 'text-center'
    );
});
