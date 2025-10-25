using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using System.Collections.Generic;
using System;

[ApiController]
[Route("api")]
public class SearchController : ControllerBase
{
    private static List<Conversation> _conversations = new();
    private readonly IMemoryCache _cache;

    public SearchController(IMemoryCache cache) => _cache = cache;

    [HttpGet("search")]
    public IActionResult Search(string query, string lang = "cs")
    {
        var cacheKey = $"{query}_{lang}";
        if (_cache.TryGetValue(cacheKey, out string cachedReply))
            return Ok(new { reply = cachedReply, source = "cache" });

        var similar = _conversations.Find(c => c.Query.Contains(query) || query.Contains(c.Query));
        if (similar != null)
            return Ok(new { reply = $"Podle předchozí konverzace: {similar.Reply}", source = "pattern" });

        var reply = $"Odpověď na: '{query}' (jazyk: {lang})";
        _conversations.Add(new Conversation { Query = query, Reply = reply, Language = lang });
        _cache.Set(cacheKey, reply, TimeSpan.FromHours(1));
        
        return Ok(new { reply = reply, source = "fresh" });
    }

    [HttpGet("conversations")]
    public IActionResult GetConversations() => Ok(_conversations);
}

public class Conversation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Query { get; set; }
    public string Reply { get; set; }
    public string Language { get; set; }
}
