using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vawes.DTOs;
using Vawes.Models;
using Vawes.Security;

namespace Vawes.Controllers;

[ApiController]
[Route("api/artists")]
public sealed class ArtistsController(VaweContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PageResult<ArtistResponse>>> List(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken cancellationToken = default)
    {
        (page, pageSize) = CatalogPaging.Normalize(page, pageSize);
        var artists = context.Artists.AsNoTracking()
            .Include(artist => artist.Albums)
            .ThenInclude(album => album.Songs)
            .AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            artists = artists.Where(artist => artist.Name.Contains(search));

        var total = await artists.CountAsync(cancellationToken);
        var items = await artists.OrderBy(artist => artist.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
        return Ok(new PageResult<ArtistResponse>(items.Select(MapArtist).ToArray(), page, pageSize, total));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ArtistResponse>> GetById(string id, CancellationToken cancellationToken)
    {
        int? numericId = int.TryParse(id, out var parsedId) ? parsedId : null;
        var artist = await context.Artists.AsNoTracking()
            .Include(item => item.Albums)
            .ThenInclude(album => album.Songs)
            .FirstOrDefaultAsync(item => item.Slug == id || (numericId.HasValue && item.Id == numericId.Value), cancellationToken);
        if (artist is null) return NotFound();
        return Ok(MapArtist(artist));
    }

    [HttpPut("{id}")]
    [Authorize(Policy = AdminEmailAllowlist.PolicyName)]
    public async Task<ActionResult<ArtistResponse>> Update(
        string id,
        [FromBody] UpdateArtistRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Bio?.Length > 2000)
            return BadRequest(new ProblemDetails { Title = "The artist bio is too long." });
        if (request.CoverUrl?.Length > 500 || !IsValidHttpUrl(request.CoverUrl))
            return BadRequest(new ProblemDetails { Title = "Enter a valid HTTP(S) cover image URL." });

        int? numericId = int.TryParse(id, out var parsedId) ? parsedId : null;
        var artist = await context.Artists
            .Include(item => item.Albums)
            .ThenInclude(album => album.Songs)
            .FirstOrDefaultAsync(
                item => item.Slug == id || (numericId.HasValue && item.Id == numericId.Value),
                cancellationToken);
        if (artist is null) return NotFound();

        artist.Bio = string.IsNullOrWhiteSpace(request.Bio) ? null : request.Bio.Trim();
        artist.CoverUrl = string.IsNullOrWhiteSpace(request.CoverUrl) ? null : request.CoverUrl.Trim();
        await context.SaveChangesAsync(cancellationToken);

        return Ok(MapArtist(artist));
    }

    private static bool IsValidHttpUrl(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return true;
        return Uri.TryCreate(value.Trim(), UriKind.Absolute, out var uri) &&
               (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }

    private static ArtistResponse MapArtist(Artist artist) => new(
        artist.Slug ?? artist.Id.ToString(),
        artist.Name,
        artist.Bio,
        artist.CoverUrl,
        artist.Albums.OrderBy(album => album.Id)
            .Select(album => new AlbumSummaryResponse(
                album.Slug ?? album.Id.ToString(),
                album.Title,
                album.Songs.Sum(song => song.DurationSec),
                album.CoverUrl))
            .ToArray());

    public sealed class UpdateArtistRequest
    {
        public string? Bio { get; set; }
        public string? CoverUrl { get; set; }
    }
}
