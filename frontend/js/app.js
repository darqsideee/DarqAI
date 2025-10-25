class DarqAIApp {
    constructor() {
        this.patternMatcher = new PatternMatcher();
        this.conversationManager = new ConversationManager();
        this.isProcessing = false;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeApp();
    }

    initializeElements() {
        this.elements = {
            history: document.getElementById('history'),
            messages: document.getElementById('messages'),
            input: document.getElementById('input'),
            send: document.getElementById('send'),
            newChat: document.getElementById('new-chat'),
            modal: document.getElementById('modal'),
            openCustom: document.getElementById('open-custom'),
            cancelModal: document.getElementById('cancel-modal'),
            saveModal: document.getElementById('save-modal'),
            custom: document.getElementById('custom'),
            langSelect: document.getElementById('lang-select'),
            patternsModal: document.getElementById('patterns-modal'),
            managePatterns: document.getElementById('manage-patterns'),
            closePatterns: document.getElementById('close-patterns'),
            exportPatterns: document.getElementById('export-patterns'),
            refreshPatterns: document.getElementById('refresh-patterns'),
            patternsList: document.getElementById('patterns-list'),
            statsConversations: document.getElementById('stats-conversations'),
            statsPatterns: document.getElementById('stats-patterns'),
            statsSuccess: document.getElementById('stats-success')
        };
    }

    initializeEventListeners() {
        this.elements.send.addEventListener('click', () => this.sendMessage());
        this.elements.newChat.addEventListener('click', () => this.newConversation());
        this.elements.input.addEventListener('keydown', (e) => this.handleInputKeydown(e));
        
        this.elements.openCustom.addEventListener('click', () => this.openModal());
        this.elements.managePatterns.addEventListener('click', () => this.showPatternsModal());
        
        this.elements.cancelModal.addEventListener('click', () => this.closeModal());
        this.elements.saveModal.addEventListener('click', () => this.saveSettings());
        
        this.elements.closePatterns.addEventListener('click', () => this.closePatternsModal());
        this.elements.exportPatterns.addEventListener('click', () => this.exportPatterns());
        this.elements.refreshPatterns.addEventListener('click', () => this.refreshPatternsData());

        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.closeModal();
        });
        
        this.elements.patternsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.patternsModal) this.closePatternsModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closePatternsModal();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.elements.input.focus();
            }
        });
    }

    async initializeApp() {
        this.loadSettings();
        this.renderHistory();
        this.renderActiveCustom();
        await this.patternMatcher.loadPatterns(this.conversationManager.getPreferredLanguage());
        
        const activeId = localStorage.getItem('darqai_active');
        if (activeId && this.conversationManager.history.length > 0) {
            const conversation = this.conversationManager.loadConversation(parseInt(activeId));
            if (conversation) {
                this.loadConversation(conversation);
            } else {
                this.newConversation();
            }
        } else if (this.conversationManager.history.length === 0) {
            this.newConversation();
        }
        
        this.elements.input.focus();
    }

    loadSettings() {
        this.elements.custom.value = this.conversationManager.getCustomInstructions();
        this.elements.langSelect.value = this.conversationManager.getPreferredLanguage();
    }

    async sendMessage() {
        const text = this.elements.input.value.trim();
        if (!text || this.isProcessing) return;
        
        this.isProcessing = true;
        this.elements.input.value = '';
        this.elements.send.disabled = true;
        
        this.appendMessage('user', text);
        this.conversationManager.addMessage('user', text);

        const typingMsg = this.appendTypingIndicator();
        
        try {
            const localPattern = this.patternMatcher.findBestMatch(text);
            if (localPattern && Math.random() > 0.3) {
                this.removeTypingIndicator(typingMsg);
                const adaptedReply = this.patternMatcher.adaptResponse(
                    localPattern.reply, 
                    text, 
                    localPattern.query
                );
                this.appendMessage('bot', adaptedReply, 'conversation_pattern');
                this.conversationManager.addMessage('bot', adaptedReply, 'conversation_pattern');
                await this.conversationManager.saveConversationToBackend(text, adaptedReply, this.conversationManager.getPreferredLanguage());
                this.isProcessing = false;
                this.elements.send.disabled = false;
                return;
            }

            const response = await fetch(`/api/search?query=${encodeURIComponent(text)}&lang=${this.conversationManager.getPreferredLanguage()}`);
            if (response.ok) {
                const data = await response.json();
                this.removeTypingIndicator(typingMsg);
                this.appendMessage('bot', data.reply, data.source);
                this.conversationManager.addMessage('bot', data.reply, data.source);
                
                if (data.source === 'fresh') {
                    await this.conversationManager.saveConversationToBackend(text, data.reply, this.conversationManager.getPreferredLanguage());
                }
            } else {
                throw new Error('Server error: ' + response.status);
            }
        } catch (error) {
            this.removeTypingIndicator(typingMsg);
            const errorMsg = 'Omlouvám se, došlo k chybě při zpracování vašeho dotazu.';
            this.appendMessage('bot', errorMsg, 'error');
            this.conversationManager.addMessage('bot', errorMsg, 'error');
            console.error('Chyba:', error);
        }
        
        this.isProcessing = false;
        this.elements.send.disabled = false;
    }

    appendMessage(role, text, source = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `msg ${role}`;
        
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.innerHTML = text;
        
        if (source && role === 'bot') {
            const badge = document.createElement('div');
            badge.className = 'source-badge';
            badge.textContent = `Zdroj: ${this.getSourceName(source)}`;
            bubble.appendChild(badge);
        }
        
        messageDiv.appendChild(bubble);
        this.elements.messages.appendChild(messageDiv);
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        
        if (role === 'bot') {
            setTimeout(() => Prism.highlightAll(), 100);
        }
    }

    appendTypingIndicator() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'msg bot';
        
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        
        const typing = document.createElement('div');
        typing.className = 'typing-indicator';
        typing.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        
        bubble.appendChild(typing);
        messageDiv.appendChild(bubble);
        this.elements.messages.appendChild(messageDiv);
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        
        return messageDiv;
    }

    removeTypingIndicator(typingElement) {
        if (typingElement && typingElement.parentNode) {
            typingElement.remove();
        }
    }

    getSourceName(source) {
        const sources = {
            'cache': 'Cache',
            'conversation_pattern': 'Konverzační paměť',
            'fresh': 'Nové vyhledávání',
            'error': 'Chyba'
        };
        return sources[source] || source;
    }

    newConversation() {
        const conversation = this.conversationManager.newConversation();
        this.elements.messages.innerHTML = '';
        this.renderHistory();
    }

    loadConversation(conversation) {
        this.elements.messages.innerHTML = '';
        conversation.messages.forEach(msg => {
            this.appendMessage(msg.role, msg.text, msg.source);
        });
        this.renderHistory();
    }

    renderHistory() {
        this.elements.history.innerHTML = '';
        const conversations = this.conversationManager.getConversationHistory();
        
        if (conversations.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'history-item';
            emptyMsg.textContent = 'Žádné konverzace — začni nový rozhovor';
            this.elements.history.appendChild(emptyMsg);
            return;
        }
        
        conversations.forEach(conversation => {
            const item = document.createElement('div');
            item.className = 'history-item';
            if (conversation.id === this.conversationManager.currentConversationId) {
                item.classList.add('active');
            }
            item.textContent = conversation.title;
            item.addEventListener('click', () => {
                this.conversationManager.loadConversation(conversation.id);
                this.loadConversation(conversation);
            });
            this.elements.history.appendChild(item);
        });
    }

    renderActiveCustom() {
        const existingBadge = document.querySelector('.custom-badge');
        if (existingBadge) existingBadge.remove();
        
        const customInstructions = this.conversationManager.getCustomInstructions();
        if (customInstructions) {
            const badge = document.createElement('div');
            badge.className = 'custom-badge';
            badge.textContent = 'Vlastní pokyny';
            document.querySelector('.brand').appendChild(badge);
        }
    }

    openModal() {
        this.elements.modal.style.display = 'flex';
        this.elements.modal.setAttribute('aria-hidden', 'false');
        this.elements.custom.focus();
    }

    closeModal() {
        this.elements.modal.style.display = 'none';
        this.elements.modal.setAttribute('aria-hidden', 'true');
        this.loadSettings();
    }

    async showPatternsModal() {
        await this.refreshPatternsData();
        this.elements.patternsModal.style.display = 'flex';
        this.elements.patternsModal.setAttribute('aria-hidden', 'false');
    }

    closePatternsModal() {
        this.elements.patternsModal.style.display = 'none';
        this.elements.patternsModal.setAttribute('aria-hidden', 'true');
    }

    async refreshPatternsData() {
        await this.patternMatcher.loadPatterns(this.conversationManager.getPreferredLanguage());
        this.renderPatternsList();
        this.updateLearningStats();
    }

    renderPatternsList() {
        if (!this.elements.patternsList) return;
        
        const patterns = this.patternMatcher.patterns;
        if (patterns.length === 0) {
            this.elements.patternsList.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center;padding:20px;color:var(--muted)">
                        Zatím žádné uložené konverzační vzory. Začněte konverzaci!
                    </td>
                </tr>
            `;
            return;
        }
        
        this.elements.patternsList.innerHTML = patterns.map(pattern => `
            <tr>
                <td style="max-width:200px;word-break:break-word">${pattern.query}</td>
                <td style="max-width:300px;word-break:break-word">${pattern.reply.substring(0, 100)}${pattern.reply.length > 100 ? '...' : ''}</td>
                <td style="text-align:center">${pattern.usageCount || 0}</td>
                <td style="text-align:center">
                    <button class="delete-btn" onclick="app.deletePattern('${pattern.id}')">Smazat</button>
                </td>
            </tr>
        `).join('');
    }

    updateLearningStats() {
        if (this.elements.statsConversations) {
            this.elements.statsConversations.textContent = this.patternMatcher.patterns.length;
        }
        if (this.elements.statsPatterns) {
            this.elements.statsPatterns.textContent = this.conversationManager.learningStats.patternsUsed;
        }
        if (this.elements.statsSuccess) {
            this.elements.statsSuccess.textContent = this.conversationManager.learningStats.successRate + '%';
        }
    }

    async deletePattern(id) {
        if (!confirm('Opravdu chcete smazat tento konverzační vzor?')) return;
        
        try {
            const response = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
            if (response.ok) {
                await this.refreshPatternsData();
            }
        } catch (error) {
            console.error('Chyba při mazání vzoru:', error);
        }
    }

    exportPatterns() {
        this.conversationManager.exportConversations();
    }

    saveSettings() {
        localStorage.setItem(this.conversationManager.storageKeys.CUSTOM, this.elements.custom.value.trim());
        localStorage.setItem(this.conversationManager.storageKeys.LANG, this.elements.langSelect.value);
        this.closeModal();
        this.renderActiveCustom();
    }

    handleInputKeydown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }
}

// Inicializace aplikace
const app = new DarqAIApp();
window.app = app;
