using System;

namespace DarqAIBackend.Models
{
    public class Conversation
    {
        public Guid Id { get; set; }
        public string Query { get; set; }
        public string Reply { get; set; }
        public string Language { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastUsedAt { get; set; }
        public int UsageCount { get; set; }
        public double QualityScore { get; set; }
    }
}
