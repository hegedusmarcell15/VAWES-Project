using System;
using System.Collections.Generic;

namespace Vawes.Models;

public partial class Album
{
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string? Slug { get; set; }

    public int ArtistId { get; set; }

    public string? CoverUrl { get; set; }

    public short? ReleaseYear { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Artist Artist { get; set; } = null!;

    public virtual ICollection<Song> Songs { get; set; } = new List<Song>();
}
