using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DarqAIBackend.Services
{
    public interface IConversationRepository
    {
        Task SaveConversationAsync(string query, string reply, string language);
        Task<Conversation> FindSimilarConversationAsync(string query, string language);
        Task<List<Conversation>> GetRecentConversationsAsync(string language, int limit);
        Task DeleteConversationAsync(Guid id);
        Task<List<ConversationPattern>> GetConversationPatternsAsync(string language);
    }
}
