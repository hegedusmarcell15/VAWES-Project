using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Vawes.Security;

public sealed class AdminApiKeyFilter(IConfiguration configuration) : IAsyncAuthorizationFilter
{
    public const string HeaderName = "X-VAWES-API-Key";

    public Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var configuredKey = configuration["Upload:ApiKey"];
        if (string.IsNullOrWhiteSpace(configuredKey))
        {
            context.Result = new ObjectResult(new ProblemDetails
            {
                Status = StatusCodes.Status503ServiceUnavailable,
                Title = "Music administration is not configured.",
            })
            {
                StatusCode = StatusCodes.Status503ServiceUnavailable,
            };
            return Task.CompletedTask;
        }

        var suppliedKey = context.HttpContext.Request.Headers[HeaderName].ToString();
        if (string.IsNullOrEmpty(suppliedKey) || !KeysMatch(configuredKey, suppliedKey))
        {
            context.Result = new UnauthorizedResult();
            return Task.CompletedTask;
        }

        return Task.CompletedTask;
    }

    private static bool KeysMatch(string configuredKey, string suppliedKey)
    {
        var configuredHash = SHA256.HashData(Encoding.UTF8.GetBytes(configuredKey));
        var suppliedHash = SHA256.HashData(Encoding.UTF8.GetBytes(suppliedKey));
        return CryptographicOperations.FixedTimeEquals(configuredHash, suppliedHash);
    }
}
