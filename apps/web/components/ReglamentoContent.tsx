type ReglamentoContentProps = {
  compact?: boolean;
};

export default function ReglamentoContent({ compact = false }: ReglamentoContentProps) {
  return (
    <div className="rules-layout">
      {!compact && (
        <div className="rules-note">
          <b>Reglamento oficial de participacion.</b> Inscribirte y jugar implica aceptar todas estas condiciones.
        </div>
      )}

      <section className="rules-section">
        <h3 style={{ marginTop: 0 }}>1. Participacion</h3>
        <p className="small" style={{ marginTop: 0 }}>
          La participacion en la Quiniela es totalmente gratuita. Para participar debes cumplir todos los siguientes requisitos:
        </p>
        <ul className="rules-list small">
          <li>Presentar un recibo de consumo minimo de C7.000 realizado en cualquiera de los Barra Brava participantes.</li>
          <li>Seguir nuestra cuenta oficial en Instagram: @barrabravasportbar.</li>
          <li>Completar correctamente el formulario o mecanismo oficial de participacion.</li>
        </ul>
        <p className="small" style={{ marginBottom: 0 }}>
          El incumplimiento de cualquiera de estos requisitos dara como resultado la eliminacion automatica de la quiniela,
          aun cuando el participante se encuentre entre las posiciones ganadoras.
        </p>
      </section>

      <section className="rules-section">
        <h3 style={{ marginTop: 0 }}>2. Premios</h3>
        <ul className="rules-list small" style={{ marginBottom: 8 }}>
          <li>1er Lugar: $500 en efectivo.</li>
          <li>2do Lugar: Certificado de consumo $100.</li>
          <li>3er Lugar: Certificado de consumo $75.</li>
          <li>4to Lugar: Certificado de consumo $50.</li>
          <li>5to Lugar: Certificado de consumo $25.</li>
        </ul>
        <p className="small" style={{ marginBottom: 0 }}>
          Los certificados de consumo seran validos unicamente en Barra Brava Los Yoses y Barra Brava Jaco.
        </p>
      </section>

      <section className="rules-section">
        <h3 style={{ marginTop: 0 }}>3. Sistema de puntuacion</h3>
        <p className="small" style={{ marginTop: 0 }}>Los puntos se asignaran de la siguiente manera:</p>
        <ul className="rules-list small">
          <li>Marcador exacto acertado: 3 puntos.</li>
          <li>Ganador del partido acertado: 1 punto.</li>
        </ul>

        <div className="rules-example-grid">
          <div className="rules-example">
            <div className="small"><b>Ejemplo 1</b></div>
            <div className="small">Prediccion: Argentina 2 - 1 Brasil</div>
            <div className="small">Resultado final: Argentina 2 - 1 Brasil</div>
            <div className="small"><b>= 3 puntos</b></div>
          </div>

          <div className="rules-example">
            <div className="small"><b>Ejemplo 2</b></div>
            <div className="small">Prediccion: Argentina 3 - 1 Brasil</div>
            <div className="small">Resultado final: Argentina 2 - 1 Brasil</div>
            <div className="small"><b>= 1 punto (acerto el ganador)</b></div>
          </div>

          <div className="rules-example">
            <div className="small"><b>Ejemplo 3</b></div>
            <div className="small">Prediccion: Argentina 1 - 1 Brasil</div>
            <div className="small">Resultado final: Argentina 2 - 1 Brasil</div>
            <div className="small"><b>= 0 puntos</b></div>
          </div>
        </div>

        <p className="small" style={{ marginBottom: 0 }}>
          Una vez iniciado el torneo, los pronosticos enviados no podran modificarse.
        </p>
      </section>

      <section className="rules-section">
        <h3 style={{ marginTop: 0 }}>4. Reglas de desempate</h3>
        <p className="small" style={{ marginTop: 0 }}>
          En caso de empate en cualquier posicion ganadora, se aplicaran los siguientes criterios en orden:
        </p>
        <ol className="rules-list small" style={{ paddingLeft: 20 }}>
          <li>Participante que haya acertado el Campeon y Subcampeon del Mundial.</li>
          <li>Prediccion mas cercana a la cantidad total de goles anotados durante todo el Mundial.</li>
          <li>Si el empate continua, el premio correspondiente sera dividido entre los participantes empatados.</li>
        </ol>
      </section>

      <section className="rules-section">
        <h3 style={{ marginTop: 0 }}>5. Participacion y validez</h3>
        <ul className="rules-list small">
          <li>Solo se permitira una participacion por persona.</li>
          <li>Los participantes deberan ingresar informacion real y verificable.</li>
          <li>Participaciones duplicadas, informacion falsa o intentos de manipulacion podran resultar en descalificacion inmediata.</li>
          <li>Barra Brava podra solicitar verificacion de identidad y comprobante de compra cuando sea necesario.</li>
        </ul>
      </section>

      <section className="rules-section">
        <h3 style={{ marginTop: 0 }}>6. Certificados de consumo</h3>
        <ul className="rules-list small">
          <li>Los certificados no son canjeables por efectivo.</li>
          <li>No aplican para devolucion de dinero.</li>
          <li>Los certificados podran utilizarse una unica vez.</li>
          <li>Pueden estar sujetos a fechas de vencimiento o restricciones definidas por Barra Brava.</li>
        </ul>
      </section>

      <section className="rules-section">
        <h3 style={{ marginTop: 0 }}>7. Condiciones generales</h3>
        <ul className="rules-list small" style={{ marginBottom: 8 }}>
          <li>La participacion en la quiniela implica la aceptacion total de este reglamento.</li>
          <li>Barra Brava se reserva el derecho de descalificar participantes que incumplan las reglas o afecten el desarrollo normal de la dinamica.</li>
          <li>Cualquier situacion no contemplada en este reglamento sera resuelta por la organizacion.</li>
        </ul>
        <p className="small" style={{ marginBottom: 0 }}>
          Participa, demuestra quien sabe realmente de futbol y compite por $500 en efectivo.
        </p>
      </section>
    </div>
  );
}
