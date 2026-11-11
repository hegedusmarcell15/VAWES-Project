using Vawes.Models;

namespace Vawes.Security;

public sealed class AdminEmailAllowlist(IConfiguration configuration)
{
    public const string PolicyName = "AdminOnly";

    private readonly HashSet<string> allowedEmails = (configuration["Admin:AllowedEmails"] ?? string.Empty)
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .ToHashSet(StringComparer.OrdinalIgnoreCase);

    public bool IsAllowed(User? user) =>
        user is { IsAdmin: true } && !string.IsNullOrWhiteSpace(user.Email) &&
        allowedEmails.Contains(user.Email.Trim());
}
