using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vawes.DTOs;
using Vawes.Models;

namespace Vawes.Controllers;

[ApiController]
[Authorize]
[Route("api/favorites")]
public sealed class FavoritesController(VaweContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PageResult<SongResponse>>> List(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        (page, pageSize) = CatalogPaging.Normalize(page, pageSize);
        var songs = context.Users.Where(user => user.Id == userId)
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

    [HttpPut("{id}")]
    public async Task<IActionResult> Add(string id, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var user = await context.Users.Include(item => item.Songs)
            .SingleOrDefaultAsync(item => item.Id == userId, cancellationToken);
        if (user is null) return Unauthorized();
        var numericId = int.TryParse(id, out var parsedId) ? parsedId : (int?)null;
        var song = await context.Songs.FirstOrDefaultAsync(
            item => item.Slug == id || (numericId.HasValue && item.Id == numericId.Value),
            cancellationToken);
        if (song is null) return NotFound();
        if (user.Songs.All(item => item.Id != song.Id))
        {
            user.Songs.Add(song);
            await context.SaveChangesAsync(cancellationToken);
        }
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Remove(string id, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var user = await context.Users.Include(item => item.Songs)
            .SingleOrDefaultAsync(item => item.Id == userId, cancellationToken);
        if (user is null) return Unauthorized();
        var numericId = int.TryParse(id, out var parsedId) ? parsedId : (int?)null;
        var song = user.Songs.FirstOrDefault(item =>
            item.Slug == id || (numericId.HasValue && item.Id == numericId.Value));
        if (song is not null)
        {
            user.Songs.Remove(song);
            await context.SaveChangesAsync(cancellationToken);
        }
        return NoContent();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SongResponse>> GetById(
        string id,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        int? numericId = int.TryParse(id, out var parsedId) ? parsedId : null;
        var song = await context.Users.Where(user => user.Id == userId)
            .SelectMany(user => user.Songs)
            .AsNoTracking()
            .Include(item => item.Artist)
            .Include(item => item.Album)
            .Include(item => item.Playlists)
            .FirstOrDefaultAsync(item => item.Slug == id || (numericId.HasValue && item.Id == numericId.Value), cancellationToken);
        return song is null ? NotFound() : Ok(CatalogPaging.MapSong(song));
    }

    private bool TryGetUserId(out int userId) =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);
}
