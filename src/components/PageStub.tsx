interface PageStubProps {
  title: string;
}

export function PageStub({ title }: PageStubProps) {
  return (
    <div className="content-page">
      <section className="card page-stub">
        <h1>{title}</h1>
        <p>Pantalla de ejemplo.</p>
      </section>
    </div>
  );
}