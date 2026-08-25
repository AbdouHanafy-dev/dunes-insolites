export default function Stars({ n }: { n: number }) {
  return (
    <div className="stars" aria-label={`${n} out of 5 stars`}>
      {"★".repeat(n)}
      <span style={{ opacity: 0.28 }}>{"★".repeat(5 - n)}</span>
    </div>
  );
}
