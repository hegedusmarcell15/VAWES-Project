using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vawes.DTOs;
using Vawes.Models;

namespace Vawes.Controllers;

[ApiController]
[Route("api/favorites")]
public sealed class FavoritesController(VaweContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PageResult<SongResponse>>> List(
        [FromQuery] int? userId,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken cancellationToken = default)
    {
        if (!userId.HasValue || userId.Value <= 0) return BadRequest(new { message = "A positive userId is required." });
        if (!await context.Users.AnyAsync(user => user.Id == userId.Value, cancellationToken))
            return NotFound(new { message = "User not found." });

        (page, pageSize) = CatalogPaging.Normalize(page, pageSize);
        var songs = context.Users.Where(user => user.Id == userId.Value)
            .SelectMany(user => user.Songs)
            .AsNoTracking()
            .Include(song => song.Artist)
            .Include(song => song.Album)
            .Include(song => song.Playlists)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            songs = songs.Where(song => song.Title.Contains(search) ||
                                        song.Artist.Name.Contains(search) ||
                                        (song.Album != null && song.Album.Title.Contains(search)));
        }

        var total = await songs.CountAsync(cancellationToken);
        var items = await songs.OrderBy(song => song.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
        return Ok(new PageResult<SongResponse>(items.Select(CatalogPaging.MapSong).ToArray(), page, pageSize, total));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SongResponse>> GetById(
        string id,
        [FromQuery] int? userId,
        CancellationToken cancellationToken)
    {
        if (!userId.HasValue || userId.Value <= 0) return BadRequest(new { message = "A positive userId is required." });
        int? numericId = int.TryParse(id, out var parsedId) ? parsedId : null;
        var song = await context.Users.Where(user => user.Id == userId.Value)
            .SelectMany(user => user.Songs)
            .AsNoTracking()
            .Include(item => item.Artist)
            .Include(item => item.Album)
            .Include(item => item.Playlists)
            .FirstOrDefaultAsync(item => item.Slug == id || (numericId.HasValue && item.Id == numericId.Value), cancellationToken);
        return song is null ? NotFound() : Ok(CatalogPaging.MapSong(song));
    }
}
