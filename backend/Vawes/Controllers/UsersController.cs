using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using Vawes.Models;
using Vawes.Models.DTOs;

namespace Vawes.Controllers
{
    [Route("users")]
    [ApiController]
    public class UsersController : Controller
    {
        private readonly VaweContext _context;
        private readonly IPasswordHasher<User> _passwordHasher;

        public UsersController(VaweContext context, IPasswordHasher<User> passwordHasher)
        {
            _context = context;
            _passwordHasher = passwordHasher;
        }

        [HttpPost("NewUser")]
        [EnableRateLimiting("auth")]
        public async Task<IActionResult> NewUser([FromBody] NewUserDTO newUserDTO)
        {
            if (string.IsNullOrWhiteSpace(newUserDTO.Username) ||
                string.IsNullOrWhiteSpace(newUserDTO.Email) ||
                string.IsNullOrWhiteSpace(newUserDTO.Password))
            {
                return BadRequest(new ProblemDetails { Title = "Username, email, and password are required." });
            }

            var username = newUserDTO.Username.Trim();
            var email = newUserDTO.Email.Trim().ToLowerInvariant();
            var password = newUserDTO.Password;
            if (!Regex.IsMatch(username, @"^[\p{L}\p{N}._-]{3,50}$", RegexOptions.CultureInvariant) ||
                !new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(email) ||
                email.Length > 255)
            {
                return BadRequest(new ProblemDetails { Title = "Enter a valid username and email address." });
            }
            if (password.Length < 10 || password.Length > 128 ||
                !password.Any(char.IsUpper) || !password.Any(char.IsLower) || !password.Any(char.IsDigit))
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Password must be 10-128 characters and include an uppercase letter, a lowercase letter, and a number.",
                });
            }

            if (await _context.Users.AnyAsync(user => user.Username == username || user.Email == email))
            {
                return Conflict(new ProblemDetails { Title = "That username or email address is already registered." });
            }

            var user = new User
            {
                Username = username,
                Email = email,
                CreatedAt = DateTime.UtcNow,
                IsAdmin = false,
            };
            user.PasswordHash = _passwordHasher.HashPassword(user, password);

            await _context.Users.AddAsync(user);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                if (!await _context.Users.AsNoTracking().AnyAsync(
                        existing => existing.Username == username || existing.Email == email))
                    throw;
                return Conflict(new ProblemDetails { Title = "That username or email address is already registered." });
            }
            return StatusCode(201, new
            {
                message = "Registration complete. You can now sign in.",
                result = new { user.Id, user.Username, user.Email, user.CreatedAt }
            });
        }

        [HttpGet("AllUser")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AllUser()
        {
            var users = await _context.Users
                .Select(u => new { u.Id, u.Username, u.Email, u.IsAdmin, u.CreatedAt })
                .ToListAsync();
            return StatusCode(200, new { message = "Lekérdezve", result = users });
        }

        [HttpGet("ById")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UserById([FromQuery] int id)
        {
            var user = await _context.Users
                .Where(u => u.Id == id)
                .Select(u => new { u.Id, u.Username, u.Email, u.IsAdmin, u.CreatedAt })
                .SingleOrDefaultAsync();
            if (user is not null)
            {
                return StatusCode(200, new { message = "Lekérdezve", result = user });
            }
            return StatusCode(404, new { message = "Nem található felhasználó", result = user });
        }
    }
}
