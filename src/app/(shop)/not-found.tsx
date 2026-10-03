import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-4xl">This piece has flown away 🦋</h1>
      <p className="mt-3 text-muted">It may have sold out or moved. Browse the collection or DM us to ask!</p>
      <Link href="/shop" className="btn-primary mt-8">
        Shop the Collection
      </Link>
    </div>
  );
}
