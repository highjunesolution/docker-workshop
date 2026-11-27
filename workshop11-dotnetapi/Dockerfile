FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY ["workshop11-dotnetapi.csproj", "./"]

RUN dotnet restore

COPY . .

RUN dotnet publish "workshop11-dotnetapi.csproj" -c Release -o /app/publish --no-restore


FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final

WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 8080

ENTRYPOINT [ "dotnet", "workshop11-dotnetapi.dll" ]