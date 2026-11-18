export function CategoryTag({ category }: { category: { name: string; color: string; bgColor: string } }) {
  return (
    <span className="badge" style={{ color: category.color, backgroundColor: category.bgColor }}>
      {category.name}
    </span>
  );
}
