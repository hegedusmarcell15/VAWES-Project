using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vawes.Models;
using Vawes.Security;

namespace Vawes.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = AdminEmailAllowlist.PolicyName)]
public sealed class AdminController(VaweContext context, AdminEmailAllowlist adminEmailAllowlist) : ControllerBase
{
    [HttpGet("users")]
    public async Task<IActionResult> Users(CancellationToken cancellationToken)
    {
        var users = await context.Users.AsNoTracking()
            .OrderBy(user => user.Id)
            .ToListAsync(cancellationToken);

        return Ok(users.Select(user => new
        {
            user.Id,
            user.Username,
            user.Email,
            isAdmin = adminEmailAllowlist.IsAllowed(user),
            user.CreatedAt,
            user.LastLoginAt,
        }));
    }

    [HttpGet("users/{id:int}")]
    public async Task<IActionResult> UserById(int id, CancellationToken cancellationToken)
    {
        var user = await context.Users.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (user is null) return NotFound();

        return Ok(new
        {
            user.Id,
            user.Username,
            user.Email,
            isAdmin = adminEmailAllowlist.IsAllowed(user),
            user.CreatedAt,
            user.LastLoginAt,
        });
    }
}
