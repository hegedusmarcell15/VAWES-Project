using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Vawes.Models;

namespace Vawes.Security;

public sealed class AdminAccessRequirement : IAuthorizationRequirement
{
}

public sealed class AdminAccessAuthorizationHandler(
    VaweContext context,
    AdminEmailAllowlist allowlist) : AuthorizationHandler<AdminAccessRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext authorizationContext,
        AdminAccessRequirement requirement)
    {
        var userId = authorizationContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userId, out var id)) return;

        var user = await context.Users.AsNoTracking()
            .SingleOrDefaultAsync(candidate => candidate.Id == id);
        if (allowlist.IsAllowed(user))
            authorizationContext.Succeed(requirement);
    }
}
