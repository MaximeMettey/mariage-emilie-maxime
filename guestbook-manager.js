const fs = require('fs');
const path = require('path');

const GUESTBOOK_FILE = path.join(__dirname, 'guestbook.json');

class GuestbookManager {
  constructor() {
    this.entries = this.loadEntries();
    this.rateLimit = new Map(); // IP -> dernière soumission
  }

  /**
   * Charge les entrées depuis le fichier JSON
   */
  loadEntries() {
    try {
      if (fs.existsSync(GUESTBOOK_FILE)) {
        const data = fs.readFileSync(GUESTBOOK_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du livre d\'or:', error);
    }
    return { entries: [] };
  }

  /**
   * Sauvegarde les entrées dans le fichier JSON
   */
  saveEntries() {
    try {
      fs.writeFileSync(GUESTBOOK_FILE, JSON.stringify(this.entries, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du livre d\'or:', error);
      return false;
    }
  }

  /**
   * Vérifie le rate limiting (1 message par jour par IP)
   */
  checkRateLimit(ip) {
    const now = Date.now();
    const lastSubmission = this.rateLimit.get(ip);

    if (lastSubmission) {
      const timeDiff = now - lastSubmission;
      const oneDayInMs = 24 * 60 * 60 * 1000;

      if (timeDiff < oneDayInMs) {
        return false; // Trop tôt pour soumettre à nouveau
      }
    }

    return true;
  }

  /**
   * Sanitize le texte pour éviter les injections XSS
   */
  sanitizeText(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Ajoute une nouvelle entrée (en attente de modération)
   */
  addEntry(name, message, ip) {
    // Vérifier le rate limiting
    if (!this.checkRateLimit(ip)) {
      return {
        success: false,
        error: 'Vous avez déjà soumis un message récemment. Veuillez attendre 24 heures.'
      };
    }

    // Valider les données
    if (!name || name.trim().length === 0) {
      return { success: false, error: 'Le nom est requis' };
    }

    if (!message || message.trim().length === 0) {
      return { success: false, error: 'Le message est requis' };
    }

    if (message.length > 500) {
      return { success: false, error: 'Le message est trop long (max 500 caractères)' };
    }

    // Créer l'entrée
    const entry = {
      id: Date.now().toString(),
      name: this.sanitizeText(name.trim()),
      message: this.sanitizeText(message.trim()),
      status: 'pending', // pending, approved, rejected
      createdAt: new Date().toISOString(),
      ip: ip // Stocké pour modération, pas affiché publiquement
    };

    this.entries.entries.push(entry);

    if (this.saveEntries()) {
      // Mettre à jour le rate limit
      this.rateLimit.set(ip, Date.now());

      return {
        success: true,
        message: 'Votre message a été soumis et sera visible après modération',
        entry: {
          id: entry.id,
          name: entry.name,
          message: entry.message,
          createdAt: entry.createdAt
        }
      };
    }

    return { success: false, error: 'Erreur lors de la sauvegarde' };
  }

  /**
   * Récupère les entrées approuvées (pour affichage public)
   */
  getApprovedEntries() {
    return this.entries.entries
      .filter(entry => entry.status === 'approved')
      .map(entry => ({
        id: entry.id,
        name: entry.name,
        message: entry.message,
        createdAt: entry.createdAt
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Récupère toutes les entrées (pour admin)
   */
  getAllEntries() {
    return this.entries.entries
      .map(entry => ({
        id: entry.id,
        name: entry.name,
        message: entry.message,
        status: entry.status,
        createdAt: entry.createdAt,
        ip: entry.ip
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Approuve une entrée
   */
  approveEntry(entryId) {
    const entry = this.entries.entries.find(e => e.id === entryId);

    if (!entry) {
      return { success: false, error: 'Entrée introuvable' };
    }

    entry.status = 'approved';

    if (this.saveEntries()) {
      return { success: true, message: 'Message approuvé' };
    }

    return { success: false, error: 'Erreur lors de la sauvegarde' };
  }

  /**
   * Rejette/supprime une entrée
   */
  rejectEntry(entryId) {
    const index = this.entries.entries.findIndex(e => e.id === entryId);

    if (index === -1) {
      return { success: false, error: 'Entrée introuvable' };
    }

    this.entries.entries.splice(index, 1);

    if (this.saveEntries()) {
      return { success: true, message: 'Message supprimé' };
    }

    return { success: false, error: 'Erreur lors de la sauvegarde' };
  }

  /**
   * Compte les entrées par statut
   */
  getStats() {
    const stats = {
      total: this.entries.entries.length,
      pending: 0,
      approved: 0,
      rejected: 0
    };

    this.entries.entries.forEach(entry => {
      if (entry.status === 'pending') stats.pending++;
      else if (entry.status === 'approved') stats.approved++;
      else if (entry.status === 'rejected') stats.rejected++;
    });

    return stats;
  }
}

// Export singleton
module.exports = new GuestbookManager();
