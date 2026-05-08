import Nav from '../../components/Nav';

type Group = {
  id: string;
  teams: [string, string, string, string];
};

type Fixture = {
  date: string;
  home: string;
  away: string;
  stadium: string;
  city: string;
};

const flagCodes: Record<string, string> = {
  Mexico: 'mx',
  'South Africa': 'za',
  'South Korea': 'kr',
  'Czech Republic': 'cz',
  Canada: 'ca',
  'Bosnia and Herzegovina': 'ba',
  Qatar: 'qa',
  Switzerland: 'ch',
  Brazil: 'br',
  Morocco: 'ma',
  Haiti: 'ht',
  Scotland: 'gb',
  'United States': 'us',
  Paraguay: 'py',
  Australia: 'au',
  Turkey: 'tr',
  Germany: 'de',
  Curacao: 'cw',
  'Ivory Coast': 'ci',
  Ecuador: 'ec',
  Netherlands: 'nl',
  Japan: 'jp',
  Sweden: 'se',
  Tunisia: 'tn',
  Belgium: 'be',
  Egypt: 'eg',
  Iran: 'ir',
  'New Zealand': 'nz',
  Spain: 'es',
  'Cape Verde': 'cv',
  'Saudi Arabia': 'sa',
  Uruguay: 'uy',
  France: 'fr',
  Senegal: 'sn',
  Iraq: 'iq',
  Norway: 'no',
  Argentina: 'ar',
  Algeria: 'dz',
  Austria: 'at',
  Jordan: 'jo',
  Portugal: 'pt',
  'DR Congo': 'cd',
  Uzbekistan: 'uz',
  Colombia: 'co',
  England: 'gb',
  Croatia: 'hr',
  Ghana: 'gh',
  Panama: 'pa',
};

function TeamName({ team }: { team: string }) {
  const code = flagCodes[team];
  const src = code ? `https://flagcdn.com/w40/${code}.png` : '';

  return (
    <span className="wc-team-chip">
      <span className="wc-flag" aria-hidden="true">
        {src ? <img className="wc-flag-img" src={src} alt="" loading="lazy" /> : <span>?</span>}
      </span>
      <span>{team}</span>
    </span>
  );
}

const groups: Group[] = [
  { id: 'A', teams: ['Mexico', 'South Africa', 'South Korea', 'Czech Republic'] },
  { id: 'B', teams: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'] },
  { id: 'C', teams: ['Brazil', 'Morocco', 'Haiti', 'Scotland'] },
  { id: 'D', teams: ['United States', 'Paraguay', 'Australia', 'Turkey'] },
  { id: 'E', teams: ['Germany', 'Curacao', "Ivory Coast", 'Ecuador'] },
  { id: 'F', teams: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'] },
  { id: 'G', teams: ['Belgium', 'Egypt', 'Iran', 'New Zealand'] },
  { id: 'H', teams: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'] },
  { id: 'I', teams: ['France', 'Senegal', 'Iraq', 'Norway'] },
  { id: 'J', teams: ['Argentina', 'Algeria', 'Austria', 'Jordan'] },
  { id: 'K', teams: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'] },
  { id: 'L', teams: ['England', 'Croatia', 'Ghana', 'Panama'] },
];

const fixturesByGroup: Record<string, Fixture[]> = {
  A: [
    { date: '11 Jun 2026', home: 'Mexico', away: 'South Africa', stadium: 'Estadio Azteca', city: 'Mexico City' },
    { date: '11 Jun 2026', home: 'South Korea', away: 'Czech Republic', stadium: 'Estadio Akron', city: 'Zapopan' },
    { date: '18 Jun 2026', home: 'Czech Republic', away: 'South Africa', stadium: 'Mercedes-Benz Stadium', city: 'Atlanta' },
    { date: '18 Jun 2026', home: 'Mexico', away: 'South Korea', stadium: 'Estadio Akron', city: 'Zapopan' },
    { date: '24 Jun 2026', home: 'Czech Republic', away: 'Mexico', stadium: 'Estadio Azteca', city: 'Mexico City' },
    { date: '24 Jun 2026', home: 'South Africa', away: 'South Korea', stadium: 'Estadio BBVA', city: 'Guadalupe' },
  ],
  B: [
    { date: '12 Jun 2026', home: 'Canada', away: 'Bosnia and Herzegovina', stadium: 'BMO Field', city: 'Toronto' },
    { date: '13 Jun 2026', home: 'Qatar', away: 'Switzerland', stadium: "Levi's Stadium", city: 'Santa Clara' },
    { date: '18 Jun 2026', home: 'Switzerland', away: 'Bosnia and Herzegovina', stadium: 'SoFi Stadium', city: 'Inglewood' },
    { date: '18 Jun 2026', home: 'Canada', away: 'Qatar', stadium: 'BC Place', city: 'Vancouver' },
    { date: '24 Jun 2026', home: 'Switzerland', away: 'Canada', stadium: 'BC Place', city: 'Vancouver' },
    { date: '24 Jun 2026', home: 'Bosnia and Herzegovina', away: 'Qatar', stadium: 'Lumen Field', city: 'Seattle' },
  ],
  C: [
    { date: '13 Jun 2026', home: 'Brazil', away: 'Morocco', stadium: 'MetLife Stadium', city: 'East Rutherford' },
    { date: '13 Jun 2026', home: 'Haiti', away: 'Scotland', stadium: 'Gillette Stadium', city: 'Foxborough' },
    { date: '19 Jun 2026', home: 'Scotland', away: 'Morocco', stadium: 'Gillette Stadium', city: 'Foxborough' },
    { date: '19 Jun 2026', home: 'Brazil', away: 'Haiti', stadium: 'Lincoln Financial Field', city: 'Philadelphia' },
    { date: '24 Jun 2026', home: 'Scotland', away: 'Brazil', stadium: 'Hard Rock Stadium', city: 'Miami Gardens' },
    { date: '24 Jun 2026', home: 'Morocco', away: 'Haiti', stadium: 'Mercedes-Benz Stadium', city: 'Atlanta' },
  ],
  D: [
    { date: '12 Jun 2026', home: 'United States', away: 'Paraguay', stadium: 'SoFi Stadium', city: 'Inglewood' },
    { date: '13 Jun 2026', home: 'Australia', away: 'Turkey', stadium: 'BC Place', city: 'Vancouver' },
    { date: '19 Jun 2026', home: 'United States', away: 'Australia', stadium: 'Lumen Field', city: 'Seattle' },
    { date: '19 Jun 2026', home: 'Turkey', away: 'Paraguay', stadium: "Levi's Stadium", city: 'Santa Clara' },
    { date: '25 Jun 2026', home: 'Turkey', away: 'United States', stadium: 'SoFi Stadium', city: 'Inglewood' },
    { date: '25 Jun 2026', home: 'Paraguay', away: 'Australia', stadium: "Levi's Stadium", city: 'Santa Clara' },
  ],
  E: [
    { date: '14 Jun 2026', home: 'Germany', away: 'Curacao', stadium: 'NRG Stadium', city: 'Houston' },
    { date: '14 Jun 2026', home: 'Ivory Coast', away: 'Ecuador', stadium: 'Lincoln Financial Field', city: 'Philadelphia' },
    { date: '20 Jun 2026', home: 'Germany', away: 'Ivory Coast', stadium: 'BMO Field', city: 'Toronto' },
    { date: '20 Jun 2026', home: 'Ecuador', away: 'Curacao', stadium: 'Arrowhead Stadium', city: 'Kansas City' },
    { date: '25 Jun 2026', home: 'Curacao', away: 'Ivory Coast', stadium: 'Lincoln Financial Field', city: 'Philadelphia' },
    { date: '25 Jun 2026', home: 'Ecuador', away: 'Germany', stadium: 'MetLife Stadium', city: 'East Rutherford' },
  ],
  F: [
    { date: '14 Jun 2026', home: 'Netherlands', away: 'Japan', stadium: 'AT&T Stadium', city: 'Arlington' },
    { date: '14 Jun 2026', home: 'Sweden', away: 'Tunisia', stadium: 'Estadio BBVA', city: 'Guadalupe' },
    { date: '20 Jun 2026', home: 'Netherlands', away: 'Sweden', stadium: 'NRG Stadium', city: 'Houston' },
    { date: '20 Jun 2026', home: 'Tunisia', away: 'Japan', stadium: 'Estadio BBVA', city: 'Guadalupe' },
    { date: '25 Jun 2026', home: 'Japan', away: 'Sweden', stadium: 'AT&T Stadium', city: 'Arlington' },
    { date: '25 Jun 2026', home: 'Tunisia', away: 'Netherlands', stadium: 'Arrowhead Stadium', city: 'Kansas City' },
  ],
  G: [
    { date: '15 Jun 2026', home: 'Belgium', away: 'Egypt', stadium: 'Lumen Field', city: 'Seattle' },
    { date: '15 Jun 2026', home: 'Iran', away: 'New Zealand', stadium: 'SoFi Stadium', city: 'Inglewood' },
    { date: '21 Jun 2026', home: 'Belgium', away: 'Iran', stadium: 'SoFi Stadium', city: 'Inglewood' },
    { date: '21 Jun 2026', home: 'New Zealand', away: 'Egypt', stadium: 'BC Place', city: 'Vancouver' },
    { date: '26 Jun 2026', home: 'Egypt', away: 'Iran', stadium: 'Lumen Field', city: 'Seattle' },
    { date: '26 Jun 2026', home: 'New Zealand', away: 'Belgium', stadium: 'BC Place', city: 'Vancouver' },
  ],
  H: [
    { date: '15 Jun 2026', home: 'Spain', away: 'Cape Verde', stadium: 'Mercedes-Benz Stadium', city: 'Atlanta' },
    { date: '15 Jun 2026', home: 'Saudi Arabia', away: 'Uruguay', stadium: 'Hard Rock Stadium', city: 'Miami Gardens' },
    { date: '21 Jun 2026', home: 'Spain', away: 'Saudi Arabia', stadium: 'Mercedes-Benz Stadium', city: 'Atlanta' },
    { date: '21 Jun 2026', home: 'Uruguay', away: 'Cape Verde', stadium: 'Hard Rock Stadium', city: 'Miami Gardens' },
    { date: '26 Jun 2026', home: 'Cape Verde', away: 'Saudi Arabia', stadium: 'NRG Stadium', city: 'Houston' },
    { date: '26 Jun 2026', home: 'Uruguay', away: 'Spain', stadium: 'Estadio Akron', city: 'Zapopan' },
  ],
  I: [
    { date: '16 Jun 2026', home: 'France', away: 'Senegal', stadium: 'MetLife Stadium', city: 'East Rutherford' },
    { date: '16 Jun 2026', home: 'Iraq', away: 'Norway', stadium: 'Gillette Stadium', city: 'Foxborough' },
    { date: '22 Jun 2026', home: 'France', away: 'Iraq', stadium: 'Lincoln Financial Field', city: 'Philadelphia' },
    { date: '22 Jun 2026', home: 'Norway', away: 'Senegal', stadium: 'MetLife Stadium', city: 'East Rutherford' },
    { date: '26 Jun 2026', home: 'Norway', away: 'France', stadium: 'Gillette Stadium', city: 'Foxborough' },
    { date: '26 Jun 2026', home: 'Senegal', away: 'Iraq', stadium: 'BMO Field', city: 'Toronto' },
  ],
  J: [
    { date: '16 Jun 2026', home: 'Argentina', away: 'Algeria', stadium: 'Arrowhead Stadium', city: 'Kansas City' },
    { date: '16 Jun 2026', home: 'Austria', away: 'Jordan', stadium: "Levi's Stadium", city: 'Santa Clara' },
    { date: '22 Jun 2026', home: 'Argentina', away: 'Austria', stadium: 'AT&T Stadium', city: 'Arlington' },
    { date: '22 Jun 2026', home: 'Jordan', away: 'Algeria', stadium: "Levi's Stadium", city: 'Santa Clara' },
    { date: '27 Jun 2026', home: 'Algeria', away: 'Austria', stadium: 'Arrowhead Stadium', city: 'Kansas City' },
    { date: '27 Jun 2026', home: 'Jordan', away: 'Argentina', stadium: 'AT&T Stadium', city: 'Arlington' },
  ],
  K: [
    { date: '17 Jun 2026', home: 'Portugal', away: 'DR Congo', stadium: 'NRG Stadium', city: 'Houston' },
    { date: '17 Jun 2026', home: 'Uzbekistan', away: 'Colombia', stadium: 'Estadio Azteca', city: 'Mexico City' },
    { date: '23 Jun 2026', home: 'Portugal', away: 'Uzbekistan', stadium: 'NRG Stadium', city: 'Houston' },
    { date: '23 Jun 2026', home: 'Colombia', away: 'DR Congo', stadium: 'Estadio Akron', city: 'Zapopan' },
    { date: '27 Jun 2026', home: 'Colombia', away: 'Portugal', stadium: 'Hard Rock Stadium', city: 'Miami Gardens' },
    { date: '27 Jun 2026', home: 'DR Congo', away: 'Uzbekistan', stadium: 'Mercedes-Benz Stadium', city: 'Atlanta' },
  ],
  L: [
    { date: '17 Jun 2026', home: 'England', away: 'Croatia', stadium: 'AT&T Stadium', city: 'Arlington' },
    { date: '17 Jun 2026', home: 'Ghana', away: 'Panama', stadium: 'BMO Field', city: 'Toronto' },
    { date: '23 Jun 2026', home: 'England', away: 'Ghana', stadium: 'Gillette Stadium', city: 'Foxborough' },
    { date: '23 Jun 2026', home: 'Panama', away: 'Croatia', stadium: 'BMO Field', city: 'Toronto' },
    { date: '27 Jun 2026', home: 'Panama', away: 'England', stadium: 'MetLife Stadium', city: 'East Rutherford' },
    { date: '27 Jun 2026', home: 'Croatia', away: 'Ghana', stadium: 'Lincoln Financial Field', city: 'Philadelphia' },
  ],
};

export default function Mundial2026Page() {
  return (
    <>
      <Nav />

      <section className="card wc-hero">
        <p className="wc-kicker">Publico y compartible</p>
        <h1 style={{ marginTop: 8, marginBottom: 10 }}>Calendario Mundial FIFA 2026</h1>
        <p className="small" style={{ maxWidth: 880 }}>
          Seccion abierta para cualquiera con link. Incluye grupos oficiales A-L, selecciones participantes
          y calendario de fase de grupos para vivir el torneo como se debe.
        </p>
        <div className="wc-pill-row">
          <span className="wc-pill">Inicio: 11 Jun 2026</span>
          <span className="wc-pill">Ronda de 32: 28 Jun - 3 Jul</span>
          <span className="wc-pill">Final: 19 Jul 2026</span>
          <span className="wc-pill">Sede final: MetLife Stadium</span>
        </div>
      </section>

      <section className="card">
        <div className="row-actions" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Grupos oficiales</h2>
          <span className="small">12 grupos de 4 equipos</span>
        </div>

        <div className="wc-groups-grid">
          {groups.map((group) => (
            <article key={group.id} className="wc-group-card">
              <div className="wc-group-head">
                <span className="wc-group-badge">Grupo {group.id}</span>
              </div>
              <ul className="wc-team-list">
                {group.teams.map((team) => (
                  <li key={`${group.id}-${team}`}>
                    <TeamName team={team} />
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="row-actions" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Calendario fase de grupos</h2>
          <span className="small">72 partidos</span>
        </div>

        <div className="wc-fixtures-wrap">
          {groups.map((group) => (
            <article key={`fx-${group.id}`} className="wc-fixture-group">
              <h3 style={{ marginTop: 0 }}>Grupo {group.id}</h3>
              <div className="wc-fixtures-list">
                {fixturesByGroup[group.id].map((match, index) => (
                  <div key={`${group.id}-${index}`} className="wc-fixture-item">
                    <div className="wc-fixture-date">{match.date}</div>
                    <div className="wc-fixture-match">
                      <strong><TeamName team={match.home} /></strong>
                      <span className="small">vs</span>
                      <strong><TeamName team={match.away} /></strong>
                    </div>
                    <div className="small">{match.stadium} - {match.city}</div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card" style={{ borderStyle: 'dashed' }}>
        <p className="small" style={{ margin: 0 }}>
          Fuente de datos: FIFA (equipos/grupos/fixtures) y consolidacion de calendario oficial del torneo.
          Esta seccion es publica para compartir por link directo.
        </p>
      </section>
    </>
  );
}
