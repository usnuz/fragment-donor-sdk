using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml.Linq;

if (args.Length == 1 && args[0] == "--self-test")
{
    PackageInspector.RunSelfTests();
    return;
}
if (args.Length != 1) throw new Exception("Pass the built .nupkg path, or --self-test.");
using var package = ZipFile.OpenRead(args[0]);
PackageInspector.Validate(package);
Console.WriteLine("PASS NuGet identity/version, exact member allowlist and known-token secret scan (8 files).");

internal static class PackageInspector
{
    private const string CurrentMetadata = "package/services/metadata/core-properties/nuget.psmdcp";
    private const string LegacyMetadata = "package/services/metadata/core-properties/0123456789abcdef0123456789abcdef.psmdcp";
    private static readonly HashSet<string> Required = new(StringComparer.Ordinal)
    {
        "_rels/.rels", "FragmentDonor.Sdk.nuspec", "lib/net8.0/FragmentDonor.Sdk.dll",
        "README.md", "LICENSE", "CHANGELOG.md", "[Content_Types].xml",
    };
    private static readonly string[] Rules =
    {
        @"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
        @"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{60,})\b",
        @"\b\d{8,12}:[A-Za-z0-9_-]{35}\b",
        @"https?://(?!SYNTHETIC)[^\s/@:]+:[^\s/@]+@",
        @"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b",
    };

    public static void Validate(ZipArchive package)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var member in package.Entries)
        {
            // NuGet.Client now uses deterministic nuget.psmdcp; older SDKs use a 32-hex ID.
            // Both are exact core-properties paths, not a general .psmdcp wildcard.
            var metadata = member.FullName == CurrentMetadata || Regex.IsMatch(member.FullName,
                @"\Apackage/services/metadata/core-properties/[a-f0-9]{32}\.psmdcp\z");
            if ((!Required.Contains(member.FullName) && !metadata) || !seen.Add(member.FullName))
                throw new Exception("Unexpected or duplicate package member; content withheld.");
            using var stream = member.Open();
            using var buffer = new MemoryStream();
            stream.CopyTo(buffer);
            var bytes = buffer.ToArray();
            // Scan ASCII patterns in UTF-8 files and UTF-16 assembly string literals.
            foreach (var contents in new[] { Encoding.UTF8.GetString(bytes), Encoding.Unicode.GetString(bytes),
                bytes.Length > 1 ? Encoding.Unicode.GetString(bytes, 1, bytes.Length - 1) : "" })
                foreach (var rule in Rules)
                    if (Regex.IsMatch(contents, rule)) throw new Exception("Potential credential in package member; content withheld.");
            if (member.FullName == "FragmentDonor.Sdk.nuspec")
            {
                var document = XDocument.Parse(Encoding.UTF8.GetString(bytes).TrimStart('\uFEFF'));
                var metadataElement = document.Root!.Elements().Single(e => e.Name.LocalName == "metadata");
                var id = metadataElement.Elements().Single(e => e.Name.LocalName == "id").Value;
                var version = metadataElement.Elements().Single(e => e.Name.LocalName == "version").Value;
                if (id != "FragmentDonor.Sdk" || version != "0.1.2") throw new Exception("Unexpected NuGet package identity/version.");
            }
        }
        if (seen.Count != 8 || !Required.IsSubsetOf(seen)) throw new Exception("Missing required package member.");
    }

    public static void RunSelfTests()
    {
        var cases = new (string Name, string[] Metadata, string[] Extra, bool Valid)[]
        {
            ("legacy metadata", new[] { LegacyMetadata }, Array.Empty<string>(), true),
            ("deterministic metadata", new[] { CurrentMetadata }, Array.Empty<string>(), true),
            ("unknown namespace", new[] { "unexpected/nuget.psmdcp" }, Array.Empty<string>(), false),
            ("unknown core-properties filename", new[] { "package/services/metadata/core-properties/extra.psmdcp" }, Array.Empty<string>(), false),
            ("two legitimate metadata members", new[] { LegacyMetadata, CurrentMetadata }, Array.Empty<string>(), false),
            ("duplicate metadata", new[] { CurrentMetadata, CurrentMetadata }, Array.Empty<string>(), false),
            ("extra package member", new[] { CurrentMetadata }, new[] { "unexpected.txt" }, false),
            ("duplicate required member", new[] { CurrentMetadata }, new[] { "README.md" }, false),
            ("missing metadata", Array.Empty<string>(), Array.Empty<string>(), false),
            ("unsupported uppercase ID", new[] { "package/services/metadata/core-properties/ABCDEF0123456789ABCDEF0123456789.psmdcp" }, Array.Empty<string>(), false),
        };
        foreach (var test in cases)
        {
            using var memory = new MemoryStream();
            using (var writer = new ZipArchive(memory, ZipArchiveMode.Create, leaveOpen: true))
            {
                foreach (var name in Required.Concat(test.Metadata).Concat(test.Extra))
                {
                    using var entry = new StreamWriter(writer.CreateEntry(name).Open(), new UTF8Encoding(false));
                    entry.Write(name == "FragmentDonor.Sdk.nuspec"
                        ? "<package><metadata><id>FragmentDonor.Sdk</id><version>0.1.2</version></metadata></package>"
                        : "SYNTHETIC_PACKAGE_CHECK_CONTENT");
                }
            }
            memory.Position = 0;
            using var fixture = new ZipArchive(memory, ZipArchiveMode.Read);
            var valid = true;
            try { Validate(fixture); }
            catch { valid = false; }
            if (valid != test.Valid) throw new Exception($"Package checker regression: {test.Name}.");
        }
        Console.WriteLine($"PASS {cases.Length} package-checker regressions: two exact metadata formats; unknown, extra, duplicate and missing members rejected.");
    }
}
