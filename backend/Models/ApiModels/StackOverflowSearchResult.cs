using System.Collections.Generic;

namespace DarqAIBackend.Models.ApiModels
{
    public class StackOverflowSearchResult
    {
        public List<StackOverflowItem> items { get; set; }
    }

    public class StackOverflowItem
    {
        public string title { get; set; }
        public int answer_count { get; set; }
        public string link { get; set; }
    }
}
