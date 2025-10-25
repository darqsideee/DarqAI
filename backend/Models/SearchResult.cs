namespace DarqAIBackend.Models
{
    public class SearchResult
    {
        public string Source { get; set; }
        public string Content { get; set; }
        public string Language { get; set; }
        public double Confidence { get; set; }
    }
}
