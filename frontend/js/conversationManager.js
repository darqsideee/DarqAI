class ConversationManager {
    constructor() {
        this.storageKeys = {
            HISTORY: 'darqai_history_v2',
            CUSTOM: 'darqai_custom_v2', 
            LANG: 'darqai_lang_v2',
            LEARNING: 'darqai_learning_stats'
        };
        
        this.history = [];
        this.currentConversationId = null;
        this.learningStats = {
            totalConversations: 0,
            patternsUsed: 0,
            successRate: 0
        };
        
        this.loadFromStorage();
    }

    loadFromStorage() {
        this.history = JSON.parse(localStorage.getItem(this.storageKeys.HISTORY) || '[]');
        this.learningStats = JSON.parse(localStorage.getItem(this.storageKeys.LEARNING) || JSON.stringify(this.learningStats));
    }

    saveToStorage() {
        localStorage.setItem(this.storageKeys.HISTORY, JSON.stringify(this.history));
        localStorage.setItem(this.storageKeys.LEARNING, JSON.stringify(this.learningStats));
    }

    newConversation() {
        const conversation = {
            id: Date.now(),
            title: 'Nová konverzace',
            messages: [],
            createdAt: new Date().toISOString(),
            language: this.getPreferredLanguage()
        };
        
        this.history.push(conversation);
        this.currentConversationId = conversation.id;
        localStorage.setItem('darqai_active', conversation.id);
        this.saveToStorage();
        
        return conversation;
    }

    getActiveConversation() {
        return this.history.find(conv => conv.id === this.currentConversationId);
    }

    loadConversation(conversationId) {
        const conversation = this.history.find(conv => conv.id === conversationId);
        if (conversation) {
            this.currentConversationId = conversationId;
            localStorage.setItem('darqai_active', conversationId);
        }
        return conversation;
    }

    addMessage(role, text, source = null) {
        const conversation = this.getActiveConversation();
        if (!conversation) return;

        conversation.messages.push({
            role,
            text,
            source,
            timestamp: new Date().toISOString()
        });

        if (role === 'user' && conversation.title === 'Nová konverzace') {
            conversation.title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
        }

        this.saveToStorage();
    }

    getConversationHistory() {
        return this.history.slice().reverse();
    }

    getPreferredLanguage() {
        return localStorage.getItem(this.storageKeys.LANG) || 'cs';
    }

    getCustomInstructions() {
        return localStorage.getItem(this.storageKeys.CUSTOM) || '';
    }

    updateLearningStats(patternUsed = false) {
        if (patternUsed) {
            this.learningStats.patternsUsed++;
        }
        this.learningStats.totalConversations++;
        
        this.learningStats.successRate = this.learningStats.totalConversations > 0 
            ? Math.round((this.learningStats.patternsUsed / this.learningStats.totalConversations) * 100)
            : 0;
            
        this.saveToStorage();
    }

    async saveConversationToBackend(query, reply, language) {
        try {
            await fetch('/api/conversation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, reply, language })
            });
            this.updateLearningStats(true);
        } catch (error) {
            console.error('Chyba při ukládání konverzace:', error);
        }
    }

    async exportConversations() {
        const data = {
            conversations: this.history,
            stats: this.learningStats,
            exportDate: new Date().toISOString(),
            version: '2.0'
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `darqai-conversations-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }
}
