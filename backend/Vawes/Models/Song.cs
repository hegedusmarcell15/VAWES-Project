using System;
using System.Collections.Generic;

namespace Vawes.Models;

public partial class Song
{
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public int ArtistId { get; set; }

    public int? AlbumId { get; set; }

    public int DurationSec { get; set; }

    public string? Genre { get; set; }

    public string FilePath { get; set; } = null!;

    public DateTime UploadedAt { get; set; }

    public virtual Album? Album { get; set; }

    public virtual Artist Artist { get; set; } = null!;

    public virtual ICollection<Playlist> Playlists { get; set; } = new List<Playlist>();

    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
