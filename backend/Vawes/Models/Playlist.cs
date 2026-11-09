using System;
using System.Collections.Generic;

namespace Vawes.Models;

public partial class Playlist
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string Name { get; set; } = null!;

    public string? Slug { get; set; }

    public string Color { get; set; } = "violet";

    public string Type { get; set; } = "vawes";

    public int Recent { get; set; }

    public int Tracks { get; set; }

    public int Minutes { get; set; }

    public string? CoverUrl { get; set; }

    public virtual User User { get; set; } = null!;

    public virtual ICollection<Song> Songs { get; set; } = new List<Song>();
}
