class PatternMatcher {
    constructor() {
        this.patterns = [];
    }

    async loadPatterns(language = 'cs') {
        try {
            const response = await fetch(`/api/conversations?lang=${language}&limit=100`);
            if (response.ok) {
                this.patterns = await response.json();
            }
        } catch (error) {
            console.error('Chyba při načítání vzorů:', error);
        }
    }

    findBestMatch(query) {
        if (this.patterns.length === 0) return null;

        const queryWords = query.toLowerCase().split(' ');
        let bestMatch = null;
        let bestScore = 0;

        this.patterns.forEach(pattern => {
            const score = this.calculateSimilarityScore(query, pattern.query);
            if (score > bestScore && score > 0.3) {
                bestScore = score;
                bestMatch = pattern;
            }
        });

        return bestMatch;
    }

    calculateSimilarityScore(query1, query2) {
        const words1 = query1.toLowerCase().split(' ');
        const words2 = query2.toLowerCase().split(' ');
        
        const commonWords = words1.filter(word1 => 
            words2.some(word2 => this.wordSimilarity(word1, word2) > 0.7)
        ).length;
        
        return commonWords / Math.max(words1.length, words2.length);
    }

    wordSimilarity(word1, word2) {
        if (word1 === word2) return 1.0;
        
        const longer = word1.length > word2.length ? word1 : word2;
        const shorter = word1.length > word2.length ? word2 : word1;
        
        if (longer.length === 0) return 1.0;
        
        return (longer.length - this.editDistance(longer, shorter)) / parseFloat(longer.length);
    }

    editDistance(s1, s2) {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();
        const costs = [];
        
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                } else {
                    if (j > 0) {
                        let newValue = costs[j - 1];
                        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        }
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }

    adaptResponse(originalReply, currentQuery, originalQuery) {
        let adapted = originalReply
            .replace(new RegExp(this.escapeRegExp(originalQuery), 'gi'), currentQuery)
            .replace(/\b(tamto|onoho|původní)\b/gi, 'toto')
            .replace(/\b(předchozí|minulý)\b/gi, 'současný');
        
        if (!adapted.includes('(z paměti)') && !adapted.includes('(adaptováno)')) {
            adapted += ' (přizpůsobeno z paměti)';
        }
        
        return adapted;
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
