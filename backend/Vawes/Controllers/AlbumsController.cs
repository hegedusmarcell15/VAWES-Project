using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vawes.DTOs;
using Vawes.Models;

namespace Vawes.Controllers;

[ApiController]
[Route("api/albums")]
public sealed class AlbumsController(VaweContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PageResult<AlbumResponse>>> List(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken cancellationToken = default)
    {
        (page, pageSize) = CatalogPaging.Normalize(page, pageSize);
        var albums = context.Albums.AsNoTracking()
            .Include(album => album.Artist)
            .Include(album => album.Songs)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            albums = albums.Where(album => album.Title.Contains(search) || album.Artist.Name.Contains(search));

        var total = await albums.CountAsync(cancellationToken);
        var items = await albums.OrderBy(album => album.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
        return Ok(new PageResult<AlbumResponse>(items.Select(MapAlbum).ToArray(), page, pageSize, total));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AlbumResponse>> GetById(string id, CancellationToken cancellationToken)
    {
        int? numericId = int.TryParse(id, out var parsedId) ? parsedId : null;
        var album = await context.Albums.AsNoTracking()
            .Include(item => item.Artist)
            .Include(item => item.Songs)
            .FirstOrDefaultAsync(item => item.Slug == id || (numericId.HasValue && item.Id == numericId.Value), cancellationToken);
        if (album is null) return NotFound();
        return Ok(MapAlbum(album));
    }

    private static AlbumResponse MapAlbum(Album album) => new(
        album.Slug ?? album.Id.ToString(),
        album.Title,
        album.Artist.Name,
        album.Artist.Slug ?? album.Artist.Id.ToString(),
        album.CoverUrl,
        album.Songs.Sum(song => song.DurationSec),
        album.Songs.Count);
}
