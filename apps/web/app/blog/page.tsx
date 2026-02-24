const articles = [
  "Sistema de ventas para Perú: guía inicial",
  "Control de inventario sin quiebres de stock",
  "Cómo organizar compras para crecer"
];

export default function BlogPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold">Blog educativo</h1>
      <ul className="mt-6 space-y-3">
        {articles.map((article) => (
          <li key={article} className="rounded-lg border border-slate-200 bg-white p-4">
            {article}
          </li>
        ))}
      </ul>
    </main>
  );
}
