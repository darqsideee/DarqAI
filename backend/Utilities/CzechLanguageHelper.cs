using System.Collections.Generic;
using System.Linq;

namespace DarqAIBackend.Utilities
{
    public class CzechLanguageHelper
    {
        private readonly Dictionary<string, string[]> _synonyms = new Dictionary<string, string[]>
        {
            {"jak", new[] {"jakým způsobem", "jakou metodou", "postup"}},
            {"proč", new[] {"z jakého důvodu", "z jaké příčiny", "důvod"}},
            {"co", new[] {"cože", "jaká věc", "co to je"}},
            {"kód", new[] {"program", "zdrojový kód", "skript"}},
            {"programování", new[] {"kódování", "vývoj software", "programovací"}},
            {"učit", new[] {"učit se", "studovat", "osvojit si"}},
            {"jazyk", new[] {"řeč", "mluva", "jazykový"}}
        };

        public string ExpandQuery(string query)
        {
            var words = query.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var expanded = new List<string>(words);
            
            foreach (var word in words)
            {
                if (_synonyms.ContainsKey(word))
                {
                    expanded.AddRange(_synonyms[word]);
                }
            }
            
            return string.Join(" ", expanded.Distinct());
        }
    }
}
