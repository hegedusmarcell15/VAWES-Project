# VAWES - React (Sprint 4)

    npm install
    npm run dev

Oldalak: `/` (lejátszó + lista), `/lista/:id`, `/kereses`, `/konyvtar`.
Az adatbázis backend a `backend/Vawes` mappában található. Az API jelenleg a `/users` és `/songs` útvonalakat biztosítja.
A liquid glass "receptje" a `src/glass.css` tetején lévő változókban hangolható.

## Backend indítása

1. Telepítsd a .NET 10 SDK-t és a MariaDB/MySQL-t.
2. Importáld a `backend/vawes.sql` fájlt a `vawe` adatbázisba.
3. Ellenőrizd a kapcsolatot a `backend/Vawes/appsettings.json` fájlban.
4. Indítsd el:

       dotnet run --project backend/Vawes/Vawes.csproj

Fejlesztés közben a backend CORS-ja engedélyezi a Vite alapértelmezett `localhost:5173` és `127.0.0.1:5173` címeit.
