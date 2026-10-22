import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="content-page">
      <section className="card page-stub">
        <h1>Página no encontrada</h1>
        <p>La ruta que buscás no existe.</p>
        <Link className="btn btn-primary" to="/pf">
          Volver al inicio
        </Link>
      </section>
    </div>
  );
}
