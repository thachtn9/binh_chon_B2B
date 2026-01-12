import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isDemoMode, checkVotePermission } from '../lib/supabase'
import { googleAuth } from '../lib/googleAuth'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    // Quyền bình chọn
    const [canVote, setCanVote] = useState(false)
    const [voteUser, setVoteUser] = useState(null) // User info từ bảng users
    const [permissionMessage, setPermissionMessage] = useState('')
    const [permissionLoading, setPermissionLoading] = useState(false)

    // Check vote permission khi user thay đổi
    useEffect(() => {
        async function checkPermission() {
            if (!user?.email) {
                setCanVote(false)
                setVoteUser(null)
                setPermissionMessage('')
                return
            }

            setPermissionLoading(true)
            try {
                const result = await checkVotePermission(user.email)
                console.log('AuthContext - checkPermission result:', result)
                setCanVote(result.canVote)
                setVoteUser(result.user)
                setPermissionMessage(result.message)
                console.log('AuthContext - canVote set to:', result.canVote)
            } catch (error) {
                console.error('Error checking vote permission:', error)
                setCanVote(false)
                setVoteUser(null)
                setPermissionMessage('Lỗi kiểm tra quyền')
            } finally {
                setPermissionLoading(false)
            }
        }

        checkPermission()
    }, [user])

    // Initialize auth from Google Auth service
    useEffect(() => {
        // Check if already authenticated via Google
        if (googleAuth.isAuthenticated()) {
            const profile = googleAuth.getUserProfile()
            if (profile) {
                setUser({
                    id: profile.id,
                    email: profile.email,
                    user_metadata: {
                        full_name: profile.name,
                        avatar_url: profile.picture
                    }
                })
            }
        }
        setLoading(false)

        // Listen for profile loaded events (async after OAuth callback)
        const unsubscribe = googleAuth.onProfileLoaded((profile) => {
            if (profile) {
                setUser({
                    id: profile.id,
                    email: profile.email,
                    user_metadata: {
                        full_name: profile.name,
                        avatar_url: profile.picture
                    }
                })
            }
        })

        return () => unsubscribe()
    }, [])

    const signInWithGoogle = async () => {
        // Use Google OAuth directly
        googleAuth.login()
    }

    const signOut = async () => {
        setUser(null)
        setCanVote(false)
        setVoteUser(null)
        setPermissionMessage('')
        googleAuth.logout()
    }



    const value = {
        // Auth state
        user,
        loading,

        // Auth actions
        signInWithGoogle,
        signOut,

        isDemoMode,

        // Vote permission
        canVote,
        voteUser, // User info từ bảng users (có id, role, etc.)
        permissionMessage,
        permissionLoading,

        // User info helpers
        userName: voteUser?.full_name || voteUser?.user_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
        userEmail: user?.email || '',
        userAvatar: voteUser?.url_avatar || user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'default'}`,
        userRole: voteUser?.role || null
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
