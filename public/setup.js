// Gestion du formulaire de setup multi-étapes
let currentStep = 1;
const totalSteps = 5;

// Éléments DOM
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const setupForm = document.getElementById('setupForm');
const alertContainer = document.getElementById('alertContainer');
const progressFill = document.getElementById('progressFill');

// Configuration SMTP toggle
const smtpEnabled = document.getElementById('smtpEnabled');
const smtpConfig = document.getElementById('smtpConfig');

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    updateStepDisplay();
    setupEventListeners();
});

function setupEventListeners() {
    // Navigation
    prevBtn.addEventListener('click', () => changeStep(-1));
    nextBtn.addEventListener('click', () => changeStep(1));

    // Soumission
    setupForm.addEventListener('submit', handleSubmit);

    // SMTP toggle
    smtpEnabled.addEventListener('change', (e) => {
        if (e.target.checked) {
            smtpConfig.classList.remove('hidden');
        } else {
            smtpConfig.classList.add('hidden');
        }
    });

    // Password strength
    document.getElementById('adminPassword').addEventListener('input', (e) => {
        updatePasswordStrength(e.target.value, 'adminPasswordStrength');
    });

    document.getElementById('publicPassword').addEventListener('input', (e) => {
        updatePasswordStrength(e.target.value, 'publicPasswordStrength');
    });
}

function changeStep(direction) {
    // Validation avant de passer à l'étape suivante
    if (direction > 0 && !validateCurrentStep()) {
        return;
    }

    currentStep += direction;

    if (currentStep < 1) currentStep = 1;
    if (currentStep > totalSteps) currentStep = totalSteps;

    updateStepDisplay();
}

function updateStepDisplay() {
    // Afficher/masquer les étapes
    document.querySelectorAll('.setup-step').forEach((step, index) => {
        if (index + 1 === currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });

    // Mettre à jour la barre de progression
    const progressSteps = document.querySelectorAll('.progress-step');
    progressSteps.forEach((step, index) => {
        if (index + 1 < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (index + 1 === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });

    // Barre de progression
    const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;
    progressFill.style.width = progressPercent + '%';

    // Boutons
    prevBtn.style.display = currentStep > 1 ? 'block' : 'none';
    nextBtn.style.display = currentStep < totalSteps ? 'block' : 'none';
    submitBtn.style.display = currentStep === totalSteps ? 'block' : 'none';

    // Si on est à l'étape de confirmation, remplir le résumé
    if (currentStep === totalSteps) {
        fillSummary();
    }
}

function validateCurrentStep() {
    clearAlert();

    switch (currentStep) {
        case 1: // Mots de passe
            const adminPassword = document.getElementById('adminPassword').value;
            const adminPasswordConfirm = document.getElementById('adminPasswordConfirm').value;
            const publicPassword = document.getElementById('publicPassword').value;
            const publicPasswordConfirm = document.getElementById('publicPasswordConfirm').value;

            if (!adminPassword || adminPassword.length < 6) {
                showAlert('Le mot de passe administrateur doit contenir au moins 6 caractères.', 'error');
                return false;
            }

            if (adminPassword !== adminPasswordConfirm) {
                showAlert('Les mots de passe administrateur ne correspondent pas.', 'error');
                return false;
            }

            if (!publicPassword || publicPassword.length < 4) {
                showAlert('Le mot de passe invités doit contenir au moins 4 caractères.', 'error');
                return false;
            }

            if (publicPassword !== publicPasswordConfirm) {
                showAlert('Les mots de passe invités ne correspondent pas.', 'error');
                return false;
            }

            if (adminPassword === publicPassword) {
                showAlert('Les mots de passe administrateur et invités doivent être différents.', 'error');
                return false;
            }

            break;

        case 2: // Email
            const adminEmail = document.getElementById('adminEmail').value;
            if (adminEmail && !isValidEmail(adminEmail)) {
                showAlert('L\'adresse email n\'est pas valide.', 'error');
                return false;
            }
            break;

        case 3: // SMTP
            if (smtpEnabled.checked) {
                const smtpHost = document.getElementById('smtpHost').value;
                const smtpUser = document.getElementById('smtpUser').value;
                const smtpPass = document.getElementById('smtpPass').value;

                if (!smtpHost || !smtpUser || !smtpPass) {
                    showAlert('Veuillez remplir tous les champs SMTP ou désactiver les notifications.', 'error');
                    return false;
                }

                if (!isValidEmail(smtpUser)) {
                    showAlert('Le nom d\'utilisateur SMTP doit être une adresse email valide.', 'error');
                    return false;
                }
            }
            break;

        case 4: // Page d'accueil
            const welcomeTitle = document.getElementById('welcomeTitle').value;
            if (!welcomeTitle || welcomeTitle.trim() === '') {
                showAlert('Le titre de la page d\'accueil est requis.', 'error');
                return false;
            }
            break;
    }

    return true;
}

function fillSummary() {
    // Email admin
    const adminEmail = document.getElementById('adminEmail').value || 'Non configuré';
    document.getElementById('summaryAdminEmail').textContent = adminEmail;

    // SMTP
    const smtpEnabledValue = smtpEnabled.checked ? 'Oui' : 'Non';
    document.getElementById('summarySmtpEnabled').textContent = smtpEnabledValue;

    // Page d'accueil
    const welcomeTitle = document.getElementById('welcomeTitle').value;
    const welcomeMessage = document.getElementById('welcomeMessage').value;

    document.getElementById('summaryWelcomeTitle').textContent = welcomeTitle;
    document.getElementById('summaryWelcomeMessage').textContent =
        welcomeMessage.length > 100 ? welcomeMessage.substring(0, 100) + '...' : welcomeMessage;
}

async function handleSubmit(e) {
    e.preventDefault();

    if (!validateCurrentStep()) {
        return;
    }

    // Désactiver le bouton
    submitBtn.disabled = true;
    submitBtn.textContent = 'Configuration en cours...';

    try {
        // Préparer les données
        const setupData = {
            adminPassword: document.getElementById('adminPassword').value,
            publicPassword: document.getElementById('publicPassword').value,
            adminEmail: document.getElementById('adminEmail').value,
            smtp: {
                enabled: smtpEnabled.checked,
                host: document.getElementById('smtpHost').value,
                port: parseInt(document.getElementById('smtpPort').value) || 587,
                secure: document.getElementById('smtpSecure').checked,
                user: document.getElementById('smtpUser').value,
                pass: document.getElementById('smtpPass').value
            },
            welcome: {
                title: document.getElementById('welcomeTitle').value,
                message: document.getElementById('welcomeMessage').value,
                image: document.getElementById('welcomeImage').value
            }
        };

        // Envoyer au serveur
        const response = await fetch('/api/setup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(setupData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showAlert('Configuration réussie ! Redirection...', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            throw new Error(result.message || 'Erreur lors de la configuration');
        }
    } catch (error) {
        console.error('Erreur setup:', error);
        showAlert('Erreur : ' + error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Finaliser la configuration';
    }
}

function updatePasswordStrength(password, elementId) {
    const strengthBar = document.getElementById(elementId);

    if (!password) {
        strengthBar.className = 'password-strength';
        return;
    }

    let strength = 0;

    // Longueur
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;

    // Complexité
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    strengthBar.className = 'password-strength';

    if (strength <= 2) {
        strengthBar.classList.add('strength-weak');
    } else if (strength <= 4) {
        strengthBar.classList.add('strength-medium');
    } else {
        strengthBar.classList.add('strength-strong');
    }
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showAlert(message, type = 'error') {
    const alertClass = type === 'error' ? 'alert-error' : 'alert-success';
    alertContainer.innerHTML = `
        <div class="alert ${alertClass}">
            ${message}
        </div>
    `;

    // Scroll vers le haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearAlert() {
    alertContainer.innerHTML = '';
}
