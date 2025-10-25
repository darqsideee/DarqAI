using System;
using System.Collections.Generic;

namespace DarqAIBackend.Models
{
    public class ConversationPattern
    {
        public Guid Id { get; set; }
        public string QuestionType { get; set; }
        public string ResponseType { get; set; }
        public string Language { get; set; }
        public string Template { get; set; }
        public List<string> Keywords { get; set; }
        public int UsageCount { get; set; }
        public double SuccessRate { get; set; }
    }
}
