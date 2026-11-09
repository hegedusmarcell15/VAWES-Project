namespace Vawes.Services;

public sealed class MusicStorage
{
    private readonly string rootPath;

    public MusicStorage(IConfiguration configuration, IWebHostEnvironment environment)
    {
        var configuredPath = configuration["MusicStorage:Directory"];
        rootPath = Path.GetFullPath(string.IsNullOrWhiteSpace(configuredPath)
            ? Path.Combine(environment.ContentRootPath, "..", "storage", "songs")
            : Path.IsPathRooted(configuredPath)
                ? configuredPath
                : Path.Combine(environment.ContentRootPath, configuredPath));
    }

    public string CreateUploadPath()
    {
        var uploadsDirectory = Path.Combine(rootPath, "uploads");
        Directory.CreateDirectory(uploadsDirectory);
        return Path.Combine(uploadsDirectory, $"{Guid.NewGuid():N}.mp3");
    }

    public string GetDatabasePath(string fullPath) =>
        $"uploads/{Path.GetFileName(fullPath)}";

    public bool TryResolveUploadedPath(string? databasePath, out string fullPath)
    {
        fullPath = string.Empty;
        if (string.IsNullOrWhiteSpace(databasePath) || Path.IsPathRooted(databasePath))
            return false;

        var parts = databasePath.Replace('\\', '/').Split('/');
        if (parts.Length != 2 ||
            !string.Equals(parts[0], "uploads", StringComparison.Ordinal) ||
            string.IsNullOrWhiteSpace(parts[1]) ||
            !string.Equals(Path.GetFileName(parts[1]), parts[1], StringComparison.Ordinal) ||
            !string.Equals(Path.GetExtension(parts[1]), ".mp3", StringComparison.OrdinalIgnoreCase))
            return false;

        var candidate = Path.GetFullPath(Path.Combine(rootPath, parts[0], parts[1]));
        var rootWithSeparator = rootPath.EndsWith(Path.DirectorySeparatorChar)
            ? rootPath
            : rootPath + Path.DirectorySeparatorChar;
        if (!candidate.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase))
            return false;

        fullPath = candidate;
        return true;
    }
}
