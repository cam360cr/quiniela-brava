export type TeamCatalogItem = {
  name: string;
  spanishName: string;
  flagCode: string;
};

export const TEAM_CATALOG: TeamCatalogItem[] = [
  { name: 'Mexico', spanishName: 'Mexico', flagCode: 'mx' },
  { name: 'South Africa', spanishName: 'Sudafrica', flagCode: 'za' },
  { name: 'South Korea', spanishName: 'Corea del Sur', flagCode: 'kr' },
  { name: 'Czech Republic', spanishName: 'Republica Checa', flagCode: 'cz' },
  { name: 'Canada', spanishName: 'Canada', flagCode: 'ca' },
  { name: 'Bosnia and Herzegovina', spanishName: 'Bosnia y Herzegovina', flagCode: 'ba' },
  { name: 'Qatar', spanishName: 'Catar', flagCode: 'qa' },
  { name: 'Switzerland', spanishName: 'Suiza', flagCode: 'ch' },
  { name: 'Brazil', spanishName: 'Brasil', flagCode: 'br' },
  { name: 'Morocco', spanishName: 'Marruecos', flagCode: 'ma' },
  { name: 'Haiti', spanishName: 'Haiti', flagCode: 'ht' },
  { name: 'Scotland', spanishName: 'Escocia', flagCode: 'gb' },
  { name: 'United States', spanishName: 'Estados Unidos', flagCode: 'us' },
  { name: 'Paraguay', spanishName: 'Paraguay', flagCode: 'py' },
  { name: 'Australia', spanishName: 'Australia', flagCode: 'au' },
  { name: 'Turkey', spanishName: 'Turquia', flagCode: 'tr' },
  { name: 'Germany', spanishName: 'Alemania', flagCode: 'de' },
  { name: 'Curacao', spanishName: 'Curazao', flagCode: 'cw' },
  { name: 'Ivory Coast', spanishName: 'Costa de Marfil', flagCode: 'ci' },
  { name: 'Ecuador', spanishName: 'Ecuador', flagCode: 'ec' },
  { name: 'Netherlands', spanishName: 'Paises Bajos', flagCode: 'nl' },
  { name: 'Japan', spanishName: 'Japon', flagCode: 'jp' },
  { name: 'Sweden', spanishName: 'Suecia', flagCode: 'se' },
  { name: 'Tunisia', spanishName: 'Tunez', flagCode: 'tn' },
  { name: 'Belgium', spanishName: 'Belgica', flagCode: 'be' },
  { name: 'Egypt', spanishName: 'Egipto', flagCode: 'eg' },
  { name: 'Iran', spanishName: 'Iran', flagCode: 'ir' },
  { name: 'New Zealand', spanishName: 'Nueva Zelanda', flagCode: 'nz' },
  { name: 'Spain', spanishName: 'Espana', flagCode: 'es' },
  { name: 'Cape Verde', spanishName: 'Cabo Verde', flagCode: 'cv' },
  { name: 'Saudi Arabia', spanishName: 'Arabia Saudita', flagCode: 'sa' },
  { name: 'Uruguay', spanishName: 'Uruguay', flagCode: 'uy' },
  { name: 'France', spanishName: 'Francia', flagCode: 'fr' },
  { name: 'Senegal', spanishName: 'Senegal', flagCode: 'sn' },
  { name: 'Iraq', spanishName: 'Irak', flagCode: 'iq' },
  { name: 'Norway', spanishName: 'Noruega', flagCode: 'no' },
  { name: 'Argentina', spanishName: 'Argentina', flagCode: 'ar' },
  { name: 'Algeria', spanishName: 'Argelia', flagCode: 'dz' },
  { name: 'Austria', spanishName: 'Austria', flagCode: 'at' },
  { name: 'Jordan', spanishName: 'Jordania', flagCode: 'jo' },
  { name: 'Portugal', spanishName: 'Portugal', flagCode: 'pt' },
  { name: 'DR Congo', spanishName: 'RD del Congo', flagCode: 'cd' },
  { name: 'Uzbekistan', spanishName: 'Uzbekistan', flagCode: 'uz' },
  { name: 'Colombia', spanishName: 'Colombia', flagCode: 'co' },
  { name: 'England', spanishName: 'Inglaterra', flagCode: 'gb' },
  { name: 'Croatia', spanishName: 'Croacia', flagCode: 'hr' },
  { name: 'Ghana', spanishName: 'Ghana', flagCode: 'gh' },
  { name: 'Panama', spanishName: 'Panama', flagCode: 'pa' },
  { name: 'Costa Rica', spanishName: 'Costa Rica', flagCode: 'cr' },
];

const spanishNameByTeam = Object.fromEntries(TEAM_CATALOG.map((item) => [item.name, item.spanishName])) as Record<string, string>;

export const flagCodeByTeam = Object.fromEntries(TEAM_CATALOG.map((item) => [item.name, item.flagCode])) as Record<string, string>;

export const flagCatalog = TEAM_CATALOG.map((item) => ({
  name: item.name,
  spanishName: item.spanishName,
  url: `https://flagcdn.com/w80/${item.flagCode}.png`,
}));

export function toSpanishTeamName(name: string) {
  return spanishNameByTeam[name] || name;
}

export function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function isCatalogFlagUrl(value: string | null | undefined) {
  if (!value) return false;
  return /^https:\/\/flagcdn\.com\/w\d+\//i.test(value.trim());
}
