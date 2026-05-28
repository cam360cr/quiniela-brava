import Nav from '../../components/Nav';

const prizes = [
  {
    place: '1er Lugar',
    reward: '$500 en efectivo',
    detail: 'Premio para el primer lugar del ranking final de la quiniela.',
  },
  {
    place: '2do Lugar',
    reward: 'Certificado de consumo $100',
    detail: 'Válido en Barra Brava Los Yoses y Barra Brava Jacó.',
  },
  {
    place: '3er Lugar',
    reward: 'Certificado de consumo $75',
    detail: 'Válido en Barra Brava Los Yoses y Barra Brava Jacó.',
  },
  {
    place: '4to Lugar',
    reward: 'Certificado de consumo $50',
    detail: 'Válido en Barra Brava Los Yoses y Barra Brava Jacó.',
  },
  {
    place: '5to Lugar',
    reward: 'Certificado de consumo $25',
    detail: 'Válido en Barra Brava Los Yoses y Barra Brava Jacó.',
  },
];

export default function PremiosPage() {
  return (
    <>
      <Nav />

      <section className="card landing-hero">
        <p className="wc-kicker">Premiación oficial</p>
        <h1 style={{ marginTop: 8, marginBottom: 10 }}>Premios del ranking de quiniela</h1>
        <p className="small" style={{ maxWidth: 880 }}>
          Al finalizar el Mundial 2026, los primeros cinco lugares del ranking global recibirán estos premios.
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
          Nota: los certificados de consumo no son canjeables por efectivo.
        </p>
      </section>
    </>
  );
}
