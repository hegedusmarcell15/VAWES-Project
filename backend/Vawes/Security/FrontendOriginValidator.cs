namespace Vawes.Security;

public static class FrontendOriginValidator
{
    private static readonly string[] DefaultOrigins =
    [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://hegedusmarcell15.github.io",
        "https://vawes.app",
    ];

    public static string[] GetAllowedOrigins(IConfiguration configuration)
    {
        var configuredOrigins = configuration["FrontendOrigins"]?
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            ?? [];
        return DefaultOrigins
            .Concat(configuredOrigins)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public static bool IsTrustedOrigin(string? origin, IConfiguration configuration)
    {
        if (!TryGetOrigin(origin, requireOriginOnly: true, out var requestOrigin))
            return false;

        return GetAllowedOrigins(configuration).Any(allowedOrigin =>
            TryGetOrigin(allowedOrigin, requireOriginOnly: true, out var normalizedAllowedOrigin) &&
            string.Equals(requestOrigin, normalizedAllowedOrigin, StringComparison.OrdinalIgnoreCase));
    }

    public static bool IsTrustedReferer(string? referer, IConfiguration configuration)
    {
        if (!TryGetOrigin(referer, requireOriginOnly: false, out var requestOrigin))
            return false;

        return GetAllowedOrigins(configuration).Any(allowedOrigin =>
            TryGetOrigin(allowedOrigin, requireOriginOnly: true, out var normalizedAllowedOrigin) &&
            string.Equals(requestOrigin, normalizedAllowedOrigin, StringComparison.OrdinalIgnoreCase));
    }

    private static bool TryGetOrigin(string? value, bool requireOriginOnly, out string origin)
    {
        origin = string.Empty;
        if (string.IsNullOrWhiteSpace(value) ||
            !Uri.TryCreate(value.Trim(), UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) ||
            string.IsNullOrWhiteSpace(uri.Host) ||
            !string.IsNullOrEmpty(uri.UserInfo))
            return false;

        if (requireOriginOnly &&
            (uri.AbsolutePath != "/" || !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment)))
            return false;

        origin = uri.GetLeftPart(UriPartial.Authority);
        return true;
    }
}
