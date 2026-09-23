/**
 * A FAQ list in two independent columns: the first half of the questions on the
 * left, the rest on the right, each column its own stack. Independent stacks
 * (not a shared grid) so opening a long answer in one column never pushes the
 * other one around. Plain <details>, so it works without JavaScript and every
 * answer stays in the HTML for search engines. Collapses to one column on
 * narrow screens.
 */
export default function FaqColumns({ items }: { items: { q: string; a?: string }[] }) {
  const middle = Math.ceil(items.length / 2);
  const columns = [items.slice(0, middle), items.slice(middle)].filter((column) => column.length > 0);

  return (
    <div className="faq-columns">
      {columns.map((column, index) => (
        <div className="faq" key={index}>
          {column.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              {item.a && <p>{item.a}</p>}
            </details>
          ))}
        </div>
      ))}
    </div>
  );
}
