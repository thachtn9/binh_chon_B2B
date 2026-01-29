import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
    categories,
    sampleNominees,
    defaultSettings,
    formatCurrency,
    isVotingOpen,
    getVotingStatusMessage,
    getSettings,
    fetchNominees,
    getNomineesForCategory,
    getNomineeById,
    submitVotesToDB,
    getUserVoteHistory,
    getTotalPrize,
    isDemoMode
} from '../lib/supabase'

const VoteContext = createContext({})

// Calculate total required selections (including sub-categories)
const getTotalRequiredSelections = () => {
    let count = 0
    categories.forEach(cat => {
        if (cat.sub_categories) {
            count += cat.sub_categories.length
        } else {
            count += 1
        }
    })
    return count
}

const TOTAL_CATEGORIES = getTotalRequiredSelections() // 8 total (3 for Star Performer + 5 others)

export function VoteProvider({ children }) {
    const [selections, setSelections] = useState({}) // { categoryId or subCategoryId: nomineeId }
    const [voteHistory, setVoteHistory] = useState([])
    const [totalPrize, setTotalPrize] = useState(0)
    const [totalVotes, setTotalVotes] = useState(0)
    const [settings, setSettings] = useState(defaultSettings)
    const [settingsLoading, setSettingsLoading] = useState(true)
    const [donateAmount, setDonateAmount] = useState(0)

    // Nominees from database
    const [nominees, setNominees] = useState(sampleNominees)
    const [nomineesLoading, setNomineesLoading] = useState(true)

    // Load nominees from database
    useEffect(() => {
        async function loadNominees() {
            try {
                const dbNominees = await fetchNominees()
                setNominees(dbNominees)
            } catch (error) {
                console.error('Error loading nominees:', error)
                setNominees(sampleNominees)
            } finally {
                setNomineesLoading(false)
            }
        }
        loadNominees()
    }, [])

    // Load settings from database
    useEffect(() => {
        async function loadSettings() {
            try {
                const dbSettings = await getSettings()
                setSettings(dbSettings)
                setDonateAmount(dbSettings.donate_amount || 0)
            } catch (error) {
                console.error('Error loading settings:', error)
            } finally {
                setSettingsLoading(false)
            }
        }
        loadSettings()
    }, [])

    // Load total prize from database
    useEffect(() => {
        async function loadTotalPrize() {
            try {
                const prizeData = await getTotalPrize()
                setTotalPrize(prizeData.total_prize_value || 0)
                setTotalVotes(prizeData.total_sessions || 0)
            } catch (error) {
                console.error('Error loading total prize:', error)
            }
        }
        loadTotalPrize()
    }, [])

    // Load saved data from localStorage (for demo mode or offline)
    useEffect(() => {
        if (isDemoMode) {
            const savedHistory = localStorage.getItem('voteHistory')
            const savedTotalPrize = localStorage.getItem('totalPrize')
            const savedTotalVotes = localStorage.getItem('totalVotes')

            if (savedHistory) {
                try {
                    setVoteHistory(JSON.parse(savedHistory))
                } catch (e) {
                    console.error('Error parsing vote history:', e)
                }
            }

            if (savedTotalPrize) {
                setTotalPrize(parseInt(savedTotalPrize) || 0)
            }

            if (savedTotalVotes) {
                setTotalVotes(parseInt(savedTotalVotes) || 0)
            }
        }
    }, [])

    // Get vote cost from settings
    const VOTE_COST = settings.vote_cost || defaultSettings.vote_cost

    // Select a nominee for a category or sub-category
    // selections now stores { categoryId: { nomineeId, predictedCount } }
    const selectNominee = (categoryId, nomineeId, predictedCount = 0) => {
        setSelections(prev => ({
            ...prev,
            [categoryId]: { nomineeId, predictedCount }
        }))
    }

    // Update predicted count for a category
    const updatePredictedCount = (categoryId, predictedCount) => {
        setSelections(prev => {
            if (!prev[categoryId]) return prev
            return {
                ...prev,
                [categoryId]: { ...prev[categoryId], predictedCount }
            }
        })
    }

    // Clear selection for a category
    const clearSelection = (categoryId) => {
        setSelections(prev => {
            const newSelections = { ...prev }
            delete newSelections[categoryId]
            return newSelections
        })
    }

    // Clear all selections
    const clearAllSelections = () => {
        setSelections({})
    }

    // Get all required selection IDs (including sub-categories)
    const getAllRequiredSelectionIds = () => {
        const ids = []
        categories.forEach(cat => {
            if (cat.sub_categories) {
                cat.sub_categories.forEach(sub => ids.push(sub.id))
            } else {
                ids.push(cat.id)
            }
        })
        return ids
    }

    // Check if all categories are selected (including sub-categories)
    const isAllSelected = () => {
        const requiredIds = getAllRequiredSelectionIds()
        return requiredIds.every(id => selections[id]?.nomineeId)
    }

    // Get remaining categories/sub-categories to select
    const getRemainingItems = () => {
        const remaining = []
        categories.forEach(cat => {
            if (cat.sub_categories) {
                cat.sub_categories.forEach(sub => {
                    if (!selections[sub.id]?.nomineeId) {
                        remaining.push({
                            id: sub.id,
                            name: `${cat.name} - ${sub.name}`,
                            icon: cat.icon
                        })
                    }
                })
            } else {
                if (!selections[cat.id]?.nomineeId) {
                    remaining.push({
                        id: cat.id,
                        name: cat.name,
                        icon: cat.icon
                    })
                }
            }
        })
        return remaining
    }

    // Check if voting is currently open
    const checkVotingOpen = useCallback(() => {
        return isVotingOpen(settings)
    }, [settings])

    // Get voting status message
    const getVotingStatus = useCallback(() => {
        return getVotingStatusMessage(settings)
    }, [settings])

    // Get nominees for a specific category
    const getNomineesForCategoryWithData = useCallback((category, subCategoryId = null) => {
        return getNomineesForCategory(category, subCategoryId, nominees)
    }, [nominees])

    // Get nominee by ID
    const getNomineeByIdWithData = useCallback((nomineeId) => {
        return getNomineeById(nomineeId, nominees)
    }, [nominees])

    /**
     * Submit all votes
     * @param {Object} authUser - Auth user object (from supabase auth)
     * @param {Object} voteUser - User from users table (from AuthContext.voteUser)
     * @param {boolean} canVote - Permission to vote (from AuthContext.canVote)
     */
    const submitVotes = async (authUser, voteUser, canVote) => {
        // Check vote permission
        if (!canVote) {
            throw new Error('Bạn không có quyền dự đoán. Vui lòng liên hệ Admin.')
        }

        // Check if voting is open
        if (!checkVotingOpen()) {
            const status = getVotingStatus()
            throw new Error(status.message)
        }

        // Validate at least one category is selected
        if (Object.keys(selections).length === 0) {
            throw new Error('Vui lòng chọn ít nhất một hạng mục để dự đoán')
        }

        const votes = Object.entries(selections).map(([categoryId, selection]) => {
            const { nomineeId, predictedCount = 0 } = selection
            // Find category or sub-category info
            let categoryName = ''
            let categoryIcon = ''

            for (const cat of categories) {
                if (cat.id === categoryId) {
                    categoryName = cat.name
                    categoryIcon = cat.icon
                    break
                }
                if (cat.sub_categories) {
                    const sub = cat.sub_categories.find(s => s.id === categoryId)
                    if (sub) {
                        categoryName = `${cat.name} - ${sub.name}`
                        categoryIcon = cat.icon
                        break
                    }
                }
            }

            const nominee = getNomineeByIdWithData(nomineeId)
            return {
                category_id: categoryId,
                category_name: categoryName,
                category_icon: categoryIcon,
                nominee_id: nomineeId,
                nominee_name: nominee?.user_name,
                nominee_avatar: nominee?.url_avatar,
                predicted_count: predictedCount,
                amount: VOTE_COST // Mỗi hạng mục có chi phí vote_cost
            }
        })

        const voterName = voteUser?.user_name || authUser?.user_metadata?.full_name || 'Anonymous'
        const voterEmail = authUser?.email || 'anonymous'
        const voterId = voteUser?.id || null

        const voteSession = {
            id: Date.now().toString(),
            voter_id: voterId,
            voter_email: voterEmail,
            voter_name: voterName,
            votes,
            total_categories: votes.length,
            total_amount: VOTE_COST * votes.length, // Tổng tiền = số hạng mục × vote_cost
            created_at: new Date().toISOString()
        }

        // Try to submit to database
        if (!isDemoMode && voterId) {
            try {
                const totalAmount = VOTE_COST * votes.length
                const dbSession = await submitVotesToDB(
                    voterId,
                    voterEmail,
                    voterName,
                    votes,
                    totalAmount
                )
                voteSession.id = dbSession.id
            } catch (dbError) {
                console.error('Database error, falling back to localStorage:', dbError)
                // In production mode, if DB fails, throw error
                if (!isDemoMode) {
                    throw new Error('Lỗi lưu phiếu bầu. Vui lòng thử lại.')
                }
            }
        }

        // Update state
        const totalAmount = VOTE_COST * votes.length
        const newHistory = [voteSession, ...voteHistory]
        const newTotalPrize = totalPrize + totalAmount
        const newTotalVotes = totalVotes + 1 // Count as 1 vote session

        setVoteHistory(newHistory)
        setTotalPrize(newTotalPrize)
        setTotalVotes(newTotalVotes)
        setSelections({})

        // Save to localStorage (for demo mode or backup)
        if (isDemoMode) {
            localStorage.setItem('voteHistory', JSON.stringify(newHistory))
            localStorage.setItem('totalPrize', newTotalPrize.toString())
            localStorage.setItem('totalVotes', newTotalVotes.toString())
        }

        return voteSession
    }

    // Get user's vote history
    const getUserHistory = (userEmail) => {
        return voteHistory.filter(session => session.voter_email === userEmail)
    }

    // Get user's total spent
    const getUserTotalSpent = (userEmail) => {
        return getUserHistory(userEmail).reduce((sum, session) => sum + session.total_amount, 0)
    }

    /**
     * Đếm số lần user đã vote cho một nominee trong một category
     * @param {string} categoryId - ID của category hoặc sub-category
     * @param {string} nomineeId - ID của nominee
     * @returns {number} - Số lần đã vote
     */
    const getUserVoteCountForNominee = useCallback((categoryId, nomineeId) => {
        let count = 0
        voteHistory.forEach(session => {
            session.votes?.forEach(vote => {
                if (vote.category_id === categoryId && vote.nominee_id === nomineeId) {
                    count++
                }
            })
        })
        return count
    }, [voteHistory])

    // Load user's vote history from database
    const loadUserHistory = useCallback(async (userId) => {
        if (isDemoMode || !userId) return

        try {
            const history = await getUserVoteHistory(userId)
            if (history && history.length > 0) {
                // Transform data from database to match expected format
                const transformedHistory = history.map(session => {
                    // Get category icon from config
                    const getCategoryIcon = (categoryId) => {
                        for (const cat of categories) {
                            if (cat.id === categoryId) {
                                return cat.icon
                            }
                            if (cat.sub_categories) {
                                const sub = cat.sub_categories.find(s => s.id === categoryId)
                                if (sub) {
                                    return cat.icon
                                }
                            }
                        }
                        return '🗳️'
                    }

                    return {
                        ...session,
                        votes: session.votes?.map(vote => ({
                            ...vote,
                            category_icon: getCategoryIcon(vote.category_id),
                            nominee_name: vote.nominee?.user_name || 'Unknown',
                            nominee_avatar: vote.nominee?.url_avatar || null
                        })) || []
                    }
                })
                setVoteHistory(transformedHistory)
            }
        } catch (error) {
            console.error('Error loading user history:', error)
        }
    }, [])

    const value = {
        // Data
        selections,
        voteHistory,
        totalPrize,
        totalVotes,
        settings,
        settingsLoading,
        nominees,
        nomineesLoading,
        categories, // Re-export for convenience
        VOTE_COST,
        TOTAL_CATEGORIES,

        // Actions
        selectNominee,
        updatePredictedCount,
        clearSelection,
        clearAllSelections,
        submitVotes,
        getUserHistory,
        getUserTotalSpent,
        getUserVoteCountForNominee,
        loadUserHistory,

        // Helpers
        getNomineesForCategory: getNomineesForCategoryWithData,
        getNomineeById: getNomineeByIdWithData,

        // Voting status
        isVotingOpen: checkVotingOpen(),
        votingStatus: getVotingStatus(),

        // Computed values
        selectedCount: Object.keys(selections).length,
        isAllSelected: isAllSelected(),
        remainingItems: getRemainingItems(),
        remainingCount: TOTAL_CATEGORIES - Object.keys(selections).length,
        voteAmount: VOTE_COST,
        voteAmountFormatted: formatCurrency(VOTE_COST),
        totalSelectedAmount: VOTE_COST * Object.keys(selections).length,
        totalSelectedAmountFormatted: formatCurrency(VOTE_COST * Object.keys(selections).length),

        // Donate and total prize
        donateAmount,
        totalPrizeWithDonate: totalPrize + donateAmount,
        totalPrizeWithDonateFormatted: formatCurrency(totalPrize + donateAmount)
    }

    return (
        <VoteContext.Provider value={value}>
            {children}
        </VoteContext.Provider>
    )
}

export function useVote() {
    const context = useContext(VoteContext)
    if (!context) {
        throw new Error('useVote must be used within a VoteProvider')
    }
    return context
}
