using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vawes.Models;
using Vawes.Models.DTOs;

namespace Vawes.Controllers
{
    [Route("songs")]
    [ApiController]
    public class SongsController : Controller
    {
        private readonly VaweContext _context;

        public SongsController(VaweContext context)
        {
            _context = context;
        }

        [HttpPost("NewSong")]
        public async Task<IActionResult> NewSong([FromBody] NewSongDTO newSongDTO)
        {
            if (string.IsNullOrWhiteSpace(newSongDTO.Title) ||
                string.IsNullOrWhiteSpace(newSongDTO.FilePath) ||
                newSongDTO.ArtistId is null)
            {
                return StatusCode(400, new { message = "Hiányzó adat" });
            }

            var artist = await _context.Artists.SingleOrDefaultAsync(a => a.Id == newSongDTO.ArtistId);
            if (artist is null)
            {
                return StatusCode(404, new { message = "Nem található előadó" });
            }

            if (newSongDTO.AlbumId is not null)
            {
                var album = await _context.Albums.SingleOrDefaultAsync(a => a.Id == newSongDTO.AlbumId);
                if (album is null)
                {
                    return StatusCode(404, new { message = "Nem található album" });
                }
            }

            var song = new Song
            {
                Title = newSongDTO.Title,
                ArtistId = newSongDTO.ArtistId.Value,
                AlbumId = newSongDTO.AlbumId,
                DurationSec = newSongDTO.DurationSec ?? 0,
                Genre = newSongDTO.Genre,
                FilePath = newSongDTO.FilePath,
                UploadedAt = DateTime.Now
            };

            await _context.Songs.AddAsync(song);
            await _context.SaveChangesAsync();
            return StatusCode(201, new
            {
                message = "Felvéve",
                result = new
                {
                    song.Id,
                    song.Title,
                    ArtistName = artist.Name,
                    song.AlbumId,
                    song.DurationSec,
                    song.Genre,
                    song.FilePath,
                    song.UploadedAt
                }
            });
        }

        [HttpGet("AllSong")]
        public async Task<IActionResult> AllSong()
        {
            var songs = await _context.Songs
                .Select(s => new
                {
                    s.Id,
                    s.Title,
                    ArtistName = s.Artist.Name,
                    AlbumTitle = s.Album == null ? null : s.Album.Title,
                    s.DurationSec,
                    s.Genre,
                    s.FilePath
                })
                .ToListAsync();
            return StatusCode(200, new { message = "Lekérdezve", result = songs });
        }

        [HttpGet("ById")]
        public async Task<IActionResult> SongById([FromQuery] int id)
        {
            var song = await _context.Songs
                .Where(s => s.Id == id)
                .Select(s => new
                {
                    s.Id,
                    s.Title,
                    ArtistName = s.Artist.Name,
                    AlbumTitle = s.Album == null ? null : s.Album.Title,
                    s.DurationSec,
                    s.Genre,
                    s.FilePath
                })
                .SingleOrDefaultAsync();
            if (song is not null)
            {
                return StatusCode(200, new { message = "Lekérdezve", result = song });
            }
            return StatusCode(404, new { message = "Nem található zeneszám", result = song });
        }
    }
}
