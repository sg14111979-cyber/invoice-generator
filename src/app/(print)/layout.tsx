/** Chrome-free layout: the print view must contain the invoice only. */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white p-4 print:p-0">{children}</div>;
}
