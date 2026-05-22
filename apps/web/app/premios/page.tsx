import Nav from '../../components/Nav';

const prizes = [
  {
    place: '1er lugar',
    reward: 'USD $500',
    detail: 'Premio confirmado para el primer lugar del ranking final de la quiniela.',
  },
  {
    place: '2do lugar',
    reward: 'Proximamente',
    detail: 'Se publicara antes de iniciar la fase final del Mundial 2026.',
  },
  {
    place: '3er lugar',
    reward: 'Proximamente',
    detail: 'Se anunciara junto a las reglas oficiales del cierre de torneo.',
  },
];

export default function PremiosPage() {
  return (
    <>
      <Nav />

      <section className="card landing-hero">
        <p className="wc-kicker">Premiacion oficial</p>
        <h1 style={{ marginTop: 8, marginBottom: 10 }}>Premios del ranking de quiniela</h1>
        <p className="small" style={{ maxWidth: 880 }}>
          Al finalizar el Mundial 2026, los primeros lugares del ranking global recibiran premios.
          Esta pagina se ira actualizando con nuevos anuncios.
        </p>
      </section>

      <section className="grid cols3" style={{ marginTop: 14 }}>
        {prizes.map((prize) => (
          <article key={prize.place} className="module-card">
            <p className="small" style={{ marginTop: 0 }}>{prize.place}</p>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>{prize.reward}</h2>
            <p className="small" style={{ marginBottom: 0 }}>{prize.detail}</p>
          </article>
        ))}
      </section>

      <section className="card" style={{ borderStyle: 'dashed' }}>
        <p className="small" style={{ margin: 0 }}>
          Nota: de momento, el premio confirmado es el primer lugar con USD $500.
        </p>
      </section>
    </>
  );
}
