import Nav from '../../components/Nav';
import ReglamentoContent from '../../components/ReglamentoContent';

export default function ReglamentoPage() {
  return (
    <>
      <Nav />
      <div className="card reglamento-shell">
        <h1 style={{ marginTop: 0 }}>Reglamento - La Quiniela Mas Brava del Mundial</h1>
        <p className="small" style={{ marginTop: 0 }}>
          Lee estas reglas antes de registrarte. La participacion implica aceptacion total del reglamento.
        </p>
        <ReglamentoContent />
      </div>
    </>
  );
}
