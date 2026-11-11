using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Vawes.Models;

namespace Vawes.Controllers;

[ApiController]
[Route("api/auth")]
public sealed partial class AuthController(
    VaweContext context,
    IPasswordHasher<User> passwordHasher) : ControllerBase
{
    private static readonly string DummyPasswordHash = CreateDummyPasswordHash();

    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var username = request.Username.Trim();
        var email = request.Email.Trim().ToLowerInvariant();
        if (!UsernamePattern().IsMatch(username))
            return BadRequest(new ProblemDetails
            {
                Title = "Username must be 3-50 characters and use only letters, numbers, dots, underscores, or hyphens.",
            });
        if (!PasswordIsStrong(request.Password))
            return BadRequest(new ProblemDetails
            {
                Title = "Password must be at least 10 characters and include an uppercase letter, a lowercase letter, and a number.",
            });

        if (await context.Users.AnyAsync(user => user.Username == username, cancellationToken))
            return Conflict(new ProblemDetails { Title = "That username is already registered." });
        if (await context.Users.AnyAsync(user => user.Email == email, cancellationToken))
            return Conflict(new ProblemDetails { Title = "That email address is already registered." });

        var user = new User
        {
            Username = username,
            Email = email,
            CreatedAt = DateTime.UtcNow,
            IsAdmin = false,
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        context.Users.Add(user);
        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            var duplicate = await context.Users.AsNoTracking().AnyAsync(
                existing => existing.Username == username || existing.Email == email,
                cancellationToken);
            if (!duplicate) throw;
            return Conflict(new ProblemDetails { Title = "That username or email address is already registered." });
        }

        return StatusCode(StatusCodes.Status201Created, new
        {
            message = "Registration complete. You can now sign in.",
            user = PublicUser(user),
        });
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var identifier = request.Identifier.Trim();
        var normalizedIdentifier = identifier.ToLowerInvariant();
        var user = await context.Users.FirstOrDefaultAsync(
            candidate => candidate.Email == normalizedIdentifier || candidate.Username == identifier,
            cancellationToken);
        var hashToVerify = user?.PasswordHash ?? DummyPasswordHash;
        var verification = passwordHasher.VerifyHashedPassword(user ?? new User(), hashToVerify, request.Password);
        if (user is null || verification == PasswordVerificationResult.Failed)
            return Unauthorized(new ProblemDetails { Title = "The username/email or password is incorrect." });

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        }
        user.LastLoginAt = DateTime.UtcNow;
        await context.SaveChangesAsync(cancellationToken);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
        };
        if (user.IsAdmin) claims.Add(new Claim(ClaimTypes.Role, "Admin"));

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme)),
            new AuthenticationProperties
            {
                IsPersistent = request.RememberMe,
                ExpiresUtc = DateTimeOffset.UtcNow.Add(request.RememberMe ? TimeSpan.FromDays(30) : TimeSpan.FromHours(12)),
                AllowRefresh = true,
            });

        return Ok(new { user = PublicUser(user) });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userId, out var id)) return Unauthorized();
        var user = await context.Users.AsNoTracking().SingleOrDefaultAsync(
            candidate => candidate.Id == id, cancellationToken);
        if (user is null)
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Unauthorized();
        }
        return Ok(new { user = PublicUser(user) });
    }

    private static object PublicUser(User user) => new
    {
        user.Id,
        user.Username,
        user.Email,
        user.IsAdmin,
    };

    private static bool PasswordIsStrong(string password) =>
        password.Length >= 10 &&
        password.Any(char.IsUpper) &&
        password.Any(char.IsLower) &&
        password.Any(char.IsDigit);

    private static string CreateDummyPasswordHash()
    {
        var hasher = new PasswordHasher<User>();
        return hasher.HashPassword(new User(), Convert.ToHexString(Guid.NewGuid().ToByteArray()));
    }

    [GeneratedRegex(@"^[\p{L}\p{N}._-]{3,50}$", RegexOptions.CultureInvariant)]
    private static partial Regex UsernamePattern();
}

public sealed class RegisterRequest
{
    [Required, StringLength(50, MinimumLength = 3)]
    public string Username { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 10)]
    public string Password { get; set; } = string.Empty;
}

public sealed class LoginRequest
{
    [Required, StringLength(255)]
    public string Identifier { get; set; } = string.Empty;

    [Required, StringLength(128)]
    public string Password { get; set; } = string.Empty;

    public bool RememberMe { get; set; }
}
