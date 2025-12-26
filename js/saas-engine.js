/**
 * SaaS Engine - Baterista Portfolio
 * Handles Authentication, Subscription, and Content Management
 * Uses Firebase Modular SDK for backend services
 */

import { auth, db, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, collection, doc, setDoc, getDoc, onSnapshot } from './firebase-config.js';

const SaaS = {
    // Default Data Configuration
    defaults: {
        config: {
            hero: {
                title: "Ritmo, Paixão e Excelência",
                subtitle: "Mais de 25 anos criando grooves poderosos e dinâmicos. Transformando música em experiência através da bateria.",
                buttonText: "Entrar em Contato",
                image: "assets/performance.jpg"
            },
            stats: [
                { number: "25+", label: "Anos de Estrada" },
                { number: "15+", label: "Bandas" },
                { number: "100%", label: "Dedicação" }
            ],
            about: {
                subtitle: "Minha História",
                title: "Muito Mais Que Barulho",
                text: "Comecei minha jornada na bateria aos 9 anos de idade e nunca mais parei. Ao longo dos anos, desenvolvi uma identidade sonora única, focada na precisão, no groove e na musicalidade.\n\nAcredito que a escolha dos pratos e tambores é fundamental para definir a personalidade de cada performance. Por isso, trabalho com equipamentos de alta qualidade que oferecem timbres ricos e projeção equilibrada.",
                image: "assets/about-drums.jpg"
            },
            contact: {
                whatsapp: "5511999999999",
                email: "contato@anselmocardoso.com",
                instagram: "@anselmocardoso"
            },
            videos: [
                { id: "video1", url: "assets/video.mp4", title: "Performance ao Vivo", type: "local" }
            ],
            pricing: [
                { id: 1, title: "Show Corporativo", price: "A consultar", features: ["2h de show", "Equipamento próprio", "Repertório personalizado"] },
                { id: 2, title: "Casamentos", price: "A consultar", features: ["Cerimônia e Festa", "Banda completa ou Trio", "Reunião de alinhamento"] },
                { id: 3, title: "Aulas Particulares", price: "R$ 150/h", features: ["Técnica e Leitura", "Estúdio climatizado", "Material incluso"] }
            ],
            theme: {
                primaryColor: "#ff5500"
            }
        }
    },

    currentUser: null,
    currentConfig: null,

    // Initialization
    init: function() {
        // Auth State Listener
        onAuthStateChanged(auth, user => {
            this.currentUser = user;
            if (user) {
                console.log("User Logged In:", user.email);
                this.loadUserData(user.uid);
            } else {
                console.log("User Logged Out");
                // Check if we are on admin pages
                if (window.location.pathname.includes('admin.html')) {
                    window.location.href = 'login.html';
                }
            }
        });

        // Load Public Config immediately for Index
        if (!window.location.pathname.includes('dashboard')) {
            this.loadPublicConfig();
        }
    },

    // Authentication Methods
    loginWithGoogle: function() {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider)
            .then((result) => {
                const user = result.user;
                // Return the promise from ensureUserDoc so we wait for it
                return this.ensureUserDoc(user).then(() => {
                    return user;
                });
            })
            .catch((error) => {
                console.error("Login Failed", error);
                alert("Erro ao fazer login: " + error.message);
                throw error;
            });
    },

    logout: function() {
        signOut(auth).then(() => {
            window.location.href = 'login.html';
        });
    },

    ensureUserDoc: function(user) {
        const userRef = doc(db, 'users', user.uid);
        // Return the promise chain
        return getDoc(userRef).then((docSnap) => {
            if (!docSnap.exists()) {
                console.log("Creating new user profile for:", user.email);
                // Create new user doc AND sites doc
                const userProfile = {
                    name: user.displayName,
                    email: user.email,
                    photo: user.photoURL,
                    isLogin: false, // As requested: controls editing access
                    subscriptionStatus: 'pending',
                    createdAt: new Date().toISOString()
                };

                // Use Promise.all to wait for both writes
                return Promise.all([
                    setDoc(userRef, userProfile),
                    setDoc(doc(db, 'sites', user.uid), this.defaults.config)
                ]).then(() => {
                    console.log("User profile and default site config created.");
                });
            } else {
                console.log("User profile already exists.");
                return Promise.resolve();
            }
        }).catch(error => {
            console.error("Error checking/creating user doc:", error);
            alert("Erro ao criar perfil de usuário no banco de dados. Verifique o console.");
            throw error;
        });
    },

    loadUserData: function(uid) {
        // Listen to User Profile
        onSnapshot(doc(db, 'users', uid), (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                // Dispatch event for Admin Dashboard to update UI
                window.dispatchEvent(new CustomEvent('saasUserUpdated', { detail: userData }));
            }
        });

        // Listen to Site Config
        onSnapshot(doc(db, 'sites', uid), (docSnap) => {
            if (docSnap.exists()) {
                this.currentConfig = docSnap.data();
                window.dispatchEvent(new CustomEvent('saasConfigUpdated', { detail: this.currentConfig }));
            }
        });
    },

    // Public Load (for Index.html)
    loadPublicConfig: function() {
        // Check if there's a cached config in LocalStorage for faster load
        const cached = localStorage.getItem('saas_config');
        if (cached) {
            this.currentConfig = JSON.parse(cached);
            window.dispatchEvent(new CustomEvent('saasConfigUpdated', { detail: this.currentConfig }));
        }
    },

    // Content Management Methods
    getConfig: function() {
        return this.currentConfig || this.defaults.config;
    },

    saveConfig: function(newConfig) {
        if (!this.currentUser) return Promise.reject("Usuário não logado");
        
        const userRef = doc(db, 'users', this.currentUser.uid);
        return getDoc(userRef).then(docSnap => {
            if (docSnap.exists() && docSnap.data().isLogin === true) {
                return setDoc(doc(db, 'sites', this.currentUser.uid), newConfig)
                    .then(() => {
                        console.log("Config Saved");
                        // Cache locally for index.html usage (simulating public site view)
                        try {
                            localStorage.setItem('saas_config', JSON.stringify(newConfig));
                        } catch (e) {
                            console.error("Erro ao salvar no LocalStorage (provavelmente quota excedida):", e);
                            alert("Atenção: A imagem pode ser muito grande para o cache local. Ela foi salva no servidor, mas pode demorar a aparecer.");
                        }
                    });
            } else {
                return Promise.reject("Permissão negada. Sua conta não está ativa (isLogin = false).");
            }
        });
    },

    updateSection: function(section, data) {
        const config = this.getConfig();
        // Deep merge only for objects, direct assignment for Arrays
        if (Array.isArray(data)) {
            config[section] = data;
        } else {
            config[section] = { ...config[section], ...data };
        }
        return this.saveConfig(config);
    },

    // Utils
    uploadImage: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result); // Still using Base64 for simplicity in Firestore (beware of size limits!)
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }
};

// Auto-init
SaaS.init();

// Export SaaS for use in other modules if needed, or attach to window for global access (legacy support)
window.SaaS = SaaS;
export default SaaS;
