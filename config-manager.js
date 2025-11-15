const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const CONFIG_FILE = path.join(__dirname, 'app-config.json');
const SALT_ROUNDS = 10;

class ConfigManager {
  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Charge la configuration depuis le fichier JSON
   */
  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
    }
    return null;
  }

  /**
   * Sauvegarde la configuration dans le fichier JSON
   */
  saveConfig(config) {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
      this.config = config;
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la configuration:', error);
      return false;
    }
  }

  /**
   * Vérifie si le setup initial a été effectué
   */
  isSetupComplete() {
    return this.config !== null && this.config.setupComplete === true;
  }

  /**
   * Initialise la configuration avec les données du setup
   */
  async initializeSetup(setupData) {
    const {
      adminPassword,
      publicPassword,
      adminEmail,
      smtp,
      welcome
    } = setupData;

    // Hash des mots de passe
    const hashedAdminPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);
    const hashedPublicPassword = await bcrypt.hash(publicPassword, SALT_ROUNDS);

    const config = {
      setupComplete: true,
      adminPasswordHash: hashedAdminPassword,
      publicPasswordHash: hashedPublicPassword,
      adminEmail: adminEmail || '',
      smtp: {
        enabled: smtp?.enabled || false,
        host: smtp?.host || '',
        port: smtp?.port || 587,
        secure: smtp?.secure || false,
        user: smtp?.user || '',
        pass: smtp?.pass || ''
      },
      welcome: {
        title: welcome?.title || 'Émilie & Maxime',
        message: welcome?.message || 'Merci d\'être venus célébrer notre mariage avec nous !',
        image: welcome?.image || '/images/welcome.jpg'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return this.saveConfig(config);
  }

  /**
   * Vérifie un mot de passe admin
   */
  async verifyAdminPassword(password) {
    if (!this.config || !this.config.adminPasswordHash) {
      return false;
    }
    return await bcrypt.compare(password, this.config.adminPasswordHash);
  }

  /**
   * Vérifie un mot de passe public
   */
  async verifyPublicPassword(password) {
    if (!this.config || !this.config.publicPasswordHash) {
      return false;
    }
    return await bcrypt.compare(password, this.config.publicPasswordHash);
  }

  /**
   * Met à jour le mot de passe admin
   */
  async updateAdminPassword(newPassword) {
    if (!this.config) return false;

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    this.config.adminPasswordHash = hashedPassword;
    this.config.updatedAt = new Date().toISOString();

    return this.saveConfig(this.config);
  }

  /**
   * Met à jour le mot de passe public
   */
  async updatePublicPassword(newPassword) {
    if (!this.config) return false;

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    this.config.publicPasswordHash = hashedPassword;
    this.config.updatedAt = new Date().toISOString();

    return this.saveConfig(this.config);
  }

  /**
   * Met à jour l'email admin
   */
  updateAdminEmail(email) {
    if (!this.config) return false;

    this.config.adminEmail = email;
    this.config.updatedAt = new Date().toISOString();

    return this.saveConfig(this.config);
  }

  /**
   * Met à jour la configuration SMTP
   */
  updateSmtpConfig(smtp) {
    if (!this.config) return false;

    this.config.smtp = {
      enabled: smtp.enabled || false,
      host: smtp.host || '',
      port: smtp.port || 587,
      secure: smtp.secure || false,
      user: smtp.user || '',
      pass: smtp.pass || ''
    };
    this.config.updatedAt = new Date().toISOString();

    return this.saveConfig(this.config);
  }

  /**
   * Met à jour la configuration de la page d'accueil
   */
  updateWelcomeConfig(welcome) {
    if (!this.config) return false;

    this.config.welcome = {
      title: welcome.title || 'Émilie & Maxime',
      message: welcome.message || '',
      image: welcome.image || '/images/welcome.jpg'
    };
    this.config.updatedAt = new Date().toISOString();

    return this.saveConfig(this.config);
  }

  /**
   * Récupère la configuration SMTP
   */
  getSmtpConfig() {
    return this.config?.smtp || null;
  }

  /**
   * Récupère la configuration de la page d'accueil
   */
  getWelcomeConfig() {
    return this.config?.welcome || {
      title: 'Émilie & Maxime',
      message: 'Merci d\'être venus célébrer notre mariage avec nous !',
      image: '/images/welcome.jpg'
    };
  }

  /**
   * Récupère l'email admin
   */
  getAdminEmail() {
    return this.config?.adminEmail || '';
  }

  /**
   * Récupère la configuration complète (sans les mots de passe)
   */
  getPublicConfig() {
    if (!this.config) return null;

    return {
      adminEmail: this.config.adminEmail,
      smtp: {
        enabled: this.config.smtp.enabled,
        host: this.config.smtp.host,
        port: this.config.smtp.port,
        secure: this.config.smtp.secure,
        user: this.config.smtp.user,
        // On ne renvoie pas le mot de passe SMTP
      },
      welcome: this.config.welcome,
      updatedAt: this.config.updatedAt
    };
  }
}

// Export singleton
module.exports = new ConfigManager();
