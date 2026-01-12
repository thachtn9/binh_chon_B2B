/**
 * Google OAuth2 Authentication Service
 * For ISCGP Awards 2025 voting application
 */

// Google OAuth2 Configuration
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "910796299193-gjq2fbkh667jd5b1vkiutfabfbc2qng4.apps.googleusercontent.com";
const SCOPES = "openid email profile";
const REDIRECT_URI = window.location.origin;

/**
 * @typedef {Object} TokenInfo
 * @property {string} access_token
 * @property {number} expires_in
 * @property {string} token_type
 * @property {string} scope
 * @property {number} expires_at
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {string} picture
 */

class GoogleAuthService {
    constructor() {
        /** @type {TokenInfo | null} */
        this.tokenInfo = null;
        /** @type {UserProfile | null} */
        this.userProfile = null;
        this.tokenKey = "google_auth_token";
        this.userKey = "google_user_profile";
        /** @type {Array<(profile: UserProfile | null) => void>} */
        this.profileLoadedCallbacks = [];

        this.loadTokenFromStorage();
        this.loadUserProfileFromStorage();
        this.handleAuthCallback();
    }

    loadTokenFromStorage() {
        try {
            const stored = localStorage.getItem(this.tokenKey);
            if (stored) {
                const token = JSON.parse(stored);
                if (token.expires_at > Date.now()) {
                    this.tokenInfo = token;
                } else {
                    localStorage.removeItem(this.tokenKey);
                }
            }
        } catch (e) {
            console.error("Error loading token from storage:", e);
        }
    }

    loadUserProfileFromStorage() {
        try {
            const stored = localStorage.getItem(this.userKey);
            if (stored) {
                this.userProfile = JSON.parse(stored);
            }
        } catch (e) {
            console.error("Error loading user profile from storage:", e);
        }
    }

    handleAuthCallback() {
        // Check for OAuth callback in URL hash
        const hash = window.location.hash;
        if (hash.includes("access_token")) {
            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get("access_token");
            const expiresIn = params.get("expires_in");
            const tokenType = params.get("token_type");
            const scope = params.get("scope");

            if (accessToken && expiresIn) {
                this.tokenInfo = {
                    access_token: accessToken,
                    expires_in: parseInt(expiresIn, 10),
                    token_type: tokenType || "Bearer",
                    scope: scope || SCOPES,
                    expires_at: Date.now() + parseInt(expiresIn, 10) * 1000,
                };

                localStorage.setItem(this.tokenKey, JSON.stringify(this.tokenInfo));

                // Fetch user profile info
                this.fetchUserProfile(accessToken);

                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.tokenInfo !== null && this.tokenInfo.expires_at > Date.now();
    }

    /**
     * Get access token
     * @returns {string | null}
     */
    getAccessToken() {
        if (this.isAuthenticated()) {
            return this.tokenInfo.access_token;
        }
        return null;
    }

    /**
     * Get user profile
     * @returns {UserProfile | null}
     */
    getUserProfile() {
        return this.userProfile;
    }

    /**
     * Register callback for profile loaded event
     * @param {(profile: UserProfile | null) => void} callback
     * @returns {() => void} Unsubscribe function
     */
    onProfileLoaded(callback) {
        this.profileLoadedCallbacks.push(callback);
        // Return unsubscribe function
        return () => {
            this.profileLoadedCallbacks = this.profileLoadedCallbacks.filter((cb) => cb !== callback);
        };
    }

    notifyProfileLoaded() {
        this.profileLoadedCallbacks.forEach((callback) => callback(this.userProfile));
    }

    /**
     * Fetch user profile from Google API
     * @param {string} accessToken
     */
    async fetchUserProfile(accessToken) {
        try {
            const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                this.userProfile = {
                    id: data.id,
                    email: data.email,
                    name: data.name,
                    picture: data.picture,
                };
                localStorage.setItem(this.userKey, JSON.stringify(this.userProfile));
                this.notifyProfileLoaded();
            } else {
                console.error("Failed to fetch user profile:", response.status, response.statusText);
            }
        } catch (err) {
            console.error("Failed to fetch user profile:", err);
        }
    }

    /**
     * Initiate Google OAuth login
     */
    login() {
        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", CLIENT_ID);
        authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
        authUrl.searchParams.set("response_type", "token");
        authUrl.searchParams.set("scope", SCOPES);
        authUrl.searchParams.set("access_type", "online");
        // Chỉ hiển thị quyền chưa được cấp thay vì tất cả quyền
        authUrl.searchParams.set("prompt", "select_account");

        window.location.href = authUrl.toString();
    }

    /**
     * Logout and clear stored data
     */
    logout() {
        this.tokenInfo = null;
        this.userProfile = null;
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        window.location.reload();
    }
}

export const googleAuth = new GoogleAuthService();
