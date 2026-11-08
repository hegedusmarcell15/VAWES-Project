using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vawes.Models;
using Vawes.Models.DTOs;

namespace Vawes.Controllers
{
    [Route("users")]
    [ApiController]
    public class UsersController : Controller
    {
        private readonly VaweContext _context;

        public UsersController(VaweContext context)
        {
            _context = context;
        }

        [HttpPost("NewUser")]
        public async Task<IActionResult> NewUser([FromBody] NewUserDTO newUserDTO)
        {
            if (string.IsNullOrWhiteSpace(newUserDTO.Username) ||
                string.IsNullOrWhiteSpace(newUserDTO.Email) ||
                string.IsNullOrWhiteSpace(newUserDTO.Password))
            {
                return StatusCode(400, new { message = "Hiányzó adat" });
            }

            if (newUserDTO.Password.Length < 6)
            {
                return StatusCode(400, new { message = "A jelszó legalább 6 karakter legyen" });
            }

            if (await _context.Users.AnyAsync(u => u.Username == newUserDTO.Username))
            {
                return StatusCode(409, new { message = "Ez a felhasználónév már foglalt" });
            }

            if (await _context.Users.AnyAsync(u => u.Email == newUserDTO.Email))
            {
                return StatusCode(409, new { message = "Ez az e-mail cím már regisztrálva van" });
            }

            var user = new User
            {
                Username = newUserDTO.Username,
                Email = newUserDTO.Email,
                CreatedAt = DateTime.Now
            };
            user.PasswordHash = new PasswordHasher<User>().HashPassword(user, newUserDTO.Password);

            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();
            return StatusCode(201, new
            {
                message = "Felvéve",
                result = new { user.Id, user.Username, user.Email, user.CreatedAt }
            });
        }

        [HttpGet("AllUser")]
        public async Task<IActionResult> AllUser()
        {
            var users = await _context.Users
                .Select(u => new { u.Id, u.Username, u.Email, u.IsAdmin, u.CreatedAt })
                .ToListAsync();
            return StatusCode(200, new { message = "Lekérdezve", result = users });
        }

        [HttpGet("ById")]
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
