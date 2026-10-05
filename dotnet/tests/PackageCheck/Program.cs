using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml.Linq;

if (args.Length != 1) throw new Exception("Pass the built .nupkg path.");
using var package = ZipFile.OpenRead(args[0]);
var required = new HashSet<string>(StringComparer.Ordinal)
{
    "_rels/.rels", "FragmentDonor.Sdk.nuspec", "lib/net8.0/FragmentDonor.Sdk.dll",
    "README.md", "LICENSE", "CHANGELOG.md", "[Content_Types].xml",
};
var seen = new HashSet<string>(StringComparer.Ordinal);
var rules = new[]
{
    @"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    @"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{60,})\b",
    @"\b\d{8,12}:[A-Za-z0-9_-]{35}\b",
    @"https?://(?!SYNTHETIC)[^\s/@:]+:[^\s/@]+@",
    @"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b",
};
foreach (var member in package.Entries)
{
    var metadata = Regex.IsMatch(member.FullName, @"\Apackage/services/metadata/core-properties/[a-f0-9]{32}\.psmdcp\z");
    if ((!required.Contains(member.FullName) && !metadata) || !seen.Add(member.FullName))
        throw new Exception("Unexpected or duplicate package member; content withheld.");
    using var stream = member.Open();
    using var buffer = new MemoryStream();
    stream.CopyTo(buffer);
    var bytes = buffer.ToArray();
    // Scan ASCII token patterns in UTF-8 files and UTF-16 assembly string literals.
    foreach (var contents in new[] { Encoding.UTF8.GetString(bytes), Encoding.Unicode.GetString(bytes),
        bytes.Length > 1 ? Encoding.Unicode.GetString(bytes, 1, bytes.Length - 1) : "" })
        foreach (var rule in rules)
            if (Regex.IsMatch(contents, rule)) throw new Exception("Potential credential in package member; content withheld.");
    if (member.FullName == "FragmentDonor.Sdk.nuspec")
    {
        var document = XDocument.Parse(Encoding.UTF8.GetString(bytes).TrimStart('\uFEFF'));
        var metadataElement = document.Root!.Elements().Single(e => e.Name.LocalName == "metadata");
        var id = metadataElement.Elements().Single(e => e.Name.LocalName == "id").Value;
        var version = metadataElement.Elements().Single(e => e.Name.LocalName == "version").Value;
        if (id != "FragmentDonor.Sdk" || version != "0.1.0") throw new Exception("Unexpected NuGet package identity/version.");
    }
}
if (seen.Count != 8 || !required.IsSubsetOf(seen)) throw new Exception("Missing required package member.");
Console.WriteLine("PASS NuGet identity/version, exact member allowlist and known-token secret scan (8 files).");
