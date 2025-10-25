using System.Collections.Generic;

namespace DarqAIBackend.Models.ApiModels
{
    public class GitHubSearchResult
    {
        public List<GitHubItem> items { get; set; }
    }

    public class GitHubItem
    {
        public string name { get; set; }
        public string description { get; set; }
        public string html_url { get; set; }
    }
}
