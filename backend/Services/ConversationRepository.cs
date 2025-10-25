using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace DarqAIBackend.Services
{
    public class ConversationRepository : IConversationRepository
    {
        private readonly List<Conversation> _conversations = new List<Conversation>();
        private readonly List<ConversationPattern> _patterns = new List<ConversationPattern>();
        private readonly object _lock = new object();

        public Task SaveConversationAsync(string query, string reply, string language)
        {
            var conversation = new Conversation
            {
                Id = Guid.NewGuid(),
                Query = query,
                Reply = reply,
                Language = language,
                CreatedAt = DateTime.UtcNow,
                LastUsedAt = DateTime.UtcNow,
                UsageCount = 0,
                QualityScore = 0.5
            };

            lock (_lock)
            {
                _conversations.Add(conversation);
                ExtractPatterns(conversation);
                
                var toRemove = _conversations
                    .Where(c => c.Language == language)
                    .OrderByDescending(c => c.CreatedAt)
                    .Skip(2000)
                    .ToList();
                    
                foreach (var item in toRemove) _conversations.Remove(item);
            }

            return Task.CompletedTask;
        }

        private void ExtractPatterns(Conversation conversation)
        {
            var questionType = ClassifyQuestion(conversation.Query);
            var responseType = ClassifyResponse(conversation.Reply);
            
            var pattern = new ConversationPattern
            {
                Id = Guid.NewGuid(),
                QuestionType = questionType,
                ResponseType = responseType,
                Language = conversation.Language,
                Template = GenerateTemplate(conversation.Reply),
                Keywords = ExtractKeywords(conversation.Query),
                UsageCount = 0,
                SuccessRate = 0.5
            };
            
            lock (_lock)
            {
                var existingPattern = _patterns.FirstOrDefault(p => 
                    p.QuestionType == pattern.QuestionType && 
                    p.ResponseType == pattern.ResponseType &&
                    p.Language == pattern.Language);
                    
                if (existingPattern != null) existingPattern.UsageCount++;
                else _patterns.Add(pattern);
            }
        }

        private string ClassifyQuestion(string query)
        {
            query = query.ToLower();
            if (query.StartsWith("jak") || query.Contains(" jak ")) return "HOW";
            if (query.StartsWith("proč") || query.Contains(" proč ")) return "WHY";
            if (query.StartsWith("co") || query.Contains(" co ")) return "WHAT";
            if (query.StartsWith("kde") || query.Contains(" kde ")) return "WHERE";
            if (query.StartsWith("kdy") || query.Contains(" kdy ")) return "WHEN";
            if (query.StartsWith("kdo") || query.Contains(" kdo ")) return "WHO";
            return "GENERAL";
        }

        private string ClassifyResponse(string reply)
        {
            reply = reply.ToLower();
            if (reply.Contains("krok") || reply.Contains("postup") || reply.Contains("nejprve")) return "INSTRUCTION";
            if (reply.Contains("protože") || reply.Contains("důvod") || reply.Contains("proto")) return "EXPLANATION";
            if (reply.Contains("znamená") || reply.Contains("definice") || reply.Contains("význam")) return "DEFINITION";
            return "GENERAL";
        }

        private string GenerateTemplate(string reply)
        {
            return Regex.Replace(reply, @"\b\d+\b", "{number}")
                       .Replace(reply.Split(' ').FirstOrDefault(word => word.Length > 5) ?? "", "{topic}");
        }

        private List<string> ExtractKeywords(string query)
        {
            return query.Split(' ')
                       .Where(word => word.Length > 3)
                       .Select(word => word.ToLower())
                       .ToList();
        }

        public Task<Conversation> FindSimilarConversationAsync(string query, string language)
        {
            var langConversations = _conversations.Where(c => c.Language == language).ToList();
            if (!langConversations.Any()) return Task.FromResult<Conversation>(null);

            var mostSimilar = langConversations
                .Select(c => new { Conversation = c, Similarity = CalculateAdvancedSimilarity(c.Query, query) })
                .Where(x => x.Similarity > 0.4)
                .OrderByDescending(x => x.Similarity)
                .ThenByDescending(x => x.Conversation.QualityScore)
                .FirstOrDefault();

            if (mostSimilar != null)
            {
                mostSimilar.Conversation.UsageCount++;
                mostSimilar.Conversation.LastUsedAt = DateTime.UtcNow;
                return Task.FromResult(mostSimilar.Conversation);
            }

            return Task.FromResult<Conversation>(null);
        }

        private double CalculateAdvancedSimilarity(string storedQuery, string currentQuery)
        {
            var wordSimilarity = CalculateWordSimilarity(storedQuery, currentQuery);
            var structureSimilarity = CalculateStructureSimilarity(storedQuery, currentQuery);
            var semanticSimilarity = CalculateSemanticSimilarity(storedQuery, currentQuery);
            return (wordSimilarity + structureSimilarity + semanticSimilarity) / 3.0;
        }

        private double CalculateWordSimilarity(string s1, string s2)
        {
            var words1 = s1.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet();
            var words2 = s2.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet();
            var intersection = words1.Intersect(words2).Count();
            var union = words1.Union(words2).Count();
            return union > 0 ? (double)intersection / union : 0.0;
        }

        private double CalculateStructureSimilarity(string s1, string s2)
        {
            var type1 = ClassifyQuestion(s1);
            var type2 = ClassifyQuestion(s2);
            return type1 == type2 ? 1.0 : 0.0;
        }

        private double CalculateSemanticSimilarity(string s1, string s2)
        {
            var themes1 = ExtractThemes(s1);
            var themes2 = ExtractThemes(s2);
            var commonThemes = themes1.Intersect(themes2).Count();
            var totalThemes = themes1.Union(themes2).Count();
            return totalThemes > 0 ? (double)commonThemes / totalThemes : 0.0;
        }

        private List<string> ExtractThemes(string text)
        {
            var themes = new List<string>();
            text = text.ToLower();
            if (text.Contains("programování") || text.Contains("kód") || text.Contains("software")) themes.Add("programming");
            if (text.Contains("jazyk") || text.Contains("mluvit") || text.Contains("slovník")) themes.Add("language");
            if (text.Contains("učit") || text.Contains("naučit") || text.Contains("studium")) themes.Add("learning");
            return themes;
        }

        public Task<List<Conversation>> GetRecentConversationsAsync(string language, int limit)
        {
            var conversations = _conversations
                .Where(c => c.Language == language)
                .OrderByDescending(c => c.CreatedAt)
                .Take(limit)
                .ToList();
            return Task.FromResult(conversations);
        }

        public Task DeleteConversationAsync(Guid id)
        {
            lock (_lock)
            {
                var conversation = _conversations.FirstOrDefault(c => c.Id == id);
                if (conversation != null) _conversations.Remove(conversation);
            }
            return Task.CompletedTask;
        }

        public Task<List<ConversationPattern>> GetConversationPatternsAsync(string language)
        {
            var patterns = _patterns
                .Where(p => p.Language == language)
                .OrderByDescending(p => p.UsageCount)
                .ThenByDescending(p => p.SuccessRate)
                .ToList();
            return Task.FromResult(patterns);
        }
    }
}
