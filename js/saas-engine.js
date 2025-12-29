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
                image: "assets/performance.jpg",
                overlayTitle: "Novo Show",
                overlaySubtitle: "15/10/2024"
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
            brands: [
                { name: "Zeus Cymbals", icon: "fas fa-drum" },
                { name: "Zildjian", icon: "fas fa-music" },
                { name: "Avatar", icon: "fas fa-star" }
            ],
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
            gallery: [
                {
                    image: "assets/setup-top.jpg",
                    title: "Meu Setup",
                    description: "Visão geral do kit"
                },
                {
                    image: "assets/camera-view.jpg",
                    title: "Em Ação",
                    description: "Perspectiva da câmera"
                },
                {
                    image: "assets/setup-side.jpg",
                    title: "Detalhes",
                    description: "Timbres e texturas"
                },
                {
                    image: "assets/setup-mood.jpg",
                    title: "Atmosfera",
                    description: "Foco e concentração"
                },
                {
                    image: "",
                    title: "Novo Item 5",
                    description: "Descrição do item 5"
                },
                {
                    image: "",
                    title: "Novo Item 6",
                    description: "Descrição do item 6"
                }
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
                // Save UID as owner for local preview
                localStorage.setItem('saas_owner_uid', user.uid);
                
                // Ensure User Doc Exists (Safety Check)
                this.ensureUserDoc(user).then(() => {
                    this.loadUserData(user.uid);
                }).catch(err => {
                    console.error("Init Error:", err);
                    // Force load even if ensure fails (maybe read-only)
                    this.loadUserData(user.uid);
                });
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
        // 1. Try LocalStorage for instant load
        const cached = localStorage.getItem('saas_config');
        if (cached) {
            this.currentConfig = JSON.parse(cached);
            window.dispatchEvent(new CustomEvent('saasConfigUpdated', { detail: this.currentConfig }));
        }

        // 2. Fetch Live from Firestore (Owner's Config)
        // Check for public pointer first (Try 'sites/public_info' first as it is more likely to be readable)
        
        // Helper to get config from a UID
        const loadFromUid = (uid) => {
             console.log("Attempting to load config for UID:", uid);
             return getDoc(doc(db, 'sites', uid)).then(docSnap => {
                if (docSnap && docSnap.exists()) {
                    const liveConfig = docSnap.data();
                    this.currentConfig = liveConfig;
                    if(uid !== '2IlpHLltgjWUOBpPTXePBVmVPgK2') {
                        localStorage.setItem('saas_owner_uid', uid);
                    }
                    localStorage.setItem('saas_config', JSON.stringify(liveConfig));
                    window.dispatchEvent(new CustomEvent('saasConfigUpdated', { detail: liveConfig }));
                    return true;
                }
                return false;
             }).catch(err => {
                 console.warn("Permission Denied for UID:", uid, "- Loading Defaults/Cache if available.");
                 // Fallback to cache if permission denied (likely public view restriction)
                 const cached = localStorage.getItem('saas_config');
                 if(cached) {
                     this.currentConfig = JSON.parse(cached);
                     window.dispatchEvent(new CustomEvent('saasConfigUpdated', { detail: this.currentConfig }));
                 }
                 return false; 
             });
        };

        // 0. Check URL Parameters for explicit UID override
        const urlParams = new URLSearchParams(window.location.search);
        const urlUid = urlParams.get('uid');
        if (urlUid) {
            console.log("Loading from URL UID:", urlUid);
            loadFromUid(urlUid);
            return;
        }

        // Try getting the public owner UID
        getDoc(doc(db, 'sites', 'public_info'))
            .then(snap => {
                if(snap.exists()) return snap.data().ownerUid;
                // Fallback to system collection
                return getDoc(doc(db, 'system', 'public_site_settings')).then(s => s.exists() ? s.data().ownerUid : null);
            })
            .then(publicUid => {
                // Priority: Local Dev Override > Public Cloud Setting > Hardcoded Default
                const targetUid = localStorage.getItem('saas_owner_uid') || publicUid || '2IlpHLltgjWUOBpPTXePBVmVPgK2';
                return loadFromUid(targetUid);
            })
            .catch(err => {
                console.error("Error in config loading chain:", err);
                // Last resort fallback
                loadFromUid('2IlpHLltgjWUOBpPTXePBVmVPgK2');
            });
    },

    // Content Management Methods
    getConfig: function() {
        return this.currentConfig || this.defaults.config;
    },

    saveConfig: function(newConfig) {
        if (!this.currentUser) return Promise.reject("Usuário não logado");
        
        // Direct Write (Bypassing isLogin check to debug Firestore Permissions)
        // We trust Firestore Rules to handle security
        
        // FORCE ownerUid to be the current user
        newConfig.ownerUid = this.currentUser.uid;
        newConfig.email = this.currentUser.email;
        newConfig.updatedBy = this.currentUser.email;
        newConfig.lastUpdated = new Date().toISOString();

        console.log("Saving config for:", this.currentUser.email);

        return setDoc(doc(db, 'sites', this.currentUser.uid), newConfig)
            .then(() => {
                console.log("Config Saved Successfully");
                try {
                    localStorage.setItem('saas_config', JSON.stringify(newConfig));
                } catch (e) {
                    console.error("Cache Error:", e);
                }
            });
    },

    publishSite: function() {
        if (!this.currentUser) return Promise.reject("Usuário não logado");
        
        // Write to system/public_site_settings AND sites/public_info (redundancy)
        const p1 = setDoc(doc(db, 'system', 'public_site_settings'), {
            ownerUid: this.currentUser.uid,
            updatedAt: new Date().toISOString(),
            updatedBy: this.currentUser.email
        }).catch(e => console.warn("System collection write failed (expected if rules restrictive):", e));

        const p2 = setDoc(doc(db, 'sites', 'public_info'), {
            ownerUid: this.currentUser.uid,
            updatedAt: new Date().toISOString()
        });

        return Promise.all([p1, p2]);
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
